// Stáhne inzeráty ze Sauto a uloží je do public/data/cars.json.
// Endpoint a tvar odpovědi nejsou ověřené: nastavte SAUTO_API_URL a případně
// upravte mapCar podle skutečné odpovědi.
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const outFile = join(here, "..", "public", "data", "cars.json");

const apiUrl = process.env.SAUTO_API_URL;
if (!apiUrl) {
  console.error("Chybí SAUTO_API_URL.");
  process.exit(1);
}

function mapCar(item) {
  return {
    id: String(item.id),
    brand: item.brand,
    model: item.model,
    title: item.title,
    price: item.price,
    year: item.year,
    mileage: item.mileage,
    fuel: item.fuel,
    transmission: item.transmission,
    image: item.image ?? "",
    url: item.url,
  };
}

const res = await fetch(apiUrl, { headers: { Accept: "application/json" } });
if (!res.ok) {
  console.error(`Sauto vrátilo ${res.status}`);
  process.exit(1);
}

const body = await res.json();
const items = Array.isArray(body) ? body : body.items ?? [];
const cars = items.map(mapCar);

await mkdir(dirname(outFile), { recursive: true });
await writeFile(outFile, JSON.stringify(cars, null, 2) + "\n");
console.log(`Uloženo ${cars.length} vozů do ${outFile}`);
