# Car selling web

Statický web s nabídkou ojetých vozů. Data se berou ze Sauto.

## Struktura

- `public/` – statický web (HTML, CSS, JS) a `data/cars.json` s nabídkou
- `scripts/fetch-sauto.mjs` – stáhne inzeráty ze Sauto do `public/data/cars.json`

## Spuštění

Web je bez buildu, stačí statický server:

```sh
npx serve public
```

Aktualizace nabídky (vyžaduje URL API, které nebylo ověřeno):

```sh
SAUTO_API_URL="https://..." node scripts/fetch-sauto.mjs
```

## Stav

- Ukázková data v `public/data/cars.json` jsou fiktivní.
- Napojení na Sauto zatím není ověřené, endpoint i tvar odpovědi je potřeba doplnit.
