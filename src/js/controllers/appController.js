function shuffle(cards) {
  const next = [...cards];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function downloadJson(filename, content) {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildStudyCards(cards, direction) {
  return cards.map((card) => {
    const cardDirection =
      direction === "mixed" ? (Math.random() > 0.5 ? "pinyin-first" : "meaning-first") : direction;

    if (cardDirection === "meaning-first") {
      return {
        ...card,
        direction: cardDirection,
        prompt: card.meaning,
        answer: card.pinyin,
        promptLabel: "Nghĩa",
        answerLabel: "Pinyin"
      };
    }

    return {
      ...card,
      direction: cardDirection,
      prompt: card.pinyin,
      answer: card.meaning,
      promptLabel: "Pinyin",
      answerLabel: "Nghĩa"
    };
  });
}

function createController({ store, view }) {
  let deckQuery = "";
  let activeSession = null;

  function render() {
    const route = window.location.hash || "#/";
    if (route === "#/" || route === "#") {
      view.renderHome();
      return;
    }
    if (route === "#/chinese") {
      view.renderChinese();
      return;
    }
    if (route === "#/chinese/flashcards") {
      view.renderFlashcards({ decks: store.getDecks(), query: deckQuery, syncStatus: store.getSyncStatus() });
      return;
    }
    if (route === "#/english") {
      view.renderComingSoon("Học tiếng Anh");
      return;
    }
    if (route === "#/japanese") {
      view.renderComingSoon("Học tiếng Nhật");
      return;
    }
    window.location.hash = "#/";
  }

  function openDeckForm(deck = store.createEmptyDeck()) {
    view.showDeckForm({
      deck,
      async onSave(input) {
        try {
          const saved = await store.saveDeck(input);
          view.closeModal();
          render();
          view.alert(`Đã lưu bộ "${saved.title}".`);
        } catch (error) {
          view.alert(error.message);
        }
      }
    });
  }

  function openVocabularyManager(deck) {
    view.showVocabularyManager({
      deck,
      createCard: store.createEmptyCard,
      async onSave(input) {
        try {
          const saved = await store.saveDeck(input);
          view.closeModal();
          render();
          view.alert(`Đã lưu từ vựng cho bộ "${saved.title}".`);
        } catch (error) {
          view.alert(error.message);
        }
      }
    });
  }

  function startStudy(deck, mode, direction) {
    const orderedCards = mode === "random" ? shuffle(deck.cards) : [...deck.cards];
    const cards = buildStudyCards(orderedCards, direction);
    activeSession = {
      deck,
      cards,
      index: 0,
      revealed: false,
      answers: [],
      mode,
      direction
    };
    renderStudySession();
  }

  function renderStudySession() {
    view.renderStudySession({
      ...activeSession,
      onReveal() {
        activeSession.revealed = true;
        renderStudySession();
      },
      onAnswer(correct) {
        activeSession.answers.push({
          card: activeSession.cards[activeSession.index],
          correct
        });
        activeSession.index += 1;
        activeSession.revealed = false;
        if (activeSession.index >= activeSession.cards.length) {
          renderResult();
          return;
        }
        renderStudySession();
      },
      onExit() {
        activeSession = null;
        view.closeModal();
      }
    });
  }

  function renderResult() {
    const completed = activeSession;
    view.renderResult({
      deck: completed.deck,
      answers: completed.answers,
      onRestart() {
        startStudy(completed.deck, completed.mode, completed.direction);
      },
      onClose() {
        activeSession = null;
        view.closeModal();
      }
    });
  }

  async function handleClick(event) {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const { action, id } = target.dataset;

    if (action === "create-deck") {
      openDeckForm();
    }

    if (action === "edit-deck") {
      const deck = store.getDeck(id);
      if (deck) openDeckForm(deck);
    }

    if (action === "manage-vocab") {
      const deck = store.getDeck(id);
      if (deck) openVocabularyManager(deck);
    }

    if (action === "delete-deck") {
      const deck = store.getDeck(id);
      if (!deck) return;
      if (!view.confirm(`Xóa bộ "${deck.title}"?`)) return;
      try {
        await store.deleteDeck(id);
        render();
      } catch (error) {
        view.alert(error.message);
      }
    }

    if (action === "choose-study") {
      const deck = store.getDeck(id);
      if (!deck) return;
      if (!deck.cards.length) {
        view.alert("Bộ này chưa có từ nào để học.");
        return;
      }
      view.showStudyChoice(deck, (mode, direction) => startStudy(deck, mode, direction));
    }

    if (action === "export-json") {
      downloadJson("flashcards.json", store.exportDecks());
      view.alert("Đã tải flashcards.json. Nếu muốn dữ liệu thành mặc định khi deploy, thay file data/flashcards.json bằng file vừa tải.");
    }

    if (action === "import-json") {
      view.showJsonDialog({
        title: "Import flashcards",
        async onSubmit(jsonText) {
          try {
            await store.importDecks(jsonText);
            view.closeModal();
            render();
          } catch (error) {
            view.alert(error.message);
          }
        }
      });
    }
  }

  function handleInput(event) {
    if (event.target.dataset.action === "search-decks") {
      deckQuery = event.target.value;
      render();
      const search = document.querySelector('[data-action="search-decks"]');
      search?.focus();
      search?.setSelectionRange(deckQuery.length, deckQuery.length);
    }
  }

  return {
    start() {
      window.addEventListener("hashchange", render);
      document.addEventListener("click", handleClick);
      document.addEventListener("input", handleInput);
      render();
    }
  };
}

window.createController = createController;
