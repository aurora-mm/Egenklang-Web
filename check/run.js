// Writes the web version's Word and PDF for a text file. node check/run.js <input> <folder>
const fs = require("fs"), path = require("path"), vm = require("vm");
for (const file of ["markdown", "metrics", "docx", "pdf"]) {
  vm.runInThisContext(fs.readFileSync(path.join(__dirname, "..", "js", `${file}.js`), "utf8"), { filename: `${file}.js` });
}
const [input, folder] = process.argv.slice(2);
const doc = Plain.markdown.document("Prov", "A. Author", fs.readFileSync(input, "utf8"));
(async () => {
  fs.writeFileSync(path.join(folder, "web.docx"), Plain.docx.build(doc));
  fs.writeFileSync(path.join(folder, "web.pdf"), await Plain.pdf.build(doc));
  console.log("unsupported:", JSON.stringify(Plain.pdf.unsupported(doc)));
})();
