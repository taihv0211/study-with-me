# Google Sheets Backend

This folder contains the Apps Script backend used by the static GitHub Pages app.

Setup:

1. Create a Google Sheet.
2. Open `Extensions > Apps Script`.
3. Paste `Code.gs` into the Apps Script editor.
4. Run the `setup` function once and allow permissions.
5. Copy the generated token from sheet `settings`, cell `B2`.
6. Deploy with `Deploy > New deployment > Web app`.
7. Set access to `Anyone`.
8. Copy the Web App URL.
9. Paste the URL and token into `src/js/config.js`.

The script creates three sheets:

- `settings`: stores the API token.
- `decks`: one row per flashcard deck.
- `vocabulary`: one row per vocabulary item.
- `writing`: one row per handwriting practice item.

`vocabulary` columns:

- `id`
- `deck_id`
- `pinyin`
- `meaning`
- `position`
- `updated_at`

`writing` columns:

- `id`
- `pinyin`
- `hanzi`
- `meaning`
- `position`
- `updated_at`
