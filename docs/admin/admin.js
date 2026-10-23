import { SUPABASE } from "../js/config.js";

const { url, anonKey } = SUPABASE;
const SESSION_KEY = "admin-session";
const NUMERIC = ["price", "year", "mileage", "power", "engine", "owners"];
const TEXT = ["brand", "model", "title", "fuel", "transmission", "color", "stk", "description", "url"];

const $ = (id) => document.getElementById(id);
const form = $("car-form");

let session = loadSession();
let cars = [];
let editingId = null;

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const fmtPrice = (czk) =>
  new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(czk);

function loadSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

function saveSession(s) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    /* bez úložiště se po obnovení stránky přihlásíte znovu */
  }
}

async function tokenRequest(grant, body, errorText) {
  const res = await fetch(`${url}/auth/v1/token?grant_type=${grant}`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(errorText);
  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

async function accessToken() {
  if (!session) throw new Error("Nejste přihlášen.");
  if (Date.now() < session.expiresAt - 60_000) return session.accessToken;
  session = await tokenRequest(
    "refresh_token",
    { refresh_token: session.refreshToken },
    "Relace vypršela, přihlaste se znovu.",
  );
  saveSession(session);
  return session.accessToken;
}

async function api(path, { method = "GET", body, prefer } = {}) {
  const token = await accessToken();
  const res = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Chyba ${res.status}: ${await res.text()}`);
  return method === "GET" ? res.json() : null;
}

function showMessage(el, text, isError = false) {
  el.textContent = text;
  el.classList.toggle("error", isError);
}

function setLoggedIn(on) {
  $("login-view").classList.toggle("hidden", on);
  $("admin-view").classList.toggle("hidden", !on);
  $("logout").classList.toggle("hidden", !on);
}

async function loadCars() {
  cars = await api("cars?select=*&order=price.asc");
  renderRows();
}

function renderRows() {
  const rows = cars.map((car) => {
    const thumb = car.images?.[0]
      ? `<img class="thumb" src="${escapeHtml(car.images[0])}" alt="">`
      : `<span class="thumb"></span>`;
    return `
      <tr>
        <td>${thumb}</td>
        <td><strong>${escapeHtml(car.title)}</strong><br><span class="muted">${escapeHtml(car.id)}</span></td>
        <td>${fmtPrice(car.price)}</td>
        <td>${escapeHtml(car.year)}</td>
        <td><span class="pill${car.is_active ? " on" : ""}">${car.is_active ? "Na webu" : "Skryto"}</span></td>
        <td>
          <div class="actions">
            <button type="button" class="btn btn-outline" data-action="edit" data-id="${escapeHtml(car.id)}">Upravit</button>
            <button type="button" class="btn btn-outline" data-action="toggle" data-id="${escapeHtml(car.id)}">${car.is_active ? "Skrýt" : "Zobrazit"}</button>
            <button type="button" class="btn btn-outline" data-action="delete" data-id="${escapeHtml(car.id)}">Smazat</button>
          </div>
        </td>
      </tr>`;
  });
  $("car-rows").innerHTML = rows.join("") || `<tr><td colspan="6" class="muted">Zatím žádné vozy.</td></tr>`;
}

function openForm(car = null) {
  editingId = car?.id ?? null;
  form.reset();
  $("form-title").textContent = car ? `Úprava: ${car.title}` : "Nový vůz";
  form.elements.id.readOnly = Boolean(car);
  form.elements.is_active.checked = car ? car.is_active : true;

  if (car) {
    form.elements.id.value = car.id;
    for (const key of [...NUMERIC, ...TEXT]) {
      form.elements[key].value = car[key] ?? "";
    }
    form.elements.images.value = (car.images ?? []).join("\n");
  }

  showMessage($("form-msg"), "");
  $("form-card").classList.remove("hidden");
  $("form-card").scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeForm() {
  $("form-card").classList.add("hidden");
  editingId = null;
}

function readForm() {
  const data = { id: form.elements.id.value.trim() };
  for (const key of TEXT) data[key] = form.elements[key].value.trim() || null;
  for (const key of NUMERIC) {
    const raw = form.elements[key].value.trim();
    data[key] = raw === "" ? null : Number(raw);
  }
  data.title ??= `${data.brand} ${data.model}`;
  data.url ??= "";
  data.images = form.elements.images.value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  data.is_active = form.elements.is_active.checked;
  data.source = "manual";
  data.updated_at = new Date().toISOString();
  return data;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = readForm();
  if (!payload.id) return showMessage($("form-msg"), "Vyplňte ID.", true);
  if (payload.price === null || payload.year === null) {
    return showMessage($("form-msg"), "Cena a rok musí být čísla.", true);
  }

  try {
    showMessage($("form-msg"), "Ukládám…");
    await api("cars?on_conflict=id", {
      method: "POST",
      body: [payload],
      prefer: "resolution=merge-duplicates,return=minimal",
    });
    closeForm();
    showMessage($("list-msg"), "Uloženo.");
    await loadCars();
  } catch (err) {
    showMessage($("form-msg"), err.message, true);
  }
});

$("car-rows").addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const id = btn.dataset.id;
  const car = cars.find((c) => c.id === id);
  const filter = `id=eq.${encodeURIComponent(id)}`;

  try {
    if (btn.dataset.action === "edit") openForm(car);

    if (btn.dataset.action === "toggle") {
      await api(`cars?${filter}`, { method: "PATCH", body: { is_active: !car.is_active }, prefer: "return=minimal" });
      await loadCars();
    }

    if (btn.dataset.action === "delete") {
      if (!confirm(`Opravdu smazat „${car.title}“?`)) return;
      await api(`cars?${filter}`, { method: "DELETE", prefer: "return=minimal" });
      await loadCars();
    }
  } catch (err) {
    showMessage($("list-msg"), err.message, true);
  }
});

$("new-car").addEventListener("click", () => openForm());
$("cancel-form").addEventListener("click", closeForm);

$("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  showMessage($("login-msg"), "Přihlašuji…");
  try {
    session = await tokenRequest(
      "password",
      { email: $("email").value.trim(), password: $("password").value },
      "Přihlášení se nepodařilo. Zkontrolujte e-mail a heslo.",
    );
    saveSession(session);
    $("password").value = "";
    showMessage($("login-msg"), "");
    setLoggedIn(true);
    await loadCars();
  } catch (err) {
    showMessage($("login-msg"), err.message, true);
  }
});

$("logout").addEventListener("click", () => {
  session = null;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* nic k odstranění */
  }
  setLoggedIn(false);
});

if (session) {
  setLoggedIn(true);
  loadCars().catch((err) => {
    showMessage($("list-msg"), err.message, true);
    setLoggedIn(false);
  });
}
