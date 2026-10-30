// The page: one text, open, save, Word and PDF. Nothing leaves the browser.
(() => {
  const $ = (id) => document.getElementById(id);
  const editor = $("editor"), paint = $("paint"), nameField = $("name"), authorField = $("author"), status = $("status");
  const { inlineSpans, isHeading, isSeparator } = Plain.markdown;
  const store = {
    get: (key) => { try { return localStorage.getItem(key); } catch { return null; } },
    set: (key, value) => { try { localStorage.setItem(key, value); } catch {} },
  };
  const types = [{ description: "Text", accept: { "text/markdown": [".md", ".markdown"], "text/plain": [".txt"] } }];
  let handle = null, dirty = false, draftTimer = 0;

  const say = (message) => { status.textContent = message; };
  const baseName = () => nameField.value.trim().replace(/\.(md|markdown|txt)$/iu, "") || "Untitled";

  // Painting: colour only, so that every character keeps its width under the textarea.
  const esc = (text) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const note = /\(\([^)\n]{0,160}\)\)|\[\[[^\]\n]{0,160}\]\]|(?<![\p{L}\p{M}\p{N}_])(?:TODO|FIXME|TK)(?![\p{L}\p{M}\p{N}_])[^\n]{0,120}/gu;

  function paintLine(line) {
    const trimmed = line.trim();
    if (trimmed === "") return "<br>";
    if (isSeparator(trimmed)) return `<span class="break">${esc(line)}</span>`;
    if (isHeading(trimmed)) return `<span class="heading">${esc(line)}</span>`;
    const edges = new Map();
    const open = (at, tag) => edges.set(at, (edges.get(at) ?? "") + tag);
    const close = (at, tag) => edges.set(at, tag + (edges.get(at) ?? ""));
    const spans = [];
    for (const span of inlineSpans(line)) {
      if (spans.some((s) => span.start < s.end && s.start < span.end)) continue;
      spans.push(span);
      open(span.start, '<span class="mark">');
      close(span.start + span.open, "</span>");
      open(span.start + span.open, `<span class="${span.kind}">`);
      close(span.end - span.close, "</span>");
      open(span.end - span.close, '<span class="mark">');
      close(span.end, "</span>");
    }
    for (const m of line.matchAll(note)) {
      if (spans.some((s) => m.index < s.end && s.start < m.index + m[0].length)) continue;
      open(m.index, '<span class="note">');
      close(m.index + m[0].length, "</span>");
    }
    let out = "", cursor = 0;
    for (const at of [...edges.keys()].sort((a, b) => a - b)) {
      out += esc(line.slice(cursor, at)) + edges.get(at);
      cursor = at;
    }
    return out + esc(line.slice(cursor));
  }

  // Only the lines that changed are repainted, so long texts stay quick.
  let painted = [];
  function repaint() {
    const lines = editor.value.split("\n");
    let start = 0;
    while (start < lines.length && start < painted.length && lines[start] === painted[start]) start++;
    let oldEnd = painted.length, newEnd = lines.length;
    while (oldEnd > start && newEnd > start && painted[oldEnd - 1] === lines[newEnd - 1]) { oldEnd--; newEnd--; }
    for (let i = oldEnd - 1; i >= start; i--) paint.children[i].remove();
    const before = paint.children[start] ?? null;
    for (let i = start; i < newEnd; i++) {
      const div = document.createElement("div");
      div.innerHTML = paintLine(lines[i]);
      paint.insertBefore(div, before);
    }
    painted = lines;
    paint.scrollTop = editor.scrollTop;
  }

  function saveDraft() {
    store.set("plain.text", editor.value);
    store.set("plain.name", nameField.value);
  }

  function setDirty(value) {
    dirty = value;
    document.title = `${value ? "• " : ""}${baseName()} - Egenklang Plain`;
    say(value ? "Edited" : "Saved");
  }

  function load(text, name, fileHandle) {
    editor.value = text;
    nameField.value = name;
    handle = fileHandle;
    editor.setSelectionRange(0, 0);
    editor.scrollTop = 0;
    repaint();
    saveDraft();
    setDirty(false);
    say("");
    editor.focus();
  }

  const confirmDiscard = () => !dirty || confirm("Discard unsaved changes?");

  async function openBytes(file, fileHandle) {
    let text;
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
    } catch {
      alert(`${file.name} is not UTF-8 text.`);
      return;
    }
    load(text, file.name.replace(/\.(md|markdown|txt)$/iu, ""), fileHandle);
  }

  async function openFile() {
    if (!confirmDiscard()) return;
    if (!window.showOpenFilePicker) { $("picker").click(); return; }
    try {
      const [fileHandle] = await showOpenFilePicker({ types });
      await openBytes(await fileHandle.getFile(), fileHandle);
    } catch (error) {
      if (error.name !== "AbortError") alert(error.message);
    }
  }

  function download(bytes, name, type) {
    const url = URL.createObjectURL(new Blob([bytes], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  async function save() {
    if (!window.showSaveFilePicker) {
      download(editor.value, `${baseName()}.md`, "text/markdown;charset=utf-8");
      setDirty(false);
      return;
    }
    try {
      handle ??= await showSaveFilePicker({ suggestedName: `${baseName()}.md`, types });
      const writable = await handle.createWritable();
      await writable.write(editor.value);
      await writable.close();
      setDirty(false);
    } catch (error) {
      if (error.name !== "AbortError") alert(error.message);
    }
  }

  function exported() {
    return Plain.markdown.document(baseName(), authorField.value.trim(), editor.value);
  }

  function exportWord() {
    download(Plain.docx.build(exported()), `${baseName()}.docx`,
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    say("Exported Word file");
  }

  async function exportPDF() {
    const doc = exported();
    const missing = Plain.pdf.unsupported(doc);
    if (missing.length && !confirm(`PDF cannot show these characters, they become "?": ${missing.join(" ")}\n\nThe Word export keeps them. Continue?`)) return;
    download(await Plain.pdf.build(doc), `${baseName()}.pdf`, "application/pdf");
    say("Exported PDF");
  }

  editor.addEventListener("input", () => {
    repaint();
    if (!dirty) setDirty(true);
    clearTimeout(draftTimer);
    draftTimer = setTimeout(saveDraft, 500);
  });
  editor.addEventListener("scroll", () => { paint.scrollTop = editor.scrollTop; });
  new ResizeObserver(() => { paint.scrollTop = editor.scrollTop; }).observe(editor);
  nameField.addEventListener("input", () => { store.set("plain.name", nameField.value); document.title = `${dirty ? "• " : ""}${baseName()} - Egenklang Plain`; });
  authorField.addEventListener("input", () => store.set("plain.author", authorField.value));
  $("new").addEventListener("click", () => { if (confirmDiscard()) load("", "Untitled", null); });
  $("open").addEventListener("click", openFile);
  $("save").addEventListener("click", save);
  $("word").addEventListener("click", exportWord);
  $("pdf").addEventListener("click", exportPDF);
  $("picker").addEventListener("change", (event) => {
    const [file] = event.target.files;
    event.target.value = "";
    if (file) openBytes(file, null);
  });
  addEventListener("keydown", (event) => {
    if (!(event.metaKey || event.ctrlKey)) return;
    const key = event.key.toLowerCase();
    const action = key === "s" ? save : key === "o" ? openFile : key === "e" ? (event.shiftKey ? exportPDF : exportWord) : null;
    if (action) { event.preventDefault(); action(); }
  });
  addEventListener("beforeunload", (event) => { saveDraft(); if (dirty) event.preventDefault(); });

  authorField.value = store.get("plain.author") ?? "";
  editor.value = store.get("plain.text") ?? "";
  nameField.value = store.get("plain.name") ?? "Untitled";
  repaint();
  document.title = `${baseName()} - Egenklang Plain`;
  editor.focus();
})();
