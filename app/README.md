# Visual Notebook (Vite + React)

Portad från `claude_code_handoff/source/Visual Notebook.dc.html`. Beteende och
utseende är desamma som i den driftsatta `index.html` (se *Verifiering* nedan).

## Kommandon

Kör i mappen `app/` (Node 22.12 eller senare; krävs av Vitest och supabase-js):

```bash
npm ci
```

```bash
npm run dev       # utvecklingsserver
npm test          # Vitest
npm run lint      # ESLint (odefinierade namn, saknade importer m.m.)
npm run build     # statiska filer i dist/
npm run verify    # jämför dist/ med den driftsatta index.html (kräver Playwright i miljön)
```

## Driftsättning (GitHub Pages)

`.github/workflows/deploy.yml` bygger och testar vid varje push och pull request,
och publicerar `app/dist` när `main` uppdateras.

Live-sajten serveras i dag från `index.html` i repo-roten ("Deploy from a branch").
För att byta till det nya bygget:

1. Settings → Pages → Build and deployment → Source: **GitHub Actions**.
2. Kör workflowen (push till `main`, eller Actions → "Build and deploy to GitHub Pages" → Run workflow).

Adressen ändras inte, så Supabase (Authentication → URL Configuration) behöver
inte ändras. `index.html` i roten kan ligga kvar som reserv tills du vill ta bort den.

## Struktur (`src/`)

| Mapp | Innehåll |
| --- | --- |
| `model/` | localStorage-nycklar och konstanter, datamodell (`pagesOf`, `blankMap`, kategorier), `countWords` |
| `sync/` | Supabase-klient och inloggning (`syncMethods.js`), merge-regler som rena funktioner (`merge.js`) |
| `layout/` | Tidy: `mindmap.js` (båda sidor / höger / nedåt), `radial.js`, `creative.js` (slumpform med seed), `snap.js` (justering och lika avstånd), `forest.js`, `order.js`, `treeInfo.js`, `tidy.js` |
| `geometry/` | Pilrouting och tunnlar (`route.js`), cache per pil (`edgeMethods.js`) |
| `export/` | Word (`docHtml.js`, `word.js`), PDF (`docBlocks.js`, `pdf.js`), HTML, backup |
| `share/` | `#view=`-koder (`packShare.js`), läsvyn (`viewerHtml.js`), `mapViewData` |
| `ai/` | AI-import: instruktioner (`spec.js`), tolkning (`parse.js`), kartbygge (`buildMap.js`) |
| `text/` | Markdown/rich text, `[[box]]`-länkar, referenser (DOI/PubMed, Vancouver), editor → markdown |
| `editor/` | Anteckningseditorn i boxdialogen (contentEditable, listor, bilder, citat, `/`-länkar) |
| `ui/` | React-komponenter: `App`, `Sidebar`, `Canvas`, `Toolbar`, `BoxDialog`, `ArrowPanel`, … |
| `logic/` | `NotebookLogic` (tillstånd, historik, redigering, vy-modellen `renderVals`) och `DCLogic` |
| `styles/` | Global CSS, hover/focus-klasser, Karla-typsnitten (samma filer som `index.html` bäddar in) |

`NotebookLogic` är logikklassen från `.dc.html`. Funktionsområdena ligger i egna
moduler och blandas in i klassen. `LogicHost` ger den samma livscykel som den
gamla runtimen (synkron `this.state`, `setState`, `forceUpdate`). Inline-stilarna
är kvar som i originalet.

## Oförändrat

- Supabase-projekt, nyckel och tabellen `notebook_items` (`user_id`, `key`, `value`, `updated_at`).
- Alla localStorage-nycklar: `visual-notebook.*`, `vn-sync.meta`, `vn.textScale`
  (per enhet, synkas inte), `vn.tunnels`, `vn.xlinkMode`, `vn.viewer.panel`.
- `#view=`-formatet: `"z" + base64url(deflate(JSON))`. Ett test öppnar en kod som
  skapats av den driftsatta appen.
- Samma versioner som i dag: React 18.3.1 och `@supabase/supabase-js` 2.118.0.
  PDF-exporten laddar jsPDF 2.5.1 från cdnjs vid behov, precis som tidigare.

## Verifiering

`tools/verify/compare.mjs` laddar den driftsatta `index.html` och `dist/` sida vid
sida i Chromium med samma data, fryst klocka och seedad slump. Den jämför DOM och
skärmbilder i ett 40-tal scenarier (menyer, dialoger, alla Tidy-lägen, dra och
snappa, AI-import, mobilbredd, mörkt läge, välkomstskärm). Den jämför också
exportfiler byte för byte, `#view=`-länkar åt båda hållen och synken mot ett
simulerat Supabase-API (samma anrop, samma localStorage).
