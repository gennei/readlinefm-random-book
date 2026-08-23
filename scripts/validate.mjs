import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const books = JSON.parse(await readFile(path.join(projectRoot, "data", "books.json"), "utf8"));
const listenPattern = /^https:\/\/listen\.style\/p\/readlinefm\/[a-z0-9]+$/;

const playable = books.filter((book) => book.episodePart1Url);
const unavailable = books.filter((book) => !book.episodePart1Url);
const uniqueUrls = new Set(playable.map((book) => book.episodePart1Url));
const errors = [];

if (books.length !== 48) errors.push(`catalogue must contain 48 books, found ${books.length}`);
if (playable.length !== 46) errors.push(`playable pool must contain 46 books, found ${playable.length}`);
if (unavailable.length !== 2) errors.push(`unavailable pool must contain 2 books, found ${unavailable.length}`);
if (uniqueUrls.size !== playable.length) errors.push("episodePart1Url values must be unique");

for (const [index, book] of books.entries()) {
  if (!book.title || !Array.isArray(book.description) || book.description.length !== 3) {
    errors.push(`book ${index + 1} has invalid title or description`);
  }
  if (book.episodePart1Url && !listenPattern.test(book.episodePart1Url)) {
    errors.push(`book ${index + 1} has an invalid LISTEN URL`);
  }
  if (Boolean(book.episodePart1) !== Boolean(book.episodePart1Url)) {
    errors.push(`book ${index + 1} has inconsistent PART1 fields`);
  }
}

if (errors.length) {
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`validated: ${books.length} books / ${playable.length} playable / ${unavailable.length} unavailable`);
