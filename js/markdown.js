// Parses the text into the exported document. Same rules as the Mac app's Exporter.swift.
globalThis.Plain = globalThis.Plain || {};

(() => {
  const separators = new Set(["***", "* * *", "- - -", "---", "___"]);
  const word = "[\\p{L}\\p{M}\\p{N}_]";
  const notes = /\(\([^)]*\)\)|\[\[[^\]]*\]\]/gu;
  const unfinished = new RegExp(`(?<!${word})(?:TODO|FIXME|TK)(?!${word}).*$`, "u");
  const heading = /^(\*\*|__)[^*_].*(\*\*|__)$/u;
  const newlines = new RegExp("[\\n\\r\\u000B\\f\\u0085\\u2028\\u2029]", "u");

  const isSeparator = (line) => separators.has(line);
  const isHeading = (line) => line.startsWith("#") || heading.test(line);

  function headingText(line) {
    let text = line.replace(/^#+/u, "").trim();
    for (const mark of ["**", "__"]) {
      if (text.startsWith(mark) && text.endsWith(mark) && [...text].length > 4) text = text.slice(2, -2);
    }
    return text.trim();
  }

  function stripAuthorNotes(line) {
    const cleaned = line.replace(notes, "").replace(unfinished, "").replaceAll("  ", " ").trim();
    return cleaned === "" ? null : cleaned;
  }

  function inlineSpans(text) {
    const spans = [];
    const collect = (pattern, kind, open, close) => {
      for (const m of text.matchAll(new RegExp(pattern, "gu"))) {
        spans.push({ kind, start: m.index, end: m.index + m[0].length, open, close });
      }
    };
    collect(`(?<![*\\p{L}\\p{M}\\p{N}_])\\*\\*(?!\\s)([^*\\n]+?)\\*\\*(?![*\\p{L}\\p{M}\\p{N}_])`, "bold", 2, 2);
    collect(`(?<![*\\p{L}\\p{M}\\p{N}_])\\*(?!\\s|\\*)([^*\\n]+?)\\*(?![*\\p{L}\\p{M}\\p{N}_])`, "italic", 1, 1);
    collect(`<u>(?!\\s)(.+?)</u>`, "underline", 3, 4);
    return spans.sort((a, b) => a.start - b.start);
  }

  function runs(line) {
    const outermost = [];
    for (const span of inlineSpans(line)) {
      const last = outermost[outermost.length - 1];
      if (last && span.start < last.end) continue;
      outermost.push(span);
    }
    const result = [];
    let cursor = 0;
    for (const span of outermost) {
      if (span.start > cursor) result.push({ text: line.slice(cursor, span.start) });
      const inner = line.slice(span.start + span.open, span.end - span.close);
      if (inner !== "") result.push({ text: inner, [span.kind]: true });
      cursor = span.end;
    }
    if (cursor < line.length) result.push({ text: line.slice(cursor) });
    return result.length ? result : [{ text: line }];
  }

  function document(title, author, text) {
    const hasBody = (chapter) => chapter.paragraphs.some((p) => p.kind === "body");
    const chapters = [];
    let current = { title: "", paragraphs: [{ kind: "bookTitle", runs: [{ text: title }] }] };
    let pendingBreak = false;
    for (const raw of text.split(newlines)) {
      const line = raw.trim();
      if (line === "") continue;
      if (isSeparator(line)) { pendingBreak = true; continue; }
      if (isHeading(line)) {
        const name = headingText(line);
        if (hasBody(current)) {
          if (current.paragraphs.length) chapters.push(current);
          current = { title: name, paragraphs: [] };
        }
        current.title = name;
        current.paragraphs.push({ kind: "chapterHeading", runs: [{ text: name }] });
        pendingBreak = false;
        continue;
      }
      const content = stripAuthorNotes(line);
      if (content === null) continue;
      if (pendingBreak && hasBody(current)) {
        current.paragraphs.push({ kind: "sceneBreak", runs: [{ text: "* * *" }] });
      }
      pendingBreak = false;
      current.paragraphs.push({ kind: "body", runs: runs(content) });
    }
    if (current.paragraphs.length) chapters.push(current);
    return { title, author, chapters };
  }

  const typeset = (text) => text.replaceAll('"', "”").replaceAll("'", "’");
  const plainText = (paragraph) => paragraph.runs.map((r) => r.text).join("");

  Plain.markdown = { document, inlineSpans, isHeading, isSeparator, typeset, plainText };
})();
