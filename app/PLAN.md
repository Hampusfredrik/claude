# Plan: Visual Notebook → Vite + React

Källa: `claude_code_handoff/source/Visual Notebook.dc.html` (mall + logikklass).
Referens för beteende och utseende: `claude_code_handoff/source/index.html`
(samma fil som ligger i repo-roten och är live på GitHub Pages i dag).

Jag har kontrollerat att logikklassen i `.dc.html` är tecken-för-tecken identisk
med den som är inbakad i `index.html`, och att mallen bara skiljer sig i hur
attributnamn kodas. Källan och den driftsatta filen motsvarar alltså varandra.

## Viktigt om driftsättningen

- Live-sajten serveras i dag från `index.html` i repo-roten. Den filen rörs inte.
  Vite-projektet ligger i `app/`, så en merge till `main` ändrar ingenting
  på den publika sajten.
- GitHub Actions-workflowen (`.github/workflows/deploy.yml`) bygger `app/` och
  publicerar `app/dist` med GitHub Pages "GitHub Actions"-källa. Den nya
  versionen går live först när du byter källa under
  Settings → Pages → Build and deployment → Source: **GitHub Actions**.
  Adressen är densamma (`https://<användare>.github.io/<repo>/`), så
  Supabase-inställningarna (Site URL / Redirect URLs) behöver inte ändras.
- `base: './'` i Vite, så bygget fungerar på vilken sökväg som helst.

## Steg

1. **Skelett.** Vite + React 18.3.1 (samma version som i dag) i `app/`,
   `@supabase/supabase-js` 2.118.0 (samma version som är inbakad i dag),
   Vitest, GitHub Actions-workflow för bygg, test och deploy.
2. **Port, ingen refaktor.** Mallen omvandlas mekaniskt till JSX med ett
   engångsskript (`app/tools/port/`). Skriptet låter webbläsaren tolka mallen
   exakt som runtimen gjorde och genererar JSX som ger samma React-träd:
   - `{{ x }}` i text → `<span>` (som runtimen), i attribut → värdet.
   - `<sc-if>` → villkor, `<sc-for>` → `.map` med index-nycklar.
   - `style="…"` → inline-stilobjekt (samma `cssToObj`-tolkning).
   - `style-hover` / `style-focus` → genererade CSS-klasser med `!important`,
     samma namn (`scp0`, `scp1`, …) och ordning som runtimen.
   Logikklassen flyttas oförändrad till en modul. En liten värdkomponent ger den
   samma livscykel som `DCLogic` (synkron `this.state`, `setState`, `forceUpdate`,
   `componentDidMount/DidUpdate/WillUnmount`). `support.js` följer inte med.
3. **Verifiering mot `index.html`.** Playwright-skript som laddar gamla
   `index.html` och nya bygget med samma localStorage-data och jämför:
   normaliserad DOM och skärmbilder i flera tillstånd (start, sidomeny,
   menyer, modal, vald pil, Tidy-lägen, mobilbredd, mörkt läge), plus
   delningslänkar åt båda hållen (`#view=` skapad i gamla öppnas i nya och tvärtom).
4. **Modularisering** (en modul i taget, verifiering efter varje):
   - `model/` – konstanter, localStorage-nycklar, datamodell, wordcount
   - `sync/` – Supabase-klient, push/pull, ren merge-funktion
   - `layout/` – mind map (both/right/down), radial, random (creative), spacing, snap
   - `geometry/` – pilrouting, tunnlar
   - `export/` – PDF, Word, HTML, backup
   - `share/` – `packShare`/`unpackShare`, läsvy (`mapViewData`, `viewerHtml`)
   - `ai/` – AI-import
   - `text/` – markdown/rich text, editor-serialisering, referenser
   - `ui/` – React-komponenter (Sidebar, Toolbar, Canvas, NodeModal, …)
5. **Tester (Vitest)** för ren logik: layoutmotorer, pilgeometri,
   `packShare`/`unpackShare` (inkl. en låst kod så att gamla länkar fortsätter
   att fungera), synkens merge och wordcount.

## Får inte ändras

Supabase-URL/nyckel, tabellen `notebook_items`, alla localStorage-nycklar
(`visual-notebook.*`, `vn-sync.meta`, `vn.textScale`, `vn.tunnels`,
`vn.xlinkMode`, `vn.viewer.panel`), formatet `#view=z<base64url(deflate(JSON))>`.

Varje fungerande steg committas för sig.

## Status

Alla steg är genomförda (se commit-historiken på grenen):

- [x] 1. Skelett, workflow
- [x] 2. Port (mall → JSX, logikklass → modul, `support.js` används inte)
- [x] 3. Verifiering mot `index.html` (`npm run verify`)
- [x] 4. Modularisering (model, sync, layout, geometry, export, share, ai, text, editor, ui)
- [x] 5. Vitest för layout, pilgeometri, `packShare`/`unpackShare`, synkens merge, wordcount
