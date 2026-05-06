const STORAGE_KEY = "study-with-me.flashcard-decks.v2";
const DATA_URL = "./data/flashcards.json";
const SHEETS_CONFIG = window.STUDY_WITH_ME_CONFIG || {};

const defaultDecks = [
  {
    id: "daily-basics",
    title: "Tiếng Trung cơ bản mỗi ngày",
    description: "Những từ đầu tiên để làm quen pinyin và nghĩa.",
    tags: ["HSK 1", "Cơ bản"],
    cards: [
      { id: "card-nihao", pinyin: "ni hao", meaning: "xin chào" },
      { id: "card-xiexie", pinyin: "xie xie", meaning: "cảm ơn" },
      { id: "card-zaijian", pinyin: "zai jian", meaning: "tạm biệt" },
      { id: "card-qing", pinyin: "qing", meaning: "mời / xin vui lòng" },
      { id: "card-duibuqi", pinyin: "dui bu qi", meaning: "xin lỗi" }
    ]
  }
];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeDeck(deck) {
  return {
    id: deck.id || createId("deck"),
    title: deck.title?.trim() || "Bộ flashcards chưa đặt tên",
    description: deck.description?.trim() || "",
    tags: Array.isArray(deck.tags)
      ? deck.tags.map((tag) => String(tag).trim()).filter(Boolean)
      : String(deck.tags || "")
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
    cards: Array.isArray(deck.cards)
      ? deck.cards
          .map((card) => ({
            id: card.id || createId("card"),
            pinyin: String(card.pinyin || card.term || "").trim(),
            meaning: String(card.meaning || "").trim()
          }))
          .filter((card) => card.pinyin && card.meaning)
      : []
  };
}

function createFlashcardStore() {
  let decks = loadDecks();
  let loadedFromStorage = Boolean(readStorage());
  let syncStatus = "local";

  function hasSheetsBackend() {
    return Boolean(SHEETS_CONFIG.googleSheetsWebAppUrl && SHEETS_CONFIG.apiToken);
  }

  function sheetsUrl(action) {
    const url = new URL(SHEETS_CONFIG.googleSheetsWebAppUrl);
    url.searchParams.set("action", action);
    url.searchParams.set("token", SHEETS_CONFIG.apiToken);
    return url.toString();
  }

  async function loadFromSheets() {
    const response = await fetch(sheetsUrl("list"), { cache: "no-store" });
    const payload = await response.json();
    if (!payload.ok) {
      throw new Error(payload.error || "Không tải được Google Sheets.");
    }
    if (!Array.isArray(payload.decks)) {
      throw new Error("Google Sheets trả về dữ liệu không đúng format.");
    }
    decks = payload.decks.map(normalizeDeck);
    persistLocal();
    syncStatus = "google-sheets";
  }

  async function persistSheets() {
    if (!hasSheetsBackend()) {
      persistLocal();
      return;
    }

    const response = await fetch(SHEETS_CONFIG.googleSheetsWebAppUrl, {
      method: "POST",
      body: JSON.stringify({
        action: "saveAll",
        token: SHEETS_CONFIG.apiToken,
        decks
      })
    });
    const payload = await response.json();
    if (!payload.ok) {
      throw new Error(payload.error || "Không lưu được Google Sheets.");
    }
    decks = payload.decks.map(normalizeDeck);
    persistLocal();
    syncStatus = "google-sheets";
  }

  function readStorage() {
    try {
      return window.localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  function writeStorage(value) {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // The app still works for the current tab if browser storage is blocked.
    }
  }

  function loadDecks() {
    try {
      const saved = readStorage();
      if (!saved) return clone(defaultDecks);
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return clone(defaultDecks);
      return parsed.map(normalizeDeck);
    } catch {
      return clone(defaultDecks);
    }
  }

  function persistLocal() {
    writeStorage(JSON.stringify(decks));
  }

  return {
    async init() {
      if (hasSheetsBackend()) {
        try {
          await loadFromSheets();
          return;
        } catch (error) {
          syncStatus = "offline-cache";
          console.warn(error);
          return;
        }
      }

      if (loadedFromStorage) return;
      try {
        const response = await fetch(DATA_URL, { cache: "no-store" });
        if (!response.ok) return;
        const jsonDecks = await response.json();
        if (!Array.isArray(jsonDecks)) return;
        decks = jsonDecks.map(normalizeDeck);
      } catch {
        decks = clone(defaultDecks);
      }
    },

    getDecks() {
      return clone(decks);
    },

    getSyncStatus() {
      if (syncStatus === "google-sheets") return "Google Sheets";
      if (syncStatus === "offline-cache") return "Cache local, chưa sync được Google Sheets";
      return "Local JSON/cache";
    },

    getDeck(id) {
      const deck = decks.find((item) => item.id === id);
      return deck ? clone(deck) : null;
    },

    async saveDeck(input) {
      const deck = normalizeDeck(input);
      const index = decks.findIndex((item) => item.id === deck.id);
      if (index >= 0) {
        decks[index] = deck;
      } else {
        decks.unshift(deck);
      }
      await persistSheets();
      return clone(deck);
    },

    async deleteDeck(id) {
      decks = decks.filter((deck) => deck.id !== id);
      await persistSheets();
    },

    async importDecks(jsonText) {
      const parsed = JSON.parse(jsonText);
      const nextDecks = Array.isArray(parsed) ? parsed : parsed.decks;
      if (!Array.isArray(nextDecks)) {
        throw new Error("JSON phải là mảng deck hoặc object có field decks.");
      }
      decks = nextDecks.map(normalizeDeck);
      await persistSheets();
      return clone(decks);
    },

    exportDecks() {
      return JSON.stringify(decks, null, 2);
    },

    createEmptyDeck() {
      return {
        id: createId("deck"),
        title: "",
        description: "",
        tags: [],
        cards: [{ id: createId("card"), pinyin: "", meaning: "" }]
      };
    },

    createEmptyCard() {
      return { id: createId("card"), pinyin: "", meaning: "" };
    }
  };
}

window.createFlashcardStore = createFlashcardStore;
