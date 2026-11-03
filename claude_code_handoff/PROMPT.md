Jag flyttar min app Visual Notebook hit från en visuell prototypmiljö. Läs README.md i den här mappen först. Den beskriver arkitektur, Supabase-synk och vad som måste bevaras.

Mål:
1. Sätt upp ett Vite + React-projekt i mitt GitHub-repo som bygger till statiska filer för GitHub Pages, med en GitHub Actions-workflow för deploy.
2. Porta source/Visual Notebook.dc.html till vanliga React-komponenter. Mallen blir JSX och logikklassen blir komponentlogik. Beteende och utseende ska vara identiska med source/index.html. Behåll inline-styles i första steget och gör ingen redesign. support.js ska inte följa med, den är bara runtime för det gamla formatet.
3. Dela upp koden i moduler: datamodell/lagring, Supabase-synk, layoutmotorer (mind map, radial, random, spacing), pilgeometri/tunnlar, export (PDF/Word/HTML), delning/läsvy, AI-import och UI-komponenter.
4. Lägg till tester (Vitest) för ren logik: layoutmotorer, pilgeometri, packShare/unpackShare, synkens merge och wordcount.
5. Ändra INTE Supabase-schema, nycklar, localStorage-nyckelnamn eller #view=-formatet. Befintlig data och gamla delningslänkar måste fungera.

Arbeta stegvis. Gör först en plan och visa den, porta sedan och verifiera mot index.html innan du refaktorerar vidare. Committa efter varje fungerande steg.