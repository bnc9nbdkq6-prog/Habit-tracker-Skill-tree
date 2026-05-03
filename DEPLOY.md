# Oskar App — Deployment Gids
## Van bestanden naar werkende app in ~20 minuten

---

## STAP 1 — Supabase instellen (5 min)

1. Ga naar https://supabase.com en maak een gratis account aan
2. Klik "New project"
   - Naam: oskar-app
   - Database password: kies een sterk wachtwoord (sla dit op)
   - Regio: kies Europe (Frankfurt)
3. Wacht tot het project klaar is (~2 min)
4. Ga naar **SQL Editor** (linker menu) → klik "New query"
5. Kopieer de volledige inhoud van `supabase/schema.sql` en plak het in de editor
6. Klik **Run** — je ziet "Success"

### Jouw Supabase-sleutels ophalen:
- Ga naar **Settings** → **API**
- Kopieer **Project URL** (begint met https://...)
- Kopieer **anon public** key

---

## STAP 2 — GitHub repository (3 min)

1. Ga naar https://github.com en maak een nieuw repository aan
   - Naam: oskar-app
   - Visibility: Private
2. Upload alle projectbestanden naar dit repository
   (Je kunt dit doen via de GitHub website: "Add file" → "Upload files")

**Bestanden die je uploadt:**
```
package.json
next.config.js
.env.example         ← hernoem naar .env.local en vul in
pages/
  _app.jsx
  index.jsx
components/
  LoginPage.jsx
lib/
  supabase.js
AppCore.jsx
supabase/
  schema.sql
```

---

## STAP 3 — .env.local aanmaken

Maak een bestand `.env.local` (niet uploaden naar GitHub!) met:

```
NEXT_PUBLIC_SUPABASE_URL=https://jouw-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=jouw-anon-key-hier
```

Vul in wat je in stap 1 hebt gekopieerd.

---

## STAP 4 — Vercel deployen (5 min)

1. Ga naar https://vercel.com en maak een account aan (gratis)
2. Klik **"Add New Project"**
3. Koppel je GitHub account als je dat nog niet hebt gedaan
4. Kies je `oskar-app` repository
5. Klik **Import**

### Environment Variables instellen in Vercel:
- Klik **"Environment Variables"** voor je deployt
- Voeg toe:
  - `NEXT_PUBLIC_SUPABASE_URL` = jouw Supabase URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = jouw anon key
- Klik **Deploy**

6. Vercel bouwt de app (~2 min)
7. Je krijgt een URL zoals `oskar-app.vercel.app`

---

## STAP 5 — Eerste keer inloggen

1. Ga naar jouw Vercel URL
2. Klik **"Nog geen account? Aanmaken"**
3. Vul je e-mailadres en wachtwoord in
4. Check je e-mail voor de bevestigingslink (verplicht door Supabase)
5. Klik de link in de e-mail
6. Log in op de app

**Op je telefoon:**
- Open dezelfde URL in Safari of Chrome
- Log in met hetzelfde account
- Alle taken synchroniseren automatisch

---

## Troubleshooting

**"Error: supabaseUrl is required"**
→ Je .env.local of Vercel environment variables zijn niet ingevuld

**"Invalid API key"**
→ Je hebt de verkeerde key gekopieerd — gebruik de **anon public** key, niet de service_role key

**E-mail bevestiging komt niet aan**
→ Check spam. Of ga in Supabase naar Authentication → Email Templates en zet "Confirm email" uit voor ontwikkeling.

**App laadt maar data verschijnt niet**
→ Check of de SQL in stap 1 goed is uitgevoerd. Ga in Supabase naar **Table Editor** — je moet de tabellen `tasks`, `projects` etc. zien.

---

## Na de eerste deploy

Elke keer dat je de app wilt updaten:
1. Vervang `AppCore.jsx` met de nieuwste versie
2. Push naar GitHub
3. Vercel deployt automatisch binnen ~1 minuut

---

## Wat synchroniseert

✓ Alle taken (aanmaken, afvinken, bewerken, verwijderen)
✓ Alle projecten (aanmaken, kleuren, bewerken)
✓ Wijzigingen zichtbaar op alle ingelogde apparaten binnen ~2 seconden

Skill Tree en Habit Tracker data wordt voorlopig lokaal opgeslagen via localStorage
(per apparaat). Dit kan later ook naar Supabase worden overgezet.
