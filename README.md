# Ojeté vozy

Statický web s nabídkou ojetých vozů. Stránka je na GitHub Pages z větve `main`, složky `docs/`.

## Struktura

- `docs/` – web: `index.html` (nabídka a detail), `admin/` (správa vozů po přihlášení)
- `docs/js/listings.js` – načítání nabídky: Google Sheets (volitelně), Supabase, záložní `docs/data/cars.json`
- `docs/js/config.js` – URL a publishable klíč Supabase
- `supabase/schema.sql` – tabulka `cars` a bucket `car-photos`
- `supabase/admin-policies.sql` – práva pro administrátorský účet
- `scripts/import-csv.mjs` – převede `data/listings.csv` na `docs/data/cars.json` a volitelně nahraje do Supabase

## Nastavení Supabase

1. V SQL Editoru spusťte `supabase/schema.sql`, potom `supabase/admin-policies.sql`.
2. V Authentication → Users vytvořte účet `vernerova.bara@gmail.com`.
3. Přihlaste se na `/admin/` a přidávejte vozy. Fotky jsou odkazy v poli `images`, oddělené novým řádkem.

## Lokální náhled

Web nemá build, stačí statický server:

```sh
npx serve docs
```

## Import z CSV

```sh
node scripts/import-csv.mjs            # jen docs/data/cars.json ze souboru data/listings.csv
```

S proměnnými `SUPABASE_URL` a `SUPABASE_SERVICE_KEY` se navíc vozy nahrají do databáze. Service_role klíč patří jen do prostředí, ne do repa.

## Poznámky

- Inzeráty z cizích serverů (Sauto, Bazoš, mobile.de, TipCars) se nestahují. Většina z nich to podmínkami zakazuje nebo nabízí jen oficiální rozhraní pro autobazary.
- Publishable klíč v `docs/js/config.js` smí jen číst aktivní vozy. Zápis chrání RLS a přihlášení.
