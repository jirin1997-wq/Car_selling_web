// Načítání nabídky. Zdroje v pořadí priority:
// 1. publikovaná tabulka Google Sheets (CSV), pokud je nastavená,
// 2. Supabase, pokud je nastavená,
// 3. záložní soubor data/cars.json.

const BUCKET = "car-photos";
const NUMERIC = ["price", "year", "mileage", "power", "engine", "owners"];

const COLUMNS = [
  "id", "brand", "model", "title", "price", "year", "mileage", "fuel", "transmission",
  "power", "engine", "color", "owners", "stk", "description", "images", "url",
].join(",");

// CSV parser s podporou uvozovek a čárek uvnitř hodnot.
export function parseCsv(text) {
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

function sheetRowToCar(raw) {
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
    images: (raw.images || raw.image || "").split("|").map((s) => s.trim()).filter(Boolean),
    url: raw.url || "",
  };
  for (const key of NUMERIC) {
    car[key] = raw[key] ? Number(raw[key].replace(/\s/g, "")) : null;
  }
  return car;
}

async function fromSheet(sheetUrl) {
  const res = await fetch(sheetUrl, { cache: "no-store" });
  if (!res.ok) throw new Error(`Tabulku se nepodařilo načíst: HTTP ${res.status}`);
  const cars = parseCsv(await res.text())
    .filter((raw) => raw.id && raw.brand && raw.price)
    .map(sheetRowToCar);
  if (cars.length === 0) throw new Error("Tabulka neobsahuje žádné vozy.");
  return cars;
}

// Cesta v bucketu se změní na veřejnou URL, absolutní URL zůstane beze změny.
function photoUrl(supabaseUrl, value) {
  if (/^https?:\/\//.test(value)) return value;
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${value.split("/").map(encodeURIComponent).join("/")}`;
}

async function fromSupabase({ url, anonKey }) {
  const params = new URLSearchParams({
    select: COLUMNS,
    is_active: "eq.true",
    order: "price.asc",
  });
  const res = await fetch(`${url}/rest/v1/cars?${params}`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Supabase vrátil HTTP ${res.status}`);
  const cars = await res.json();
  return cars.map((car) => ({
    ...car,
    images: (car.images ?? []).map((p) => photoUrl(url, p)),
  }));
}

export async function loadListings(config = {}) {
  const { sheetUrl, url, anonKey } = config;

  if (sheetUrl) {
    try {
      return await fromSheet(sheetUrl);
    } catch (err) {
      console.warn("Tabulku se nepodařilo načíst.", err);
    }
  }

  if (url && anonKey) {
    try {
      return await fromSupabase({ url, anonKey });
    } catch (err) {
      console.warn("Databázi se nepodařilo načíst, používám záložní data.", err);
    }
  }

  const res = await fetch("data/cars.json");
  return res.json();
}
