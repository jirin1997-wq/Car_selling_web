// Kontakt pro tlačítka v detailu vozu. Nahraďte skutečnými údaji.
const CONTACT = {
  phone: "+420 000 000 000",
  email: "info@example.com",
};

const el = {
  listView: document.getElementById("list-view"),
  detailView: document.getElementById("detail-view"),
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

let allCars = [];

function imageBlock(car, alt) {
  return car.image
    ? `<img src="${escapeHtml(car.image)}" alt="${escapeHtml(alt)}" loading="lazy">`
    : `<span class="car-image-placeholder" aria-hidden="true">${escapeHtml(car.brand)}</span>`;
}

function renderCar(car) {
  const article = document.createElement("article");
  article.className = "car";
  article.innerHTML = `
    <a href="#/car/${encodeURIComponent(car.id)}">
      <div class="car-image">${imageBlock(car, car.title)}</div>
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

function renderDetail(car) {
  const rows = [
    ["Rok výroby", car.year],
    ["Nájezd", `${fmtNum(car.mileage)} km`],
    ["Palivo", car.fuel],
    ["Převodovka", car.transmission],
    ["Výkon", car.power ? `${car.power} kW` : null],
    ["Objem motoru", car.engine ? `${fmtNum(car.engine)} cm³` : null],
    ["Barva", car.color],
    ["Počet majitelů", car.owners],
    ["STK", car.stk],
  ].filter(([, value]) => value !== null && value !== undefined && value !== "");

  el.detailView.innerHTML = `
    <a href="#/" class="back">← Zpět na nabídku</a>

    <div class="detail-grid">
      <div class="detail-media">
        <div class="detail-image">${imageBlock(car, car.title)}</div>
      </div>

      <div class="detail-info">
        <p class="car-brand">${escapeHtml(car.brand)}</p>
        <h1>${escapeHtml(car.title)}</h1>
        <p class="detail-price">${fmtPrice(car.price)}</p>

        <dl class="facts">
          ${rows.map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
        </dl>

        ${car.description ? `<p class="description">${escapeHtml(car.description)}</p>` : ""}

        <div class="actions">
          <a class="btn btn-primary" href="tel:${escapeHtml(CONTACT.phone.replace(/\s/g, ""))}">Zavolat</a>
          <a class="btn" href="mailto:${escapeHtml(CONTACT.email)}?subject=${encodeURIComponent(car.title)}">Napsat e-mail</a>
          <a class="btn btn-link" href="${escapeHtml(car.url)}" target="_blank" rel="noopener">Původní inzerát</a>
        </div>
      </div>
    </div>`;
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

function renderList() {
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

function route() {
  const match = location.hash.match(/^#\/car\/(.+)$/);
  const car = match ? allCars.find((c) => c.id === decodeURIComponent(match[1])) : null;

  if (car) {
    renderDetail(car);
    el.listView.hidden = true;
    el.detailView.hidden = false;
    el.count.textContent = "";
    document.title = `${car.title} · Prodej aut`;
    window.scrollTo(0, 0);
  } else {
    el.listView.hidden = false;
    el.detailView.hidden = true;
    el.detailView.replaceChildren();
    document.title = "Prodej aut";
    renderList();
  }
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
  renderList();
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

  for (const input of el.listView.querySelectorAll("input, select")) {
    input.addEventListener("input", renderList);
    input.addEventListener("change", renderList);
  }
  el.brand.addEventListener("change", () => {
    el.model.value = "";
    renderList();
  });
  el.reset.addEventListener("click", reset);
  window.addEventListener("hashchange", route);
  route();
}

init();
