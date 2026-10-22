// Převede data/listings.csv na docs/data/cars.json.
// Spuštění: node scripts/import-csv.mjs [vstup.csv]
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const inputFile = process.argv[2] ?? join(root, "data", "listings.csv");
const outputFile = join(root, "docs", "data", "cars.json");

const NUMERIC = ["price", "year", "mileage", "power", "engine", "owners"];
const REQUIRED = ["id", "brand", "model", "price", "year", "mileage", "fuel", "transmission"];

// Jednoduchý CSV parser s podporou uvozovek a čárek uvnitř hodnot.
function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell); cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.some((v) => v.trim() !== "")) rows.push(row);

  const [header, ...body] = rows;
  return body.map((values) => Object.fromEntries(header.map((key, i) => [key.trim(), (values[i] ?? "").trim()])));
}

function toCar(raw, lineNo) {
  for (const key of REQUIRED) {
    if (!raw[key]) throw new Error(`Řádek ${lineNo}: chybí pole "${key}"`);
  }

  const car = {
    id: raw.id,
    brand: raw.brand,
    model: raw.model,
    title: raw.title || `${raw.brand} ${raw.model}`,
    fuel: raw.fuel,
    transmission: raw.transmission,
    color: raw.color || undefined,
    stk: raw.stk || undefined,
    description: raw.description || undefined,
    image: raw.image || "",
    url: raw.url || "",
  };

  for (const key of NUMERIC) {
    if (raw[key] === "" || raw[key] === undefined) continue;
    const n = Number(raw[key].replace(/\s/g, ""));
    if (Number.isNaN(n)) throw new Error(`Řádek ${lineNo}: "${key}" není číslo (${raw[key]})`);
    car[key] = n;
  }

  return car;
}

const text = await readFile(inputFile, "utf8");
const cars = parseCsv(text).map((raw, i) => toCar(raw, i + 2));

const ids = new Set();
for (const car of cars) {
  if (ids.has(car.id)) throw new Error(`Duplicitní id: ${car.id}`);
  ids.add(car.id);
}

await mkdir(dirname(outputFile), { recursive: true });
await writeFile(outputFile, JSON.stringify(cars, null, 2) + "\n");
console.log(`Načteno ${cars.length} vozů z ${inputFile} → ${outputFile}`);
