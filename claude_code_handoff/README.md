# Visual Notebook – överlämning till Claude Code

## Vad det är
Visual Notebook är en webbapp för visuella anteckningar. Den har mindmaps med rutor, pilar, färgade ramar, kategorier, flikar med anteckningar, bilder, referenser och länkade kopior. Den har också AI-import (JSON), fyra layoutmotorer, export (PDF, Word, HTML) och delning via read-only-länkar.

Appen är **i drift idag**. Den hostas på GitHub Pages och synkar via Supabase. Den här koden är inte en mockup. Den är fungerande produktionskod och ska flyttas med samma beteende.

## Filer i paketet
- `source/Visual Notebook.dc.html` är källkoden. Den har två delar:
  - En HTML-mall mellan `<x-dc>` och `</x-dc>`. Den har `{{ path }}`-hål, `<sc-for list as>`, `<sc-if value>` och inline-styles. Pseudo-states skrivs som `style-hover` och liknande.
  - En logikklass: `class Component extends DCLogic` i `<script type="text/x-dc">`. Den fungerar som en React-klasskomponent. `renderVals()` returnerar alla värden och handlers som mallen använder.
- `source/support.js` är runtimen som tolkar formatet ovan i webbläsaren, med React. Den används bara av .dc.html-formatet.
- `source/index.html` är den färdigbyggda, självständiga filen som ligger på GitHub Pages i dag. Den är referensen för hur appen ska bete sig.

## Backend (Supabase), oförändrad
- Supabase-URL och publishable key finns som konstanter överst i logikklassen (`SB_URL`, `SB_KEY`).
- Auth sker med e-post och lösenord: `signUp`, `signInWithPassword` och `resetPasswordForEmail`, med implicit flow och `detectSessionInUrl`.
- Tabellen `notebook_items` har kolumnerna `user_id`, `key`, `value` (text, JSON) och `updated_at` (ms). Den har en unik nyckel på `(user_id, key)`.
- Synkmodell: localStorage fungerar som lokal cache. Alla nycklar som börjar med `visual-notebook.` speglas som rader. Ändrade nycklar markeras i `vn-sync.meta` och pushas med fördröjning (`pushDirty`). Vid start och fokus hämtas allt (`pull`) och jämförs mot `updated_at`.
- Viktiga nycklar:
  - `visual-notebook.index`: kartlista och mappar.
  - `visual-notebook.map.<id>`: en karta (nodes, edges, frames).
  - `visual-notebook.cats`: kategorier.
  - Diverse UI-inställningar.
  - Textstorleken (`Box text`) är lagrad **per enhet** och ska inte synkas.

## Delning
Läsvyn skapas av `mapViewData()` och `viewerHtml()`. Kartdata komprimeras (`packShare`, CompressionStream) och läggs i URL-hashen `#view=<kod>`. Vid laddning anropar appen `openShared(code)`, som skriver ut en fristående läsvy. Inget sparas på servern.

## Måste bevaras
1. Supabase-projekt, tabellschema och samtliga localStorage-nyckelnamn. Befintliga användares data måste synka direkt.
2. Formatet `#view=`, så att redan delade länkar fungerar.
3. Appens adress. Om den byts måste den nya adressen läggas till under Supabase → Authentication → URL Configuration (Site URL och Redirect URLs).
4. Exakt utseende och beteende enligt `index.html`.
