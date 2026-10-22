// Kontakt pro tlačítka v detailu vozu. Nahraďte skutečnými údaji.
const CONTACT = {
  phone: "+420 000 000 000",
  email: "info@example.com",
};

const FAV_KEY = "favorites";
const MAX_MILEAGE = 300000;

const $ = (id) => document.getElementById(id);

const el = {
  listView: $("list-view"),
  detailView: $("detail-view"),
  filters: $("filters"),
  scrim: $("scrim"),
  filtersToggle: $("filters-toggle"),
  filtersClose: $("filters-close"),
  filtersApply: $("filters-apply"),
  filterBadge: $("filter-badge"),
  cars: $("cars"),
  empty: $("empty"),
  emptyReset: $("empty-reset"),
  count: $("count"),
  chips: $("chips"),
  search: $("search"),
  brand: $("brand"),
  model: $("model"),
  yearMin: $("year-min"),
  yearMax: $("year-max"),
  yearOut: $("year-out"),
  priceMin: $("price-min"),
  priceMax: $("price-max"),
  priceOut: $("price-out"),
  mileage: $("mileage"),
  mileageOut: $("mileage-out"),
  sort: $("sort"),
  favOnly: $("fav-only"),
  favCount: $("fav-count"),
  reset: $("reset"),
};

const fmtPrice = (czk) =>
  new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(czk);
const fmtNum = (n) => n.toLocaleString("cs-CZ");

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const SORTERS = {
  "price-asc": (a, b) => a.price - b.price,
  "price-desc": (a, b) => b.price - a.price,
  "year-desc": (a, b) => b.year - a.year,
  "mileage-asc": (a, b) => a.mileage - b.mileage,
};

const HEART = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-4.35-9.5-8.5C.9 9.6 2.3 5.5 6.2 5.1 8.4 4.9 10.6 6 12 7.8 13.4 6 15.6 4.9 17.8 5.1c3.9.4 5.3 4.5 3.7 7.4C19 16.65 12 21 12 21z"/></svg>`;

let allCars = [];
let currentId = null;
let favOnly = false;

// Oblíbené drží jen tento prohlížeč. Při chybě úložiště se tiše použije prázdný seznam.
function loadFavorites() {
  try {
    return new Set(JSON.parse(localStorage.getItem(FAV_KEY)) ?? []);
  } catch {
    return new Set();
  }
}

function saveFavorites() {
  try {
    localStorage.setItem(FAV_KEY, JSON.stringify([...favorites]));
  } catch {
    /* úložiště není dostupné, oblíbené zůstanou jen do obnovení stránky */
  }
}

const favorites = loadFavorites();

function favButton(car) {
  const on = favorites.has(car.id);
  return `<button type="button" class="fav${on ? " is-on" : ""}" data-fav="${escapeHtml(car.id)}"
    aria-pressed="${on}" aria-label="${on ? "Odebrat z oblíbených" : "Přidat do oblíbených"}">${HEART}</button>`;
}

function imageBlock(car) {
  return car.image
    ? `<img src="${escapeHtml(car.image)}" alt="${escapeHtml(car.title)}" loading="lazy">`
    : `<span class="car-image-placeholder" aria-hidden="true">${escapeHtml(car.brand)}</span>`;
}

function renderCar(car) {
  const article = document.createElement("article");
  article.className = "car";
  article.innerHTML = `
    ${favButton(car)}
    <a class="car-link" href="#/car/${encodeURIComponent(car.id)}">
      <div class="car-image">${imageBlock(car)}</div>
      <div class="car-body">
        <p class="car-brand">${escapeHtml(car.brand)}</p>
        <h2>${escapeHtml(car.title)}</h2>
        <p class="price">${fmtPrice(car.price)}</p>
        <dl class="specs">
          <div><dt>Rok</dt><dd>${escapeHtml(car.year)}</dd></div>
          <div><dt>Nájezd</dt><dd>${fmtNum(car.mileage)} km</dd></div>
          <div><dt>Palivo</dt><dd>${escapeHtml(car.fuel)}</dd></div>
          <div><dt>Převodovka</dt><dd>${escapeHtml(car.transmission)}</dd></div>
        </dl>
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
    <nav class="crumbs" aria-label="Drobečková navigace">
      <a href="#/">Nabídka</a>
      <span aria-hidden="true">/</span>
      <span>${escapeHtml(car.brand)}</span>
    </nav>

    <div class="detail-grid">
      <div class="detail-image">${imageBlock(car)}</div>

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
          <a class="btn btn-outline" href="mailto:${escapeHtml(CONTACT.email)}?subject=${encodeURIComponent(car.title)}">E-mail</a>
          ${favButton(car).replace('class="fav', 'class="fav fav-labeled')}
        </div>
        <a class="source-link" href="${escapeHtml(car.url)}" target="_blank" rel="noopener">Původní inzerát ↗</a>
      </div>
    </div>`;
}

// Rozsahy posuvníků se odvozují z dat. Krajní hodnota znamená "bez omezení".
const bounds = { yearMin: 0, yearMax: 0, priceMin: 0, priceMax: 0 };

function setupRange(minEl, maxEl, b) {
  minEl.min = maxEl.min = b.min;
  minEl.max = maxEl.max = b.max;
  minEl.step = maxEl.step = b.step;
  minEl.value = b.min;
  maxEl.value = b.max;
}

// Posuvník drží obě rukojeti v pořadí a vybarvuje rozsah mezi nimi.
function syncRange(minEl, maxEl, outEl, format) {
  let lo = Number(minEl.value);
  let hi = Number(maxEl.value);
  if (lo > hi) {
    if (document.activeElement === minEl) hi = lo;
    else lo = hi;
    minEl.value = lo;
    maxEl.value = hi;
  }
  const min = Number(minEl.min);
  const span = Number(minEl.max) - min || 1;
  const wrap = minEl.parentElement;
  wrap.style.setProperty("--from", `${((lo - min) / span) * 100}%`);
  wrap.style.setProperty("--to", `${((hi - min) / span) * 100}%`);
  outEl.textContent = format(lo, hi);
}

function rangeValues(minEl, maxEl) {
  const lo = Number(minEl.value);
  const hi = Number(maxEl.value);
  return {
    min: lo <= Number(minEl.min) ? null : lo,
    max: hi >= Number(maxEl.max) ? null : hi,
  };
}

function currentFilters() {
  const year = rangeValues(el.yearMin, el.yearMax);
  const price = rangeValues(el.priceMin, el.priceMax);
  return {
    search: el.search.value.trim().toLowerCase(),
    brand: el.brand.value,
    model: el.model.value,
    yearMin: year.min,
    yearMax: year.max,
    priceMin: price.min,
    priceMax: price.max,
    mileageMax: Number(el.mileage.value),
  };
}

function applyFilters(cars, f) {
  return cars.filter((car) => {
    if (favOnly && !favorites.has(car.id)) return false;
    if (f.search && !`${car.brand} ${car.model} ${car.title}`.toLowerCase().includes(f.search)) return false;
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
  select.replaceChildren(new Option(allLabel, ""), ...values.map((v) => new Option(v, v)));
  select.value = values.includes(current) ? current : "";
}

function uniqueSorted(cars, key) {
  return [...new Set(cars.map((c) => c[key]).filter(Boolean))].sort((a, b) => a.localeCompare(b, "cs"));
}

// Zobrazí aktivní filtry jako odstranitelné štítky.
function renderChips(f) {
  const chips = [];
  if (f.search) chips.push(["search", `Hledání: ${f.search}`]);
  if (f.brand) chips.push(["brand", f.brand]);
  if (f.model) chips.push(["model", f.model]);
  if (f.yearMin !== null || f.yearMax !== null) {
    chips.push(["year", `Rok ${f.yearMin ?? "…"}–${f.yearMax ?? "…"}`]);
  }
  if (f.priceMin !== null || f.priceMax !== null) {
    chips.push(["price", `Cena ${f.priceMin ? fmtNum(f.priceMin) : "…"}–${f.priceMax ? fmtNum(f.priceMax) : "…"} Kč`]);
  }
  if (f.mileageMax < MAX_MILEAGE) chips.push(["mileage", `Nájezd do ${fmtNum(f.mileageMax)} km`]);
  if (favOnly) chips.push(["fav", "Jen oblíbené"]);

  el.chips.replaceChildren(
    ...chips.map(([key, label]) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.dataset.clear = key;
      chip.innerHTML = `${escapeHtml(label)} <span aria-hidden="true">✕</span><span class="sr-only">Odebrat filtr</span>`;
      return chip;
    }),
  );
  el.chips.hidden = chips.length === 0;

  const activeGroups = [
    f.search,
    f.brand,
    f.model,
    f.yearMin !== null || f.yearMax !== null,
    f.priceMin !== null || f.priceMax !== null,
    f.mileageMax < MAX_MILEAGE,
  ].filter(Boolean).length;
  el.filterBadge.textContent = activeGroups;
  el.filterBadge.hidden = activeGroups === 0;
}

function renderList() {
  const f = currentFilters();
  el.mileageOut.textContent = fmtNum(f.mileageMax);
  syncRange(el.yearMin, el.yearMax, el.yearOut, (lo, hi) => `${lo} – ${hi}`);
  syncRange(el.priceMin, el.priceMax, el.priceOut, (lo, hi) => `${fmtNum(lo)} – ${fmtNum(hi)} Kč`);

  // Model nabízíme jen z vybrané značky.
  const modelSource = f.brand ? allCars.filter((c) => c.brand === f.brand) : allCars;
  fillSelect(el.model, uniqueSorted(modelSource, "model"), "Všechny modely");
  const filters = { ...f, model: el.model.value };

  const result = applyFilters(allCars, filters).sort(SORTERS[el.sort.value]);
  el.cars.replaceChildren(...result.map(renderCar));
  el.empty.hidden = result.length > 0;
  el.favCount.textContent = favorites.size ? `(${favorites.size})` : "";
  el.favOnly.setAttribute("aria-pressed", String(favOnly));
  el.favOnly.classList.toggle("is-active", favOnly);

  if (result.length) {
    const min = Math.min(...result.map((c) => c.price));
    el.count.textContent = `${result.length} z ${allCars.length} vozů · od ${fmtPrice(min)}`;
  } else {
    el.count.textContent = `0 z ${allCars.length} vozů`;
  }

  renderChips(f);
}

function setFiltersOpen(open) {
  el.filters.classList.toggle("is-open", open);
  el.scrim.hidden = !open;
  el.filtersToggle.setAttribute("aria-expanded", String(open));
}

function resetRanges() {
  setupRange(el.yearMin, el.yearMax, { min: bounds.yearMin, max: bounds.yearMax, step: 1 });
  setupRange(el.priceMin, el.priceMax, { min: bounds.priceMin, max: bounds.priceMax, step: 10000 });
}

function clearFilter(key) {
  switch (key) {
    case "search": el.search.value = ""; break;
    case "brand": el.brand.value = ""; el.model.value = ""; break;
    case "model": el.model.value = ""; break;
    case "year": resetRanges(); break;
    case "price": resetRanges(); break;
    case "mileage": el.mileage.value = MAX_MILEAGE; break;
    case "fav": favOnly = false; break;
  }
  renderList();
}

function resetAll() {
  el.search.value = "";
  el.brand.value = "";
  el.model.value = "";
  resetRanges();
  el.mileage.value = MAX_MILEAGE;
  el.sort.value = "price-asc";
  favOnly = false;
  renderList();
}

function route() {
  const match = location.hash.match(/^#\/car\/(.+)$/);
  const car = match ? allCars.find((c) => c.id === decodeURIComponent(match[1])) : null;

  setFiltersOpen(false);

  if (car) {
    currentId = car.id;
    renderDetail(car);
    el.listView.hidden = true;
    el.detailView.hidden = false;
    document.title = `${car.title} · Ojeté vozy`;
    window.scrollTo(0, 0);
  } else {
    currentId = null;
    el.listView.hidden = false;
    el.detailView.hidden = true;
    el.detailView.replaceChildren();
    document.title = "Ojeté vozy";
    renderList();
  }
}

function refresh() {
  if (currentId) {
    const car = allCars.find((c) => c.id === currentId);
    if (car) renderDetail(car);
  } else {
    renderList();
  }
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

  const years = allCars.map((c) => c.year);
  const prices = allCars.map((c) => c.price);
  bounds.yearMin = Math.min(...years);
  bounds.yearMax = Math.max(...years);
  bounds.priceMin = Math.floor(Math.min(...prices) / 10000) * 10000;
  bounds.priceMax = Math.ceil(Math.max(...prices) / 10000) * 10000;
  resetRanges();

  fillSelect(el.brand, uniqueSorted(allCars, "brand"), "Všechny značky");
  el.mileage.value = MAX_MILEAGE;

  for (const input of el.listView.querySelectorAll("input, select")) {
    input.addEventListener("input", renderList);
    input.addEventListener("change", renderList);
  }
  el.brand.addEventListener("change", () => {
    el.model.value = "";
    renderList();
  });

  el.reset.addEventListener("click", resetAll);
  el.emptyReset.addEventListener("click", resetAll);
  el.favOnly.addEventListener("click", () => {
    favOnly = !favOnly;
    renderList();
  });
  el.chips.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-clear]");
    if (chip) clearFilter(chip.dataset.clear);
  });

  el.filtersToggle.addEventListener("click", () => setFiltersOpen(!el.filters.classList.contains("is-open")));
  el.filtersClose.addEventListener("click", () => setFiltersOpen(false));
  el.filtersApply.addEventListener("click", () => setFiltersOpen(false));
  el.scrim.addEventListener("click", () => setFiltersOpen(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setFiltersOpen(false);
  });

  // Oblíbené přepínáme delegací, funguje v seznamu i v detailu.
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-fav]");
    if (!btn) return;
    e.preventDefault();
    const id = btn.dataset.fav;
    favorites.has(id) ? favorites.delete(id) : favorites.add(id);
    saveFavorites();
    refresh();
  });

  window.addEventListener("hashchange", route);
  route();
}

init();
