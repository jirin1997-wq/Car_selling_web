// Načítání nabídky. Nejdřív zkusí publikovanou tabulku (CSV), jinak použije data/cars.json.
// Stejná pravidla jako scripts/import-csv.mjs, který generuje záložní cars.json.

const NUMERIC = ["price", "year", "mileage", "power", "engine", "owners"];
const REQUIRED = ["id", "brand", "model", "price", "year", "mileage", "fuel", "transmission"];

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
    if (!raw[key]) continue;
    const n = Number(raw[key].replace(/\s/g, ""));
    if (Number.isNaN(n)) throw new Error(`Řádek ${lineNo}: "${key}" není číslo (${raw[key]})`);
    car[key] = n;
  }

  return car;
}

export function toCars(text) {
  const cars = parseCsv(text).map((raw, i) => toCar(raw, i + 2));
  const ids = new Set();
  for (const car of cars) {
    if (ids.has(car.id)) throw new Error(`Duplicitní id: ${car.id}`);
    ids.add(car.id);
  }
  return cars;
}

export async function loadListings(sheetUrl) {
  if (sheetUrl) {
    try {
      const res = await fetch(sheetUrl, { cache: "no-store" });
      if (res.ok) {
        const cars = toCars(await res.text());
        if (cars.length) return cars;
      }
    } catch (err) {
      console.warn("Tabulku se nepodařilo načíst, používám záložní data.", err);
    }
  }
  const res = await fetch("data/cars.json");
  return res.json();
}
