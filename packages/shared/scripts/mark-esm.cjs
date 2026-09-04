// Dual CJS/ESM output needs a marker so the ESM half isn't misread as
// CommonJS — Node and bundlers both treat a directory's .js files as ESM
// once a package.json in that directory says {"type":"module"}.
const fs = require("node:fs");
const path = require("node:path");

const dir = path.join(__dirname, "..", "dist", "esm");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ type: "module" }, null, 2) + "\n");
