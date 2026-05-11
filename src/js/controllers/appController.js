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

    if (cardDirection === "both") {
      return {
        ...card,
        direction: cardDirection,
        prompt: card.pinyin,
        answer: card.meaning,
        promptLabel: "Pinyin",
        answerLabel: "Nghĩa",
        showBoth: true
      };
    }

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

function getQuizShape(quizType) {
  if (quizType === "meaning-question") {
    return {
      promptField: "meaning",
      answerField: "pinyin",
      promptLabel: "Nghĩa",
      answerLabel: "Pinyin"
    };
  }

  return {
    promptField: "pinyin",
    answerField: "meaning",
    promptLabel: "Pinyin",
    answerLabel: "Nghĩa"
  };
}

function buildQuizQuestions(questionCards, randomize, optionPool, quizType) {
  const shape = getQuizShape(quizType);
  const source = randomize ? shuffle(questionCards) : [...questionCards];
  return source.map((card) => {
    const correctAnswer = card[shape.answerField];
    const distractors = shuffle(
      Array.from(
        new Set(
          optionPool
            .filter((item) => item.id !== card.id && item[shape.answerField] !== correctAnswer)
            .map((item) => item[shape.answerField])
        )
      )
    ).slice(0, 3);
    const options = randomize ? shuffle([correctAnswer, ...distractors]) : [correctAnswer, ...distractors];

    return {
      card,
      prompt: card[shape.promptField],
      promptLabel: shape.promptLabel,
      answerLabel: shape.answerLabel,
      correctAnswer,
      options
    };
  });
}

function createController({ store, view }) {
  let deckQuery = "";
  let activeSession = null;
  let activeQuiz = null;

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
    if (route === "#/chinese/quiz") {
      view.renderQuizPage({ decks: store.getDecks() });
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
      async onSave(input, options = {}) {
        try {
          const saved = await store.saveDeck(input);
          render();
          if (!options.keepOpen) {
            view.closeModal();
            view.alert(`Đã lưu từ vựng cho bộ "${saved.title}".`);
          }
          return saved;
        } catch (error) {
          if (options.keepOpen) {
            throw error;
          }
          view.alert(error.message);
          return null;
        }
      }
    });
  }

  function startStudy(deck, mode, direction, selectedIds = null) {
    const selectedCards = selectedIds?.length
      ? deck.cards.filter((card) => selectedIds.includes(card.id))
      : deck.cards;
    const orderedCards = mode === "random" ? shuffle(selectedCards) : [...selectedCards];
    const cards = buildStudyCards(orderedCards, direction);
    activeSession = {
      deck,
      cards,
      index: 0,
      revealed: false,
      answers: [],
      mode,
      direction,
      selectedIds,
      reviewOnly: direction === "both"
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
      onNext() {
        activeSession.index += 1;
        if (activeSession.index >= activeSession.cards.length) {
          renderStudyComplete();
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

  function renderStudyComplete() {
    const completed = activeSession;
    view.renderStudyComplete({
      deck: completed.deck,
      total: completed.cards.length,
      onRestart() {
        startStudy(completed.deck, completed.mode, completed.direction, completed.selectedIds);
      },
      onClose() {
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
        startStudy(completed.deck, completed.mode, completed.direction, completed.selectedIds);
      },
      onClose() {
        activeSession = null;
        view.closeModal();
      }
    });
  }

  function startQuiz(deck, selectedIds = null, randomize = true, quizType = "pinyin-question") {
    const quizShape = getQuizShape(quizType);
    const uniqueAnswers = new Set(deck.cards.map((card) => card[quizShape.answerField]));
    if (deck.cards.length < 4 || uniqueAnswers.size < 4) {
      view.alert(`Cần ít nhất 4 ${quizShape.answerLabel.toLowerCase()} khác nhau trong bộ để tạo trắc nghiệm 4 đáp án.`);
      return;
    }

    const selectedCards = selectedIds?.length
      ? deck.cards.filter((card) => selectedIds.includes(card.id))
      : deck.cards;

    if (!selectedCards.length) {
      view.alert("Chọn ít nhất 1 câu hỏi để làm.");
      return;
    }

    activeQuiz = {
      deck,
      selectedIds,
      randomize,
      quizType,
      questions: buildQuizQuestions(selectedCards, randomize, deck.cards, quizType),
      index: 0,
      answers: []
    };
    renderQuizQuestion();
  }

  function renderQuizQuestion() {
    view.renderQuizQuestion({
      ...activeQuiz,
      onAnswer(selectedAnswer) {
        const question = activeQuiz.questions[activeQuiz.index];
        activeQuiz.answers.push({
          question,
          selectedAnswer,
          correct: selectedAnswer === question.correctAnswer
        });
        activeQuiz.index += 1;
        if (activeQuiz.index >= activeQuiz.questions.length) {
          renderQuizResult();
          return;
        }
        renderQuizQuestion();
      },
      onExit() {
        activeQuiz = null;
        view.closeModal();
      }
    });
  }

  function renderQuizResult() {
    const completed = activeQuiz;
    view.renderQuizResult({
      deck: completed.deck,
      answers: completed.answers,
      onRestart() {
        startQuiz(completed.deck, completed.selectedIds, completed.randomize, completed.quizType);
      },
      onClose() {
        activeQuiz = null;
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
      view.showStudyChoice(deck, (mode, direction, selectedIds) => startStudy(deck, mode, direction, selectedIds));
    }

    if (action === "choose-quiz") {
      const deck = store.getDeck(id);
      if (!deck) return;
      if (!deck.cards.length) {
        view.alert("Bộ này chưa có từ nào để kiểm tra.");
        return;
      }
      view.showQuizChoice(deck, (selectedIds, randomize, quizType) => startQuiz(deck, selectedIds, randomize, quizType));
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
