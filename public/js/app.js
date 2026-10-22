const container = document.getElementById("cars");
const empty = document.getElementById("empty");
const count = document.getElementById("count");

const formatPrice = (czk) =>
  new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(czk);

function renderCar(car) {
  const article = document.createElement("article");
  article.className = "car";
  article.innerHTML = `
    <a href="${car.url}" target="_blank" rel="noopener">
      <img src="${car.image ?? ""}" alt="${car.title}" loading="lazy">
      <div class="car-body">
        <h2>${car.title}</h2>
        <p class="price">${formatPrice(car.price)}</p>
        <ul>
          <li>${car.year} · ${car.mileage.toLocaleString("cs-CZ")} km</li>
          <li>${car.fuel} · ${car.transmission}</li>
        </ul>
      </div>
    </a>`;
  return article;
}

try {
  const res = await fetch("data/cars.json");
  const cars = await res.json();
  count.textContent = `Nabídka: ${cars.length} vozů`;
  if (cars.length === 0) {
    empty.hidden = false;
  }
  container.replaceChildren(...cars.map(renderCar));
} catch (err) {
  count.textContent = "Nabídku se nepodařilo načíst.";
  console.error(err);
}
