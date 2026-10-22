// Načte tabulku s nabídkou (CSV) a uloží ji do Supabase.
// Zároveň zapíše docs/data/cars.json jako záložní data.
//
// Spuštění:  node scripts/import-csv.mjs [zdroj.csv nebo URL]
// Proměnné:  LISTINGS_CSV_URL, SUPABASE_URL, SUPABASE_SERVICE_KEY
// Bez Supabase proměnných proběhne jen zápis cars.json.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const inputFile = process.argv[2] || process.env.LISTINGS_CSV_URL || join(root, "data", "listings.csv");
const outputFile = join(root, "docs", "data", "cars.json");
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SOURCE = "manual";
const BATCH = 500;

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
    color: raw.color || null,
    stk: raw.stk || null,
    description: raw.description || null,
    image: raw.image || "",
    url: raw.url || "",
  };

  for (const key of NUMERIC) {
    if (raw[key] === "" || raw[key] === undefined) {
      car[key] = null;
      continue;
    }
    const n = Number(raw[key].replace(/\s/g, ""));
    if (Number.isNaN(n)) throw new Error(`Řádek ${lineNo}: "${key}" není číslo (${raw[key]})`);
    car[key] = n;
  }

  return car;
}

// Vstup může být lokální soubor, nebo URL publikované tabulky (např. Google Sheets jako CSV).
async function loadText(source) {
  if (!/^https?:\/\//.test(source)) return readFile(source, "utf8");
  const res = await fetch(source, { cache: "no-store" });
  if (!res.ok) throw new Error(`Načtení tabulky selhalo: HTTP ${res.status}`);
  return res.text();
}

async function supabase(path, { method = "GET", body, prefer } = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Supabase ${method} ${path}: HTTP ${res.status} ${await res.text()}`);
}

// Upsert po dávkách a potom deaktivace vozů z tabulky, které v ní už nejsou.
async function syncToSupabase(cars) {
  const rows = cars.map((car) => ({ ...car, source: SOURCE, is_active: true, updated_at: new Date().toISOString() }));

  for (let i = 0; i < rows.length; i += BATCH) {
    await supabase("cars?on_conflict=id", {
      method: "POST",
      body: rows.slice(i, i + BATCH),
      prefer: "resolution=merge-duplicates,return=minimal",
    });
  }

  const idList = cars.map((c) => `"${c.id.replace(/"/g, '\\"')}"`).join(",");
  const params = new URLSearchParams({ source: `eq.${SOURCE}`, id: `not.in.(${idList})` });
  await supabase(`cars?${params}`, {
    method: "PATCH",
    body: { is_active: false, updated_at: new Date().toISOString() },
    prefer: "return=minimal",
  });
}

const text = await loadText(inputFile);
const cars = parseCsv(text).map((raw, i) => toCar(raw, i + 2));

const ids = new Set();
for (const car of cars) {
  if (ids.has(car.id)) throw new Error(`Duplicitní id: ${car.id}`);
  ids.add(car.id);
}

if (cars.length === 0) throw new Error("Tabulka neobsahuje žádné vozy, import se přeruší.");

await mkdir(dirname(outputFile), { recursive: true });
await writeFile(outputFile, JSON.stringify(cars.map(({ is_active, ...car }) => car), null, 2) + "\n");
console.log(`Záložní data: ${cars.length} vozů → ${outputFile}`);

if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  await syncToSupabase(cars);
  console.log(`Supabase: synchronizováno ${cars.length} vozů.`);
} else {
  console.log("Supabase proměnné nejsou nastaveny, databáze se neaktualizovala.");
}
