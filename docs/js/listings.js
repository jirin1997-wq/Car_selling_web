// Načítání nabídky z Supabase. Když databáze není nastavená nebo není dostupná,
// použije se záložní soubor data/cars.json.

const BUCKET = "car-photos";

const COLUMNS = [
  "id", "brand", "model", "title", "price", "year", "mileage", "fuel", "transmission",
  "power", "engine", "color", "owners", "stk", "description", "images", "url",
].join(",");

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

export async function loadListings(config) {
  if (config?.url && config?.anonKey) {
    try {
      return await fromSupabase(config);
    } catch (err) {
      console.warn("Databázi se nepodařilo načíst, používám záložní data.", err);
    }
  }
  const res = await fetch("data/cars.json");
  return res.json();
}
