const SETTINGS_SHEET = "settings";
const DECKS_SHEET = "decks";
const VOCABULARY_SHEET = "vocabulary";
const WRITING_SHEET = "writing";
const TOKEN_CELL = "B2";

function doGet(event) {
  const action = event.parameter.action || "list";
  const token = event.parameter.token || "";

  if (!isAuthorized(token)) {
    return jsonResponse({ ok: false, error: "Unauthorized" });
  }

  if (action === "list") {
    return jsonResponse({ ok: true, decks: readDecks(), writingItems: readWritingItems() });
  }

  return jsonResponse({ ok: false, error: "Unknown action" });
}

function doPost(event) {
  const payload = JSON.parse(event.postData.contents || "{}");

  if (!isAuthorized(payload.token || "")) {
    return jsonResponse({ ok: false, error: "Unauthorized" });
  }

  if (payload.action === "saveAll") {
    writeDecks(payload.decks || []);
    if (Array.isArray(payload.writingItems)) {
      writeWritingItems(payload.writingItems);
    }
    return jsonResponse({ ok: true, decks: readDecks(), writingItems: readWritingItems() });
  }

  return jsonResponse({ ok: false, error: "Unknown action" });
}

function setup() {
  setupSettingsSheet();
  setupDecksSheet();
  setupVocabularySheet();
  setupWritingSheet();
}

function setupSettingsSheet() {
  const sheet = getOrCreateSheet(SETTINGS_SHEET);
  sheet.getRange("A1").setValue("key");
  sheet.getRange("B1").setValue("value");
  sheet.getRange("A2").setValue("api_token");
  if (!sheet.getRange(TOKEN_CELL).getValue()) {
    sheet.getRange(TOKEN_CELL).setValue(Utilities.getUuid());
  }
}

function setupDecksSheet() {
  const sheet = getOrCreateSheet(DECKS_SHEET);
  setHeader(sheet, ["id", "title", "description", "tags", "position", "updated_at"]);
}

function setupVocabularySheet() {
  const sheet = getOrCreateSheet(VOCABULARY_SHEET);
  setHeader(sheet, ["id", "deck_id", "pinyin", "meaning", "position", "updated_at"]);
}

function setupWritingSheet() {
  const sheet = getOrCreateSheet(WRITING_SHEET);
  setHeader(sheet, ["id", "pinyin", "hanzi", "meaning", "position", "updated_at"]);
}

function readDecks() {
  setup();

  const decks = readObjects(DECKS_SHEET).map((row) => ({
    id: String(row.id || ""),
    title: String(row.title || ""),
    description: String(row.description || ""),
    tags: String(row.tags || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    position: Number(row.position || 0),
    cards: []
  }));

  const deckMap = {};
  decks.forEach((deck) => {
    deckMap[deck.id] = deck;
  });

  readObjects(VOCABULARY_SHEET)
    .map((row) => ({
      id: String(row.id || ""),
      deckId: String(row.deck_id || ""),
      pinyin: String(row.pinyin || ""),
      meaning: String(row.meaning || ""),
      position: Number(row.position || 0)
    }))
    .filter((card) => card.deckId && deckMap[card.deckId] && card.pinyin && card.meaning)
    .sort((a, b) => a.position - b.position)
    .forEach((card) => {
      deckMap[card.deckId].cards.push({
        id: card.id,
        pinyin: card.pinyin,
        meaning: card.meaning
      });
    });

  return decks
    .filter((deck) => deck.id)
    .sort((a, b) => a.position - b.position)
    .map((deck) => ({
      id: deck.id,
      title: deck.title,
      description: deck.description,
      tags: deck.tags,
      cards: deck.cards
    }));
}

function writeDecks(decks) {
  setup();

  const now = new Date().toISOString();
  const deckRows = [];
  const cardRows = [];

  decks.forEach((deck, deckIndex) => {
    const deckId = String(deck.id || "");
    if (!deckId) return;

    deckRows.push([
      deckId,
      String(deck.title || ""),
      String(deck.description || ""),
      Array.isArray(deck.tags) ? deck.tags.join(", ") : String(deck.tags || ""),
      deckIndex + 1,
      now
    ]);

    (deck.cards || []).forEach((card, cardIndex) => {
      if (!card.pinyin || !card.meaning) return;
      cardRows.push([
        String(card.id || `${deckId}-card-${cardIndex + 1}`),
        deckId,
        String(card.pinyin || ""),
        String(card.meaning || ""),
        cardIndex + 1,
        now
      ]);
    });
  });

  replaceRows(DECKS_SHEET, deckRows);
  replaceRows(VOCABULARY_SHEET, cardRows);
}

function readWritingItems() {
  setup();

  return readObjects(WRITING_SHEET)
    .map((row) => ({
      id: String(row.id || ""),
      pinyin: String(row.pinyin || ""),
      hanzi: String(row.hanzi || ""),
      meaning: String(row.meaning || ""),
      position: Number(row.position || 0)
    }))
    .filter((item) => item.id && item.pinyin && item.hanzi)
    .sort((a, b) => a.position - b.position)
    .map((item) => ({
      id: item.id,
      pinyin: item.pinyin,
      hanzi: item.hanzi,
      meaning: item.meaning
    }));
}

function writeWritingItems(items) {
  setup();

  const now = new Date().toISOString();
  const rows = [];

  (items || []).forEach((item, index) => {
    if (!item.pinyin || !item.hanzi) return;
    rows.push([
      String(item.id || `writing-${index + 1}`),
      String(item.pinyin || ""),
      String(item.hanzi || ""),
      String(item.meaning || ""),
      index + 1,
      now
    ]);
  });

  replaceRows(WRITING_SHEET, rows);
}

function readObjects(sheetName) {
  const sheet = getOrCreateSheet(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0].map((header) => String(header || "").trim());
  return values.slice(1).filter(hasAnyValue).map((row) => {
    const object = {};
    headers.forEach((header, index) => {
      object[header] = row[index];
    });
    return object;
  });
}

function replaceRows(sheetName, rows) {
  const sheet = getOrCreateSheet(sheetName);
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, lastColumn).clearContent();
  }

  if (rows.length) {
    sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }
}

function setHeader(sheet, headers) {
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
}

function hasAnyValue(row) {
  return row.some((cell) => String(cell || "").trim() !== "");
}

function isAuthorized(token) {
  setup();
  const expected = String(getOrCreateSheet(SETTINGS_SHEET).getRange(TOKEN_CELL).getValue() || "");
  return expected && token === expected;
}

function getOrCreateSheet(sheetName) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  return spreadsheet.getSheetByName(sheetName) || spreadsheet.insertSheet(sheetName);
}

function jsonResponse(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
