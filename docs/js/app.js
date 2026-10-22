const el = {
  cars: document.getElementById("cars"),
  empty: document.getElementById("empty"),
  count: document.getElementById("count"),
  brand: document.getElementById("brand"),
  model: document.getElementById("model"),
  yearMin: document.getElementById("year-min"),
  yearMax: document.getElementById("year-max"),
  priceMin: document.getElementById("price-min"),
  priceMax: document.getElementById("price-max"),
  mileage: document.getElementById("mileage"),
  mileageOut: document.getElementById("mileage-out"),
  sort: document.getElementById("sort"),
  reset: document.getElementById("reset"),
};

const fmtPrice = (czk) =>
  new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(czk);
const fmtNum = (n) => n.toLocaleString("cs-CZ");

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const toNumber = (value) => {
  const n = Number(value);
  return value === "" || Number.isNaN(n) ? null : n;
};

const SORTERS = {
  "price-asc": (a, b) => a.price - b.price,
  "price-desc": (a, b) => b.price - a.price,
  "year-desc": (a, b) => b.year - a.year,
  "mileage-asc": (a, b) => a.mileage - b.mileage,
};

function renderCar(car) {
  const article = document.createElement("article");
  article.className = "car";
  article.innerHTML = `
    <a href="${escapeHtml(car.url)}" target="_blank" rel="noopener">
      <div class="car-image">
        ${car.image ? `<img src="${escapeHtml(car.image)}" alt="${escapeHtml(car.title)}" loading="lazy">` : ""}
      </div>
      <div class="car-body">
        <p class="car-brand">${escapeHtml(car.brand)}</p>
        <h2>${escapeHtml(car.title)}</h2>
        <p class="price">${fmtPrice(car.price)}</p>
        <ul class="specs">
          <li>${escapeHtml(car.year)}</li>
          <li>${fmtNum(car.mileage)} km</li>
          <li>${escapeHtml(car.fuel)}</li>
          <li>${escapeHtml(car.transmission)}</li>
        </ul>
      </div>
    </a>`;
  return article;
}

function fillSelect(select, values, allLabel) {
  const current = select.value;
  select.replaceChildren(
    new Option(allLabel, ""),
    ...values.map((v) => new Option(v, v)),
  );
  select.value = values.includes(current) ? current : "";
}

function uniqueSorted(cars, key) {
  return [...new Set(cars.map((c) => c[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b, "cs"));
}

function currentFilters() {
  return {
    brand: el.brand.value,
    model: el.model.value,
    yearMin: toNumber(el.yearMin.value),
    yearMax: toNumber(el.yearMax.value),
    priceMin: toNumber(el.priceMin.value),
    priceMax: toNumber(el.priceMax.value),
    mileageMax: Number(el.mileage.value),
  };
}

function applyFilters(cars, f) {
  return cars.filter((car) => {
    if (f.brand && car.brand !== f.brand) return false;
    if (f.model && car.model !== f.model) return false;
    if (f.yearMin !== null && car.year < f.yearMin) return false;
    if (f.yearMax !== null && car.year > f.yearMax) return false;
    if (f.priceMin !== null && car.price < f.priceMin) return false;
    if (f.priceMax !== null && car.price > f.priceMax) return false;
    if (car.mileage > f.mileageMax) return false;
    return true;
  });
}

let allCars = [];

function render() {
  const f = currentFilters();
  el.mileageOut.textContent = fmtNum(f.mileageMax);

  // Model nabízíme jen z vybrané značky.
  const modelSource = f.brand ? allCars.filter((c) => c.brand === f.brand) : allCars;
  fillSelect(el.model, uniqueSorted(modelSource, "model"), "Všechny modely");
  const filters = { ...f, model: el.model.value };

  const result = applyFilters(allCars, filters).sort(SORTERS[el.sort.value]);
  el.cars.replaceChildren(...result.map(renderCar));
  el.empty.hidden = result.length > 0;
  el.count.textContent = `Nalezeno ${result.length} z ${allCars.length} vozů`;
}

function reset() {
  el.brand.value = "";
  el.model.value = "";
  el.yearMin.value = "";
  el.yearMax.value = "";
  el.priceMin.value = "";
  el.priceMax.value = "";
  el.mileage.value = el.mileage.max;
  el.sort.value = "price-asc";
  render();
}

async function init() {
  try {
    const res = await fetch("data/cars.json");
    allCars = await res.json();
  } catch (err) {
    el.count.textContent = "Nabídku se nepodařilo načíst.";
    console.error(err);
    return;
  }

  fillSelect(el.brand, uniqueSorted(allCars, "brand"), "Všechny značky");
  el.mileage.value = el.mileage.max;

  for (const input of document.querySelectorAll("input, select")) {
    input.addEventListener("input", render);
    input.addEventListener("change", render);
  }
  el.brand.addEventListener("change", () => {
    el.model.value = "";
    render();
  });
  el.reset.addEventListener("click", reset);
  render();
}

init();
