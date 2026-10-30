// PDF export, written directly with no libraries. Times in PDF's built-in fonts, so
// only characters in the WinAnsi set can appear; Plain.pdf.unsupported lists the rest.
globalThis.Plain = globalThis.Plain || {};

(() => {
  const { typeset, plainText } = Plain.markdown;
  const { widths, line: metric } = Plain.metrics;
  const pageWidth = 11906 / 20, pageHeight = 16838 / 20, margin = 1701 / 20;
  const textWidth = pageWidth - 2 * margin, textHeight = pageHeight - 2 * margin;
  const firstIndent = 425 / 20;
  const fontFor = (bold, italic) => (bold ? (italic ? "boldItalic" : "bold") : italic ? "italic" : "regular");
  const fontName = { regular: "Times-Roman", bold: "Times-Bold", italic: "Times-Italic", boldItalic: "Times-BoldItalic" };
  const resource = { regular: "F1", bold: "F2", italic: "F3", boldItalic: "F4" };

  const high = "€\u0000‚ƒ„…†‡ˆ‰Š‹Œ\u0000Ž\u0000\u0000‘’“”•–—˜™š›œ\u0000žŸ";
  const toByte = new Map();
  for (let b = 32; b < 127; b++) toByte.set(String.fromCharCode(b), b);
  for (let i = 0; i < high.length; i++) if (high[i] !== "\u0000") toByte.set(high[i], 0x80 + i);
  for (let b = 0xA0; b <= 0xFF; b++) toByte.set(String.fromCharCode(b), b);

  const byteOf = (ch) => toByte.get(ch) ?? 0x3F;
  // Zero-width characters, such as the selector after an emoji, are left out, not shown as "?".
  const visible = (text) => text.replace(/\p{Cf}|[\uFE00-\uFE0F]/gu, "");
  const measure = (text, font, size) => {
    let total = 0;
    for (const ch of text) total += widths[font][byteOf(ch)];
    return total * size / 1000;
  };
  const hex = (text) => { let s = ""; for (const ch of text) s += byteOf(ch).toString(16).padStart(2, "0"); return s; };
  const number = (n) => (Math.round(n * 1000) / 1000).toString();

  function unsupported(doc) {
    const found = new Set();
    const scan = (text) => { for (const ch of visible(text)) if (!toByte.has(ch)) found.add(ch); };
    scan(doc.author);
    for (const chapter of doc.chapters) for (const p of chapter.paragraphs) scan(typeset(plainText(p)));
    return [...found];
  }

  // Splits a paragraph's runs into lines, breaking at spaces and after hyphens.
  function breakLines(runs, firstLineWidth, fullWidth) {
    const pieces = [];
    for (const run of runs) {
      for (const part of visible(run.text).match(/[^ \-–—]*[\-–—]+|[^ \-–—]+| +/gu) ?? []) pieces.push({ ...run, text: part });
    }
    const words = [];
    let open = false;
    for (const piece of pieces) {
      const space = piece.text.startsWith(" ");
      if (space) { words.push({ parts: [piece], space: true }); open = false; continue; }
      if (open) words[words.length - 1].parts.push(piece); else { words.push({ parts: [piece], space: false }); }
      open = !/[\-–—]$/u.test(piece.text);
    }
    const lines = [[]];
    let used = 0;
    const room = () => (lines.length === 1 ? firstLineWidth : fullWidth);
    for (const word of words) {
      const width = word.parts.reduce((sum, p) => sum + measure(p.text, p.font, p.size), 0);
      if (word.space) {
        if (used > 0) { lines[lines.length - 1].push(...word.parts); used += width; }
        continue;
      }
      const current = lines[lines.length - 1];
      const trailing = current.length && current[current.length - 1].text.startsWith(" ")
        ? measure(current[current.length - 1].text, current[current.length - 1].font, current[current.length - 1].size) : 0;
      if (used - trailing + width > room() + 0.001 || (used > 0 && used + width > room() + 0.001)) {
        if (used > 0) {
          if (trailing) current.pop();
          lines.push([]);
          used = 0;
        }
      }
      lines[lines.length - 1].push(...word.parts);
      used += width;
    }
    return lines;
  }

  // Line height and the distance from the baseline to the line's foot, in points,
  // measured from the Mac app's PDFs so that both page the same way.
  const lineBox = { bookTitle: [24.74, 3.26], chapterHeading: [25.67, 4.42], body: [22, 4.42] };

  // Turns a chapter into positioned lines on one or more pages.
  function layout(chapter) {
    const blocks = [];
    for (const paragraph of chapter.paragraphs) {
      const base = { before: 0, after: 0, box: lineBox.body, align: "left", size: 12, indent: 0, colour: null };
      let runs;
      if (paragraph.kind === "bookTitle") {
        Object.assign(base, { before: 18, after: 4, box: lineBox.bookTitle, align: "center", size: 20, colour: [0x0F, 0x47, 0x61] });
        runs = [{ text: typeset(plainText(paragraph)), font: "bold", size: 20 }];
      } else if (paragraph.kind === "chapterHeading") {
        Object.assign(base, { after: 12, box: lineBox.chapterHeading, align: "center", size: 14 });
        runs = [{ text: typeset(plainText(paragraph)), font: "bold", size: 14 }];
      } else if (paragraph.kind === "sceneBreak") {
        Object.assign(base, { before: 6, after: 6, align: "center" });
        runs = [{ text: "* * *", font: "regular", size: 12 }];
      } else {
        base.indent = firstIndent;
        runs = paragraph.runs.map((r) => ({ text: typeset(r.text), font: fontFor(r.bold, r.italic), size: 12, underline: r.underline }));
      }
      const lines = breakLines(runs, textWidth - base.indent, textWidth);
      lines.forEach((parts, i) => blocks.push({
        parts, height: base.box[0], foot: base.box[1], size: base.size, align: base.align, colour: base.colour,
        indent: i === 0 ? base.indent : 0, before: i === 0 ? base.before : 0, after: i === lines.length - 1 ? base.after : 0,
      }));
    }
    const pages = [[]];
    let y = 0;
    for (const block of blocks) {
      // Space before a line is dropped at the top of a page.
      let before = y === 0 ? 0 : block.before;
      if (y + before + block.height > textHeight + 0.001 && pages[pages.length - 1].length) {
        pages.push([]);
        y = 0;
        before = 0;
      }
      y += before + block.height;
      pages[pages.length - 1].push({ ...block, baseline: y - block.foot });
      y += block.after;
    }
    return pages;
  }

  function drawLine(line) {
    const width = line.parts.reduce((sum, p) => sum + measure(p.text, p.font, p.size), 0);
    let x = margin + line.indent + (line.align === "center" ? (textWidth - width) / 2 : 0);
    const y = pageHeight - margin - line.baseline;
    let out = "";
    const rgb = line.colour ? line.colour.map((c) => number(c / 255)).join(" ") : "0 0 0";
    for (const part of line.parts) {
      const w = measure(part.text, part.font, part.size);
      out += `BT ${rgb} rg /${resource[part.font]} ${number(part.size)} Tf ${number(x)} ${number(y)} Td <${hex(part.text)}> Tj ET\n`;
      if (part.underline) out += `${number(x)} ${number(y - 1.2)} ${number(w)} 0.6 re f\n`;
      x += w;
    }
    return out;
  }

  function pageContent(lines, author, number_) {
    let out = lines.map(drawLine).join("");
    if (author !== "") {
      const y = pageHeight - 36 - metric.ascent * 12 / 1000;
      out += `BT 0 0 0 rg /F1 12 Tf ${number(margin + firstIndent)} ${number(y)} Td <${hex(author)}> Tj ET\n`;
    }
    const label = String(number_);
    const x = pageWidth - margin - measure(label, "regular", 10);
    const y = 709 / 20 + metric.descent * 10 / 1000;
    return out + `BT 0 0 0 rg /F1 10 Tf ${number(x)} ${number(y)} Td <${hex(label)}> Tj ET\n`;
  }

  const utf16 = (text) => {
    let s = "FEFF";
    for (let i = 0; i < text.length; i++) s += text.charCodeAt(i).toString(16).padStart(4, "0").toUpperCase();
    return `<${s}>`;
  };

  async function deflate(text) {
    const stream = new Blob([Uint8Array.from(text, (c) => c.charCodeAt(0))]).stream().pipeThrough(new CompressionStream("deflate"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  async function build(doc) {
    const pages = [];
    for (const chapter of doc.chapters) {
      if (chapter.paragraphs.length) pages.push(...layout(chapter));
    }
    const objects = [];
    const add = (body) => { objects.push(body); return objects.length; };
    const catalog = add(""), tree = add(""), info = add("");
    const fonts = Object.keys(resource).map((key) => [resource[key],
      add(`<< /Type /Font /Subtype /Type1 /BaseFont /${fontName[key]} /Encoding /WinAnsiEncoding >>`)]);
    const fontDict = fonts.map(([name, id]) => `/${name} ${id} 0 R`).join(" ");
    const kids = [];
    for (let i = 0; i < pages.length; i++) {
      const data = await deflate(pageContent(pages[i], doc.author, i + 1));
      const stream = add({ head: `<< /Length ${data.length} /Filter /FlateDecode >>\nstream\n`, data });
      kids.push(add(`<< /Type /Page /Parent ${tree} 0 R /MediaBox [0 0 ${number(pageWidth)} ${number(pageHeight)}] `
        + `/Resources << /Font << ${fontDict} >> >> /Contents ${stream} 0 R >>`));
    }
    objects[catalog - 1] = `<< /Type /Catalog /Pages ${tree} 0 R /Lang (sv-SE) >>`;
    objects[tree - 1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`;
    objects[info - 1] = `<< /Title ${utf16(doc.title)} /Author ${utf16(doc.author)} /Creator ${utf16("Egenklang Plain")} >>`;
    const chunks = [];
    let length = 0;
    const put = (chunk) => {
      const bytes = typeof chunk === "string" ? Uint8Array.from(chunk, (c) => c.charCodeAt(0)) : chunk;
      chunks.push(bytes);
      length += bytes.length;
    };
    put("%PDF-1.4\n");
    const offsets = objects.map((body, i) => {
      const at = length;
      if (typeof body === "string") {
        put(`${i + 1} 0 obj\n${body}\nendobj\n`);
      } else {
        put(`${i + 1} 0 obj\n${body.head}`);
        put(body.data);
        put("\nendstream\nendobj\n");
      }
      return at;
    });
    const xref = length;
    put(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
    for (const at of offsets) put(`${String(at).padStart(10, "0")} 00000 n \n`);
    put(`trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    const file = new Uint8Array(length);
    let at = 0;
    for (const chunk of chunks) { file.set(chunk, at); at += chunk.length; }
    return file;
  }

  Plain.pdf = { build, unsupported };
})();
