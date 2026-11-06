# Assignee picker

Native TypeScript/CSS fixture, no install. From workspace root run:

    node NeuralSkills/quality/saas/expert-evals/serve-fixture.mjs NeuralSkills/quality/saas/expert-evals/trials/T01/artifact 4191

Then from this directory run:

    node browser-tests.mjs

Tests use installed Puppeteer and a locally installed Chromium executable. The demo intentionally settles old queries later and ignores cancellation. See handoff.md, baseline-results.json, final-results.json and the saved desktop/narrow screenshots for evidence and limitations.
