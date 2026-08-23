import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const RSS_URL = "https://rss.listen.style/p/readlinefm/rss";
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const booksPath = path.join(projectRoot, "data", "books.json");

function decodeXml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function normalize(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/^ep\d+/i, "")
    .replace(/part\s*1$/i, "")
    .replace(/[\s\p{P}\p{S}]/gu, "");
}

function coreTitle(title) {
  return normalize(title.split(/[―〜～]/)[0]);
}

function parseItems(xml) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => {
    const item = match[1];
    const titleMatch = item.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/);
    const linkMatch = item.match(/<link>(https:\/\/listen\.style\/p\/readlinefm\/[a-z0-9]+)<\/link>/);
    return {
      title: decodeXml(titleMatch?.[1]?.trim() || ""),
      link: linkMatch?.[1] || null
    };
  });
}

function isPart1(item) {
  return /part\s*1(?:\D|$)/i.test(item.title);
}

function findItem(book, part1Items) {
  if (book.episodePart1) {
    const episode = book.episodePart1.replace(/^EP/i, "").padStart(3, "0");
    const byEpisode = part1Items.find((item) => {
      const match = item.title.match(/^EP\s*(\d+)/i);
      return match && match[1].padStart(3, "0") === episode;
    });
    if (byEpisode) return byEpisode;
  }

  const wanted = coreTitle(book.title);
  return part1Items.find((item) => {
    const candidate = normalize(item.title);
    return wanted.length >= 4 && (candidate.includes(wanted) || wanted.includes(candidate));
  });
}

const response = await fetch(RSS_URL);
if (!response.ok) throw new Error(`RSS fetch failed: ${response.status}`);

const xml = await response.text();
const part1Items = parseItems(xml).filter((item) => item.link && isPart1(item));
const books = JSON.parse(await readFile(booksPath, "utf8"));

let updated = 0;
for (const book of books) {
  const item = findItem(book, part1Items);
  if (!item) continue;

  const episodeMatch = item.title.match(/^EP\s*(\d+)/i);
  const episodePart1 = episodeMatch ? `EP${episodeMatch[1].padStart(3, "0")}` : book.episodePart1;
  if (book.episodePart1 !== episodePart1 || book.episodePart1Url !== item.link) updated += 1;
  book.episodePart1 = episodePart1;
  book.episodePart1Url = item.link;
}

await writeFile(booksPath, `${JSON.stringify(books, null, 2)}\n`);

const playable = books.filter((book) => book.episodePart1Url).length;
console.log(`RSS PART1: ${part1Items.length} / playable books: ${playable} / updated: ${updated}`);

if (playable < 46) {
  throw new Error(`Expected at least 46 playable books, found ${playable}`);
}
