import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = process.argv[2]
  ? path.resolve(projectRoot, process.argv[2])
  : path.resolve(projectRoot, "..", "readlinefm-random-book-preview.html");

const [html, css, app, books] = await Promise.all([
  readFile(path.join(projectRoot, "index.html"), "utf8"),
  readFile(path.join(projectRoot, "assets", "styles.css"), "utf8"),
  readFile(path.join(projectRoot, "assets", "app.js"), "utf8"),
  readFile(path.join(projectRoot, "data", "books.json"), "utf8")
]);

const standalone = html
  .replace('<link rel="stylesheet" href="assets/styles.css">', `<style>\n${css}\n    </style>`)
  .replace(
    '<script id="book-data" type="application/json" data-src="data/books.json"></script>',
    `<script id="book-data" type="application/json">\n${books.trim()}\n    </script>`
  )
  .replace('<script src="assets/app.js" defer></script>', `<script>\n${app}\n    </script>`);

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, standalone);
console.log(outputPath);
