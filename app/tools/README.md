# Tools

Not part of the app build. Both scripts use the Playwright/Chromium that is
installed in the environment (`require('playwright')`), not an npm dependency.

- `port/` – one-off scripts used for the initial port (PLAN.md step 2).
  `extract-tree.mjs` parses the old `.dc.html` template in Chromium exactly like
  the old runtime did; `gen-jsx.mjs` turned that tree into JSX
  (`src/ui/Template.jsx`, since split into `src/ui/*`) and `src/styles/pseudo.css`.
- `verify/compare.mjs` – loads the deployed reference build
  (`claude_code_handoff/source/index.html`) and `dist/` side by side with the same
  data, clock and random seed, runs ~30 UI scenarios and compares normalised DOM
  and screenshots pixel by pixel, and checks that `#view=` share links made by
  either version open in both. Run `npm run build && npm run verify`.
