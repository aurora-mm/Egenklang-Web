// Word export: the Mac app's XML parts in a zip written here, with no libraries.
globalThis.Plain = globalThis.Plain || {};

(() => {
  const P = {
    width: 11906, height: 16838, margin: 1701, headerDistance: 720, footerDistance: 709,
    firstLineIndent: 425, bodyLine: 360, titleLine: 278, bodySize: 24, titleSize: 40, headingSize: 28,
    pageNumberSize: 20, titleSpaceBefore: 360, titleSpaceAfter: 80, headingSpaceAfter: 240, breakSpace: 120,
    titleColour: "0F4761", bodyFont: "Times New Roman", runningFont: "Baskerville Old Face", language: "sv-SE",
  };
  const w = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const r = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
  const head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  const escape = (text) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  const { typeset, plainText } = Plain.markdown;

  const contentTypes = head + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
    + '<Default Extension="xml" ContentType="application/xml"/>'
    + '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
    + '<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
    + '<Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>'
    + '<Override PartName="/word/header1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.header+xml"/>'
    + '<Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/>'
    + '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>'
    + '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>'
    + "</Types>";

  const packageRelationships = head + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
    + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
    + '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>'
    + "</Relationships>";

  const documentRelationships = head + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
    + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>'
    + '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/header" Target="header1.xml"/>'
    + '<Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>'
    + "</Relationships>";

  function coreProperties(doc) {
    const now = new Date().toISOString().replace(/\.\d+Z$/, "Z");
    return head + '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
      + 'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" '
      + 'xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
      + `<dc:title>${escape(doc.title)}</dc:title><dc:creator>${escape(doc.author)}</dc:creator>`
      + `<dc:language>${P.language}</dc:language>`
      + `<dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>`
      + `<dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`;
  }

  const appProperties = head + '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Egenklang Plain</Application></Properties>';

  function stylesXML() {
    const body = P.bodyFont, running = P.runningFont, textWidth = P.width - 2 * P.margin;
    const runningStyle = (id, name, size) => `<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/>`
      + '<w:basedOn w:val="Normal"/><w:uiPriority w:val="99"/><w:unhideWhenUsed/>'
      + `<w:pPr><w:tabs><w:tab w:val="center" w:pos="${Math.trunc(textWidth / 2)}"/><w:tab w:val="right" w:pos="${textWidth}"/></w:tabs>`
      + '<w:spacing w:line="240" w:lineRule="auto"/></w:pPr>'
      + `<w:rPr><w:rFonts w:ascii="${running}" w:hAnsi="${running}" w:cs="${running}"/>${size}</w:rPr></w:style>`;
    return head + `<w:styles xmlns:w="${w}"><w:docDefaults><w:rPrDefault><w:rPr>`
      + `<w:rFonts w:ascii="${body}" w:eastAsia="${body}" w:hAnsi="${body}" w:cs="${body}"/>`
      + `<w:sz w:val="${P.bodySize}"/><w:szCs w:val="${P.bodySize}"/><w:lang w:val="${P.language}" w:eastAsia="en-US" w:bidi="ar-SA"/>`
      + `</w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="${P.bodyLine}" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>`
      + '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/>'
      + `<w:pPr><w:spacing w:after="0" w:line="${P.bodyLine}" w:lineRule="auto"/><w:ind w:firstLine="${P.firstLineIndent}"/></w:pPr></w:style>`
      + '<w:style w:type="character" w:default="1" w:styleId="DefaultParagraphFont"><w:name w:val="Default Paragraph Font"/><w:uiPriority w:val="1"/><w:semiHidden/><w:unhideWhenUsed/></w:style>'
      + '<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:qFormat/>'
      + `<w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="${P.titleSpaceBefore}" w:after="${P.titleSpaceAfter}" w:line="${P.titleLine}" w:lineRule="auto"/>`
      + '<w:ind w:firstLine="0"/><w:jc w:val="center"/><w:outlineLvl w:val="0"/></w:pPr>'
      + `<w:rPr><w:b/><w:bCs/><w:color w:val="${P.titleColour}"/><w:sz w:val="${P.titleSize}"/><w:szCs w:val="${P.titleSize}"/></w:rPr></w:style>`
      + '<w:style w:type="paragraph" w:customStyle="1" w:styleId="ChapterHeading"><w:name w:val="Chapter heading"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>'
      + `<w:pPr><w:keepNext/><w:spacing w:after="${P.headingSpaceAfter}"/><w:ind w:firstLine="0"/><w:jc w:val="center"/><w:outlineLvl w:val="1"/></w:pPr>`
      + `<w:rPr><w:b/><w:sz w:val="${P.headingSize}"/><w:szCs w:val="${P.headingSize}"/></w:rPr></w:style>`
      + '<w:style w:type="paragraph" w:customStyle="1" w:styleId="SceneBreak"><w:name w:val="Scene break"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>'
      + `<w:pPr><w:spacing w:before="${P.breakSpace}" w:after="${P.breakSpace}"/><w:ind w:firstLine="0"/><w:jc w:val="center"/></w:pPr></w:style>`
      + runningStyle("Header", "header", "")
      + runningStyle("Footer", "footer", `<w:sz w:val="${P.pageNumberSize}"/><w:szCs w:val="${P.pageNumberSize}"/>`)
      + "</w:styles>";
  }

  const settingsXML = head + `<w:settings xmlns:w="${w}"><w:zoom w:percent="100"/>`
    + '<w:defaultTabStop w:val="720"/><w:characterSpacingControl w:val="doNotCompress"/>'
    + '<w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="15"/></w:compat></w:settings>';

  function headerXML(author) {
    const run = author === "" ? "" : `<w:r><w:t xml:space="preserve">${escape(author)}</w:t></w:r>`;
    return head + `<w:hdr xmlns:w="${w}"><w:p><w:pPr><w:pStyle w:val="Header"/></w:pPr>${run}</w:p></w:hdr>`;
  }

  const footerXML = head + `<w:ftr xmlns:w="${w}"><w:p><w:pPr><w:pStyle w:val="Footer"/><w:jc w:val="right"/></w:pPr>`
    + '<w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r>'
    + '<w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p></w:ftr>';

  const plainRun = (text) => `<w:r><w:t xml:space="preserve">${escape(typeset(text))}</w:t></w:r>`;

  function documentXML(doc) {
    let body = "";
    doc.chapters.forEach((chapter, chapterIndex) => {
      chapter.paragraphs.forEach((paragraph, paragraphIndex) => {
        const pageBreak = chapterIndex > 0 && paragraphIndex === 0 ? "<w:pageBreakBefore/>" : "";
        if (paragraph.kind === "bookTitle") {
          body += `<w:p><w:pPr><w:pStyle w:val="Heading1"/>${pageBreak}</w:pPr>${plainRun(plainText(paragraph))}</w:p>`;
        } else if (paragraph.kind === "chapterHeading") {
          body += `<w:p><w:pPr><w:pStyle w:val="ChapterHeading"/>${pageBreak}</w:pPr>${plainRun(plainText(paragraph))}</w:p>`;
        } else if (paragraph.kind === "sceneBreak") {
          body += `<w:p><w:pPr><w:pStyle w:val="SceneBreak"/>${pageBreak}</w:pPr>${plainRun("* * *")}</w:p>`;
        } else {
          body += "<w:p>" + (pageBreak ? `<w:pPr>${pageBreak}</w:pPr>` : "");
          for (const run of paragraph.runs) {
            const formatting = (run.bold ? "<w:b/>" : "") + (run.italic ? "<w:i/>" : "") + (run.underline ? '<w:u w:val="single"/>' : "");
            body += "<w:r>" + (formatting ? `<w:rPr>${formatting}</w:rPr>` : "")
              + `<w:t xml:space="preserve">${escape(typeset(run.text))}</w:t></w:r>`;
          }
          body += "</w:p>";
        }
      });
    });
    return head + `<w:document xmlns:w="${w}" xmlns:r="${r}"><w:body>${body}`
      + '<w:sectPr><w:headerReference w:type="default" r:id="rId3"/><w:footerReference w:type="default" r:id="rId4"/>'
      + `<w:pgSz w:w="${P.width}" w:h="${P.height}"/>`
      + `<w:pgMar w:top="${P.margin}" w:right="${P.margin}" w:bottom="${P.margin}" w:left="${P.margin}" w:header="${P.headerDistance}" w:footer="${P.footerDistance}" w:gutter="0"/>`
      + '<w:cols w:space="720"/><w:docGrid w:linePitch="360"/></w:sectPr></w:body></w:document>';
  }

  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (const b of bytes) c = crcTable[(c ^ b) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  // Stored (uncompressed) zip entries, which Word reads like any other.
  function zip(parts, date) {
    const encoder = new TextEncoder();
    const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
    const day = ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
    const chunks = [], central = [];
    let offset = 0;
    const common = (view, at, crc, size, nameLength) => {
      view.setUint16(at, 20, true);
      view.setUint16(at + 2, 0x0800, true);
      view.setUint16(at + 4, 0, true);
      view.setUint16(at + 6, time, true);
      view.setUint16(at + 8, day, true);
      view.setUint32(at + 10, crc, true);
      view.setUint32(at + 14, size, true);
      view.setUint32(at + 18, size, true);
      view.setUint16(at + 22, nameLength, true);
    };
    for (const [path, content] of parts) {
      const name = encoder.encode(path), data = encoder.encode(content), crc = crc32(data);
      const local = new Uint8Array(30);
      const lv = new DataView(local.buffer);
      lv.setUint32(0, 0x04034B50, true);
      common(lv, 4, crc, data.length, name.length);
      chunks.push(local, name, data);
      const entry = new Uint8Array(46);
      const cv = new DataView(entry.buffer);
      cv.setUint32(0, 0x02014B50, true);
      cv.setUint16(4, 20, true);
      common(cv, 6, crc, data.length, name.length);
      cv.setUint32(42, offset, true);
      central.push(entry, name);
      offset += local.length + name.length + data.length;
    }
    const centralSize = central.reduce((sum, c) => sum + c.length, 0);
    const end = new Uint8Array(22);
    const ev = new DataView(end.buffer);
    ev.setUint32(0, 0x06054B50, true);
    ev.setUint16(8, parts.length, true);
    ev.setUint16(10, parts.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, offset, true);
    const out = new Uint8Array(offset + centralSize + end.length);
    let at = 0;
    for (const c of [...chunks, ...central, end]) { out.set(c, at); at += c.length; }
    return out;
  }

  function parts(doc) {
    return [
      ["[Content_Types].xml", contentTypes], ["_rels/.rels", packageRelationships],
      ["docProps/core.xml", coreProperties(doc)], ["docProps/app.xml", appProperties],
      ["word/_rels/document.xml.rels", documentRelationships], ["word/document.xml", documentXML(doc)],
      ["word/styles.xml", stylesXML()], ["word/settings.xml", settingsXML],
      ["word/header1.xml", headerXML(doc.author)], ["word/footer1.xml", footerXML],
    ];
  }

  Plain.docx = { parts, build: (doc) => zip(parts(doc), new Date()) };
})();
