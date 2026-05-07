function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function tagText(tags) {
  return tags?.length ? tags.join(", ") : "Chưa có tag";
}

async function runWithButtonLoading(button, loadingText, task) {
  if (!button || button.disabled) return;

  const originalText = button.textContent;
  button.disabled = true;
  button.classList.add("loading");
  button.textContent = loadingText;

  try {
    await task();
  } finally {
    if (button.isConnected) {
      button.disabled = false;
      button.classList.remove("loading");
      button.textContent = originalText;
    }
  }
}

function createAppView(root, modalRoot) {
  return {
    renderLayout(content) {
      root.innerHTML = `
        <main class="page">
          <header class="topbar">
            <a class="brand" href="#/">
              <span class="brand-mark">学</span>
              <span>
                <p class="brand-title">Study With Me</p>
                <p class="brand-subtitle">Không gian tự học cá nhân</p>
              </span>
            </a>
            <nav class="nav-actions">
              <a class="btn ghost" href="#/">Home</a>
              <a class="btn ghost" href="#/chinese">Tiếng Trung</a>
            </nav>
          </header>
          ${content}
        </main>
      `;
    },

    renderHome() {
      this.renderLayout(`
        <section class="hero">
          <div>
            <h1>Study With Me</h1>
            <p>Tách từng ngôn ngữ thành một khu học riêng, bắt đầu với tiếng Trung và flashcards.</p>
          </div>
          <div class="language-grid">
            <a class="language-tile" href="#/english">
              <span class="tile-kicker">English</span>
              <span>
                <h2 class="tile-title">Học tiếng Anh</h2>
                <p class="tile-desc">Sẽ bổ sung sau.</p>
              </span>
              <span class="arrow">Mở trang</span>
            </a>
            <a class="language-tile" href="#/chinese">
              <span class="tile-kicker">中文</span>
              <span>
                <h2 class="tile-title">Học tiếng Trung</h2>
                <p class="tile-desc">Flashcards, bộ từ vựng và kiểm tra nhanh.</p>
              </span>
              <span class="arrow">Mở trang</span>
            </a>
            <a class="language-tile" href="#/japanese">
              <span class="tile-kicker">日本語</span>
              <span>
                <h2 class="tile-title">Học tiếng Nhật</h2>
                <p class="tile-desc">Sẽ bổ sung sau.</p>
              </span>
              <span class="arrow">Mở trang</span>
            </a>
          </div>
        </section>
      `);
    },

    renderComingSoon(language) {
      this.renderLayout(`
        <section class="section-head">
          <div>
            <h1>${escapeHtml(language)}</h1>
            <p>Trang này đang để sẵn route, sau này có thể thêm module học riêng.</p>
          </div>
        </section>
        <div class="empty-state">Chưa có nội dung.</div>
      `);
    },

    renderChinese() {
      this.renderLayout(`
        <section class="section-head">
          <div>
            <h1>Tiếng Trung</h1>
            <p>Chọn khu học. Hiện tại có Flashcards, các phần khác có thể thêm sau.</p>
          </div>
        </section>
        <section class="feature-grid">
          <a class="feature-tile" href="#/chinese/flashcards">
            <span class="tile-kicker">Vocabulary</span>
            <span>
              <h2 class="tile-title">Flashcards</h2>
              <p class="tile-desc">Tạo bộ từ, chỉnh sửa, học tuần tự hoặc ngẫu nhiên.</p>
            </span>
            <span class="arrow">Vào học</span>
          </a>
          <a class="feature-tile" href="#/chinese/quiz">
            <span class="tile-kicker">Quiz</span>
            <span>
              <h2 class="tile-title">Trắc nghiệm</h2>
              <p class="tile-desc">Chọn nghĩa đúng cho pinyin với 4 đáp án.</p>
            </span>
            <span class="arrow">Kiểm tra</span>
          </a>
        </section>
      `);
    },

    renderQuizPage({ decks }) {
      const usableDecks = decks.filter((deck) => deck.cards.length >= 4 && new Set(deck.cards.map((card) => card.meaning)).size >= 4);
      this.renderLayout(`
        <section class="section-head">
          <div>
            <h1>Trắc nghiệm</h1>
            <p>Câu hỏi lấy từ pinyin. Mỗi câu có 1 nghĩa đúng và 3 đáp án nhiễu từ cùng bộ.</p>
          </div>
        </section>
        ${
          usableDecks.length
            ? `<section class="deck-grid">
                ${usableDecks
                  .map(
                    (deck) => `
                      <article class="deck-card">
                        <div>
                          <span class="tile-kicker">${escapeHtml(tagText(deck.tags))}</span>
                          <h2 class="deck-title">${escapeHtml(deck.title)}</h2>
                          <p class="deck-desc">${escapeHtml(deck.description || "Chưa có mô tả.")}</p>
                        </div>
                        <div class="deck-stats">
                          <span class="pill">${deck.cards.length} câu</span>
                          <span class="pill">4 đáp án</span>
                        </div>
                        <div class="button-row">
                          <button class="btn primary" data-action="choose-quiz" data-id="${deck.id}">Bắt đầu</button>
                        </div>
                      </article>
                    `
                  )
                  .join("")}
              </section>`
            : `<div class="empty-state">Cần ít nhất 4 từ trong một bộ để tạo trắc nghiệm.</div>`
        }
      `);
    },

    renderFlashcards({ decks, query = "", syncStatus = "Local JSON/cache" }) {
      const filtered = decks.filter((deck) => {
        const haystack = `${deck.title} ${deck.description} ${deck.tags.join(" ")}`.toLowerCase();
        return haystack.includes(query.toLowerCase());
      });

      this.renderLayout(`
        <section class="section-head">
          <div>
            <h1>Flashcards</h1>
            <p>Nơi lưu hiện tại: ${escapeHtml(syncStatus)}.</p>
          </div>
          <div class="button-row">
            <button class="btn ghost" data-action="import-json">Import JSON</button>
            <button class="btn ghost" data-action="export-json">Tải JSON</button>
            <button class="btn primary" data-action="create-deck">Tạo bộ mới</button>
          </div>
        </section>
        <div class="toolbar">
          <input class="search-box" data-action="search-decks" value="${escapeHtml(query)}" placeholder="Tìm theo tên, mô tả, tag" />
          <span class="meta">${filtered.length}/${decks.length} bộ flashcards</span>
        </div>
        ${
          filtered.length
            ? `<section class="deck-grid">
                ${filtered
                  .map(
                    (deck) => `
                      <article class="deck-card">
                        <div>
                          <span class="tile-kicker">${escapeHtml(tagText(deck.tags))}</span>
                          <h2 class="deck-title">${escapeHtml(deck.title)}</h2>
                          <p class="deck-desc">${escapeHtml(deck.description || "Chưa có mô tả.")}</p>
                        </div>
                        <div class="deck-stats">
                          <span class="pill">${deck.cards.length} từ</span>
                          <span class="pill">${deck.cards.filter((card) => card.pinyin).length} pinyin</span>
                        </div>
                        <div class="button-row">
                          <button class="btn primary" data-action="choose-study" data-id="${deck.id}">Học</button>
                          <button class="btn" data-action="manage-vocab" data-id="${deck.id}">Từ vựng</button>
                          <button class="btn" data-action="edit-deck" data-id="${deck.id}">Sửa bộ</button>
                          <!--<button class="btn danger" data-action="delete-deck" data-id="${deck.id}">Xóa</button>-->
                        </div>
                      </article>
                    `
                  )
                  .join("")}
              </section>`
            : `<div class="empty-state">Không có bộ flashcards phù hợp.</div>`
        }
      `);
    },

    showDeckForm({ deck, onSave }) {
      modalRoot.innerHTML = `
        <div class="modal-backdrop">
          <section class="modal" role="dialog" aria-modal="true">
            <header class="modal-head">
              <div>
                <h2>${deck.title ? "Sửa bộ flashcards" : "Tạo bộ flashcards"}</h2>
                <p>Chỉ chỉnh thông tin bộ. Từ vựng được quản lý ở popup riêng.</p>
              </div>
              <button class="icon-btn" type="button" data-action="close-modal" title="Đóng">×</button>
            </header>
            <form class="modal-body form-grid" data-form="deck">
              <div class="field">
                <label>Tên bộ</label>
                <input name="title" value="${escapeHtml(deck.title)}" required />
              </div>
              <div class="field">
                <label>Mô tả</label>
                <textarea name="description">${escapeHtml(deck.description)}</textarea>
              </div>
              <div class="field">
                <label>Tags, cách nhau bằng dấu phẩy</label>
                <input name="tags" value="${escapeHtml(deck.tags.join(", "))}" />
              </div>
            </form>
            <footer class="modal-foot">
              <button class="btn ghost" type="button" data-action="close-modal">Hủy</button>
              <button class="btn primary" type="button" data-action="save-deck">Lưu bộ</button>
            </footer>
          </section>
        </div>
      `;

      modalRoot.onclick = async (event) => {
        const action = event.target.closest("[data-action]")?.dataset.action;
        if (!action) return;
        if (action === "close-modal") {
          this.closeModal();
        }
        if (action === "save-deck") {
          await runWithButtonLoading(event.target.closest("[data-action]"), "Đang lưu...", async () => {
            const form = modalRoot.querySelector('[data-form="deck"]');
            if (!form.reportValidity()) return;
            const formData = new FormData(form);
            await onSave({
              ...deck,
              title: formData.get("title"),
              description: formData.get("description"),
              tags: formData.get("tags"),
              cards: deck.cards
            });
          });
        }
      };
    },

    showVocabularyManager({ deck, createCard, onSave }) {
      const renderRows = () =>
        deck.cards.length
          ? deck.cards
              .map(
                (card, index) => `
                  <div class="vocab-row" data-card-id="${card.id}">
                    <label class="check-cell" title="Chọn từ">
                      <input type="checkbox" data-select-card />
                    </label>
                    <span class="row-index">${index + 1}</span>
                    <span class="vocab-pinyin">${escapeHtml(card.pinyin)}</span>
                    <span class="vocab-meaning">${escapeHtml(card.meaning)}</span>
                    <div class="row-actions">
                      <button class="btn" type="button" data-action="edit-card">Sửa</button>
                      <button class="btn danger" type="button" data-action="delete-card">Xóa</button>
                    </div>
                  </div>
                `
              )
              .join("")
          : `<div class="empty-state">Bộ này chưa có từ vựng.</div>`;

      modalRoot.innerHTML = `
        <div class="modal-backdrop">
          <section class="modal large" role="dialog" aria-modal="true">
            <header class="modal-head">
              <div>
                <h2>Từ vựng: ${escapeHtml(deck.title || "Bộ mới")}</h2>
                <p>Thêm từ mới ở trên. Danh sách bên dưới có thể sửa, xóa hoặc chọn nhiều để xóa.</p>
              </div>
              <button class="icon-btn" type="button" data-action="close-modal" title="Đóng">×</button>
            </header>
            <div class="modal-body vocab-manager">
              <form class="quick-add" data-form="new-card">
                <div class="field">
                  <label>Pinyin</label>
                  <input name="pinyin" placeholder="Ví dụ: xue xi" required />
                </div>
                <div class="field">
                  <label>Nghĩa</label>
                  <input name="meaning" placeholder="Ví dụ: học tập" required />
                </div>
                <button class="btn primary" type="button" data-action="add-vocab">Thêm từ</button>
              </form>
              <div class="list-toolbar">
                <div class="button-row">
                  <button class="btn ghost" type="button" data-action="select-all-cards">Chọn tất cả</button>
                  <button class="btn ghost" type="button" data-action="clear-selected-cards">Bỏ chọn</button>
                  <button class="btn danger" type="button" data-action="bulk-delete-cards">Xóa đã chọn</button>
                </div>
                <span class="meta">${deck.cards.length} từ</span>
              </div>
              <div class="vocab-list">${renderRows()}</div>
            </div>
            <footer class="modal-foot">
              <button class="btn ghost" type="button" data-action="close-modal">Đóng</button>
              <button class="btn primary" type="button" data-action="save-vocab">Lưu thay đổi</button>
            </footer>
          </section>
        </div>
      `;

      const saveAndRefresh = (nextDeck = deck) => {
        return onSave(nextDeck);
      };

      modalRoot.onclick = async (event) => {
        const action = event.target.closest("[data-action]")?.dataset.action;
        if (!action) return;

        if (action === "close-modal") {
          this.closeModal();
        }

        if (action === "add-vocab") {
          const form = modalRoot.querySelector('[data-form="new-card"]');
          if (!form.reportValidity()) return;
          const formData = new FormData(form);
          deck.cards.unshift({
            ...createCard(),
            pinyin: formData.get("pinyin"),
            meaning: formData.get("meaning")
          });
          this.showVocabularyManager({ deck, createCard, onSave });
        }

        if (action === "edit-card") {
          const cardId = event.target.closest("[data-card-id]").dataset.cardId;
          const card = deck.cards.find((item) => item.id === cardId);
          if (!card) return;
          this.showCardEditForm({
            card,
            onSaveCard: (input) => {
              deck.cards = deck.cards.map((item) => (item.id === cardId ? { ...item, ...input } : item));
              this.showVocabularyManager({ deck, createCard, onSave });
            },
            onCancel: () => this.showVocabularyManager({ deck, createCard, onSave })
          });
        }

        if (action === "delete-card") {
          const cardId = event.target.closest("[data-card-id]").dataset.cardId;
          if (!this.confirm("Xóa từ này?")) return;
          deck.cards = deck.cards.filter((card) => card.id !== cardId);
          this.showVocabularyManager({ deck, createCard, onSave });
        }

        if (action === "select-all-cards") {
          modalRoot.querySelectorAll("[data-select-card]").forEach((input) => {
            input.checked = true;
          });
        }

        if (action === "clear-selected-cards") {
          modalRoot.querySelectorAll("[data-select-card]").forEach((input) => {
            input.checked = false;
          });
        }

        if (action === "bulk-delete-cards") {
          const selectedIds = Array.from(modalRoot.querySelectorAll("[data-select-card]:checked")).map(
            (input) => input.closest("[data-card-id]").dataset.cardId
          );
          if (!selectedIds.length) {
            this.alert("Chưa chọn từ nào để xóa.");
            return;
          }
          if (!this.confirm(`Xóa ${selectedIds.length} từ đã chọn?`)) return;
          deck.cards = deck.cards.filter((card) => !selectedIds.includes(card.id));
          this.showVocabularyManager({ deck, createCard, onSave });
        }

        if (action === "save-vocab") {
          await runWithButtonLoading(event.target.closest("[data-action]"), "Đang lưu...", async () => {
            await saveAndRefresh(deck);
          });
        }
      };
    },

    showCardEditForm({ card, onSaveCard, onCancel }) {
      modalRoot.innerHTML = `
        <div class="modal-backdrop">
          <section class="modal" role="dialog" aria-modal="true">
            <header class="modal-head">
              <div>
                <h2>Sửa từ vựng</h2>
                <p>Cập nhật pinyin và nghĩa.</p>
              </div>
              <button class="icon-btn" type="button" data-action="cancel-card-edit" title="Đóng">×</button>
            </header>
            <form class="modal-body form-grid" data-form="edit-card">
              <div class="field">
                <label>Pinyin</label>
                <input name="pinyin" value="${escapeHtml(card.pinyin)}" required />
              </div>
              <div class="field">
                <label>Nghĩa</label>
                <input name="meaning" value="${escapeHtml(card.meaning)}" required />
              </div>
            </form>
            <footer class="modal-foot">
              <button class="btn ghost" type="button" data-action="cancel-card-edit">Hủy</button>
              <button class="btn primary" type="button" data-action="save-card-edit">Lưu từ</button>
            </footer>
          </section>
        </div>
      `;

      modalRoot.onclick = (event) => {
        const action = event.target.closest("[data-action]")?.dataset.action;
        if (action === "cancel-card-edit") {
          onCancel();
        }
        if (action === "save-card-edit") {
          const form = modalRoot.querySelector('[data-form="edit-card"]');
          if (!form.reportValidity()) return;
          const formData = new FormData(form);
          onSaveCard({
            pinyin: formData.get("pinyin"),
            meaning: formData.get("meaning")
          });
        }
      };
    },

    showStudyChoice(deck, onChoose) {
      const showModeStep = () => {
        modalRoot.innerHTML = `
          <div class="modal-backdrop">
            <section class="modal" role="dialog" aria-modal="true">
              <header class="modal-head">
                <div>
                  <span class="step-label">Bước 1/3</span>
                  <h2>${escapeHtml(deck.title)}</h2>
                  <p>Chọn thứ tự học cho ${deck.cards.length} từ trong bộ này.</p>
                </div>
                <button class="icon-btn" type="button" data-action="close-modal" title="Đóng">×</button>
              </header>
              <div class="modal-body">
                <div class="feature-grid">
                  <button class="feature-tile" data-mode="sequential">
                    <span class="tile-kicker">Ordered</span>
                    <span>
                      <h3 class="tile-title">Học tuần tự</h3>
                      <p class="tile-desc">Đi theo đúng thứ tự trong bộ flashcards.</p>
                    </span>
                  </button>
                  <button class="feature-tile" data-mode="random">
                    <span class="tile-kicker">Shuffle</span>
                    <span>
                      <h3 class="tile-title">Học ngẫu nhiên</h3>
                      <p class="tile-desc">Xáo trộn thứ tự trước khi bắt đầu.</p>
                    </span>
                  </button>
                </div>
              </div>
            </section>
          </div>
        `;
        modalRoot.onclick = (event) => {
          const close = event.target.closest('[data-action="close-modal"]');
          const mode = event.target.closest("[data-mode]")?.dataset.mode;
          if (close) this.closeModal();
          if (mode) showWordSelectionStep(mode);
        };
      };

      const showDirectionStep = (mode, selectedIds) => {
        modalRoot.innerHTML = `
          <div class="modal-backdrop">
            <section class="modal large" role="dialog" aria-modal="true">
              <header class="modal-head">
                <div>
                  <span class="step-label">Bước 3/3</span>
                  <h2>${escapeHtml(deck.title)}</h2>
                  <p>Chọn cách hiển thị cho ${selectedIds.length} từ đã chọn.</p>
                </div>
                <button class="icon-btn" type="button" data-action="close-modal" title="Đóng">×</button>
              </header>
              <div class="modal-body">
                <div class="feature-grid three">
                  <button class="feature-tile" data-direction="pinyin-first">
                    <span class="tile-kicker">Pinyin</span>
                    <span>
                      <h3 class="tile-title">Pinyin trước</h3>
                      <p class="tile-desc">Mặt trước là pinyin, lật ra nghĩa tiếng Việt.</p>
                    </span>
                  </button>
                  <button class="feature-tile" data-direction="meaning-first">
                    <span class="tile-kicker">Meaning</span>
                    <span>
                      <h3 class="tile-title">Nghĩa trước</h3>
                      <p class="tile-desc">Mặt trước là nghĩa, lật ra pinyin.</p>
                    </span>
                  </button>
                  <button class="feature-tile" data-direction="mixed">
                    <span class="tile-kicker">Mixed</span>
                    <span>
                      <h3 class="tile-title">Lộn xộn</h3>
                      <p class="tile-desc">Mỗi từ tự random hỏi bằng pinyin hoặc nghĩa.</p>
                    </span>
                  </button>
                  <button class="feature-tile" data-direction="both">
                    <span class="tile-kicker">Both</span>
                    <span>
                      <h3 class="tile-title">Hiện cả hai</h3>
                      <p class="tile-desc">Mỗi thẻ hiển thị luôn pinyin và nghĩa để học nhanh.</p>
                    </span>
                  </button>
                </div>
              </div>
              <footer class="modal-foot">
                <button class="btn ghost" type="button" data-action="back-to-word-selection">Quay lại</button>
              </footer>
            </section>
          </div>
        `;
        modalRoot.onclick = (event) => {
          const action = event.target.closest("[data-action]")?.dataset.action;
          const close = event.target.closest('[data-action="close-modal"]');
          const direction = event.target.closest("[data-direction]")?.dataset.direction;
          if (close) this.closeModal();
          if (action === "back-to-word-selection") showWordSelectionStep(mode, selectedIds);
          if (direction) onChoose(mode, direction, selectedIds);
        };
      };

      const showWordSelectionStep = (mode, selectedIds = deck.cards.map((card) => card.id)) => {
        const renderRows = () =>
          deck.cards
            .map(
              (card, index) => `
                <label class="study-select-row" data-card-id="${card.id}">
                  <input type="checkbox" data-select-study-card ${selectedIds.includes(card.id) ? "checked" : ""} />
                  <span class="row-index">${index + 1}</span>
                  <strong>${escapeHtml(card.pinyin)}</strong>
                  <span>${escapeHtml(card.meaning)}</span>
                </label>
              `
            )
            .join("");

        modalRoot.innerHTML = `
          <div class="modal-backdrop">
            <section class="modal large" role="dialog" aria-modal="true">
              <header class="modal-head">
                <div>
                  <span class="step-label">Bước 2/3</span>
                  <h2>${escapeHtml(deck.title)}</h2>
                  <p>Chọn những từ bạn muốn học trong lượt này.</p>
                </div>
                <button class="icon-btn" type="button" data-action="close-modal" title="Đóng">×</button>
              </header>
              <div class="modal-body">
                <div class="list-toolbar">
                  <div class="button-row">
                    <button class="btn ghost" type="button" data-action="select-all-study-cards">Chọn tất cả</button>
                    <button class="btn ghost" type="button" data-action="clear-study-cards">Bỏ chọn</button>
                  </div>
                  <span class="meta" data-selected-count>${selectedIds.length}/${deck.cards.length} từ đã chọn</span>
                </div>
                <div class="study-select-list">${renderRows()}</div>
              </div>
              <footer class="modal-foot">
                <button class="btn ghost" type="button" data-action="back-to-mode">Quay lại</button>
                <button class="btn primary" type="button" data-action="continue-study-selection">Tiếp tục</button>
              </footer>
            </section>
          </div>
        `;

        const updateSelectedCount = () => {
          const count = modalRoot.querySelectorAll("[data-select-study-card]:checked").length;
          const label = modalRoot.querySelector("[data-selected-count]");
          if (label) label.textContent = `${count}/${deck.cards.length} từ đã chọn`;
        };

        modalRoot.onclick = (event) => {
          const action = event.target.closest("[data-action]")?.dataset.action;
          if (!action) {
            if (event.target.matches("[data-select-study-card]")) updateSelectedCount();
            return;
          }

          if (action === "close-modal") {
            this.closeModal();
          }

          if (action === "back-to-mode") {
            showModeStep();
          }

          if (action === "select-all-study-cards") {
            modalRoot.querySelectorAll("[data-select-study-card]").forEach((input) => {
              input.checked = true;
            });
            updateSelectedCount();
          }

          if (action === "clear-study-cards") {
            modalRoot.querySelectorAll("[data-select-study-card]").forEach((input) => {
              input.checked = false;
            });
            updateSelectedCount();
          }

          if (action === "continue-study-selection") {
            const selectedIds = Array.from(modalRoot.querySelectorAll("[data-select-study-card]:checked")).map(
              (input) => input.closest("[data-card-id]").dataset.cardId
            );
            if (!selectedIds.length) {
              this.alert("Chọn ít nhất 1 từ để học.");
              return;
            }
            showDirectionStep(mode, selectedIds);
          }
        };
      };

      showModeStep();
    },

    showQuizChoice(deck, onChoose) {
      const renderRows = () =>
        deck.cards
          .map(
            (card, index) => `
              <label class="study-select-row" data-card-id="${card.id}">
                <input type="checkbox" data-select-quiz-card checked />
                <span class="row-index">${index + 1}</span>
                <strong>${escapeHtml(card.pinyin)}</strong>
                <span>${escapeHtml(card.meaning)}</span>
              </label>
            `
          )
          .join("");

      modalRoot.innerHTML = `
        <div class="modal-backdrop">
          <section class="modal large" role="dialog" aria-modal="true">
            <header class="modal-head">
              <div>
                <h2>${escapeHtml(deck.title)}</h2>
                <p>Chọn câu muốn kiểm tra. Có thể xáo trộn thứ tự câu hỏi và đáp án.</p>
              </div>
              <button class="icon-btn" type="button" data-action="close-modal" title="Đóng">×</button>
            </header>
            <div class="modal-body">
              <div class="list-toolbar">
                <div class="button-row">
                  <button class="btn ghost" type="button" data-action="select-all-quiz-cards">Chọn tất cả</button>
                  <button class="btn ghost" type="button" data-action="clear-quiz-cards">Bỏ chọn</button>
                </div>
                <span class="meta" data-selected-count>${deck.cards.length}/${deck.cards.length} câu đã chọn</span>
              </div>
              <label class="toggle-row">
                <input type="checkbox" data-randomize-quiz checked />
                <span>Ngẫu nhiên thứ tự câu hỏi và đáp án</span>
              </label>
              <div class="study-select-list">${renderRows()}</div>
            </div>
            <footer class="modal-foot">
              <button class="btn ghost" type="button" data-action="close-modal">Đóng</button>
              <button class="btn primary" type="button" data-action="start-quiz-selection">Bắt đầu</button>
            </footer>
          </section>
        </div>
      `;

      const updateSelectedCount = () => {
        const checked = modalRoot.querySelectorAll("[data-select-quiz-card]:checked").length;
        const label = modalRoot.querySelector("[data-selected-count]");
        if (label) label.textContent = `${checked}/${deck.cards.length} câu đã chọn`;
      };

      modalRoot.onclick = (event) => {
        const action = event.target.closest("[data-action]")?.dataset.action;
        if (!action) {
          if (event.target.matches("[data-select-quiz-card]")) updateSelectedCount();
          return;
        }

        if (action === "close-modal") this.closeModal();

        if (action === "select-all-quiz-cards") {
          modalRoot.querySelectorAll("[data-select-quiz-card]").forEach((input) => {
            input.checked = true;
          });
          updateSelectedCount();
        }

        if (action === "clear-quiz-cards") {
          modalRoot.querySelectorAll("[data-select-quiz-card]").forEach((input) => {
            input.checked = false;
          });
          updateSelectedCount();
        }

        if (action === "start-quiz-selection") {
          const selectedIds = Array.from(modalRoot.querySelectorAll("[data-select-quiz-card]:checked")).map(
            (input) => input.closest("[data-card-id]").dataset.cardId
          );
          if (!selectedIds.length) {
            this.alert("Chọn ít nhất 1 câu để làm.");
            return;
          }
          const randomize = modalRoot.querySelector("[data-randomize-quiz]").checked;
          onChoose(selectedIds, randomize);
        }
      };
    },

    renderQuizQuestion({ deck, questions, index, answers, onAnswer, onExit }) {
      const question = questions[index];
      const correct = answers.filter((item) => item.correct).length;
      modalRoot.innerHTML = `
        <div class="modal-backdrop">
          <section class="modal large" role="dialog" aria-modal="true">
            <header class="modal-head">
              <div>
                <h2>${escapeHtml(deck.title)}</h2>
                <p>Chọn nghĩa đúng cho pinyin.</p>
              </div>
              <button class="icon-btn" type="button" data-action="exit" title="Thoát">×</button>
            </header>
            <div class="modal-body">
              <div class="progress-line">
                <span>Câu ${index + 1}/${questions.length}</span>
                <span>Đúng ${correct}</span>
              </div>
              <div class="learn-card quiz-card">
                <div>
                  <span class="study-label">Pinyin</span>
                  <p class="prompt-text">${escapeHtml(question.prompt)}</p>
                </div>
              </div>
              <div class="quiz-options">
                ${question.options
                  .map(
                    (option, optionIndex) => `
                      <button class="quiz-option" type="button" data-answer="${escapeHtml(option)}">
                        <span>${String.fromCharCode(65 + optionIndex)}</span>
                        <strong>${escapeHtml(option)}</strong>
                      </button>
                    `
                  )
                  .join("")}
              </div>
            </div>
          </section>
        </div>
      `;
      modalRoot.onclick = (event) => {
        if (event.target.closest('[data-action="exit"]')) onExit();
        const answer = event.target.closest("[data-answer]")?.dataset.answer;
        if (answer) onAnswer(answer);
      };
    },

    renderQuizResult({ deck, answers, onRestart, onClose }) {
      const total = answers.length;
      const wrong = answers.filter((item) => !item.correct);
      const correct = total - wrong.length;
      const percent = total ? Math.round((correct / total) * 100) : 0;

      modalRoot.innerHTML = `
        <div class="modal-backdrop">
          <section class="modal large" role="dialog" aria-modal="true">
            <header class="modal-head">
              <div>
                <h2>Kết quả trắc nghiệm: ${escapeHtml(deck.title)}</h2>
                <p>Hoàn thành ${total} câu.</p>
              </div>
              <button class="icon-btn" type="button" data-action="close" title="Đóng">×</button>
            </header>
            <div class="modal-body">
              <div class="result-summary">
                <div class="result-box"><span class="meta">Đúng</span><span class="result-value">${correct}</span></div>
                <div class="result-box"><span class="meta">Sai</span><span class="result-value">${wrong.length}/${total}</span></div>
                <div class="result-box"><span class="meta">Điểm</span><span class="result-value">${percent}%</span></div>
              </div>
              ${
                wrong.length
                  ? `<h3>Các câu sai</h3>
                    <div class="wrong-list">
                      ${wrong
                        .map(
                          (item) => `
                            <div class="wrong-item">
                              <strong>Pinyin: ${escapeHtml(item.question.prompt)}</strong>
                              <div>Bạn chọn: ${escapeHtml(item.selectedAnswer)}</div>
                              <div>Đáp án đúng: ${escapeHtml(item.question.correctAnswer)}</div>
                            </div>
                          `
                        )
                        .join("")}
                    </div>`
                  : `<div class="empty-state">Bạn trả lời đúng toàn bộ câu hỏi.</div>`
              }
            </div>
            <footer class="modal-foot">
              <button class="btn ghost" type="button" data-action="close">Đóng</button>
              <button class="btn primary" type="button" data-action="restart">Làm lại</button>
            </footer>
          </section>
        </div>
      `;
      modalRoot.onclick = (event) => {
        if (event.target.closest('[data-action="restart"]')) onRestart();
        if (event.target.closest('[data-action="close"]')) onClose();
      };
    },

    renderStudySession({ deck, cards, index, revealed, answers, reviewOnly, onReveal, onAnswer, onNext, onExit }) {
      const card = cards[index];
      const correct = answers.filter((item) => item.correct).length;
      const wrong = answers.length - correct;
      const showAnswer = revealed || card.showBoth;
      modalRoot.innerHTML = `
        <div class="modal-backdrop">
          <section class="modal large" role="dialog" aria-modal="true">
            <header class="modal-head">
              <div>
                <h2>${escapeHtml(deck.title)}</h2>
                <p>Đánh dấu Đúng/Sai theo việc bạn tự nhớ nghĩa trước khi lật đáp án.</p>
              </div>
              <button class="icon-btn" type="button" data-action="exit" title="Thoát">×</button>
            </header>
            <div class="modal-body">
              <div class="progress-line">
                <span>Câu ${index + 1}/${cards.length}</span>
                <span>${reviewOnly ? "Chế độ xem nhanh" : `Đúng ${correct} · Sai ${wrong}`}</span>
              </div>
              <div class="learn-card">
                <div>
                  <span class="study-label">${escapeHtml(card.promptLabel)}</span>
                  <p class="prompt-text">${escapeHtml(card.prompt)}</p>
                  ${
                    showAnswer
                      ? `<span class="study-label answer-label">${escapeHtml(card.answerLabel)}</span>
                         <p class="meaning">${escapeHtml(card.answer)}</p>`
                      : ""
                  }
                </div>
              </div>
              ${
                reviewOnly
                  ? `<button class="btn primary" data-action="next-card" style="width:100%; margin-top:14px;">
                      ${index + 1 >= cards.length ? "Hoàn thành" : "Tiếp tục"}
                    </button>`
                  : showAnswer
                  ? `<div class="answer-actions">
                      <button class="btn danger" data-answer="wrong">Sai</button>
                      <button class="btn primary" data-answer="correct">Đúng</button>
                    </div>`
                  : `<button class="btn primary" data-action="reveal" style="width:100%; margin-top:14px;">Lật đáp án</button>`
              }
            </div>
          </section>
        </div>
      `;
      modalRoot.onclick = (event) => {
        if (event.target.closest('[data-action="exit"]')) onExit();
        if (event.target.closest('[data-action="reveal"]')) onReveal();
        if (event.target.closest('[data-action="next-card"]')) onNext();
        const answer = event.target.closest("[data-answer]")?.dataset.answer;
        if (answer) onAnswer(answer === "correct");
      };
    },

    renderStudyComplete({ deck, total, onRestart, onClose }) {
      modalRoot.innerHTML = `
        <div class="modal-backdrop">
          <section class="modal" role="dialog" aria-modal="true">
            <header class="modal-head">
              <div>
                <h2>Hoàn thành: ${escapeHtml(deck.title)}</h2>
                <p>Bạn đã xem hết ${total} thẻ trong lượt học này.</p>
              </div>
              <button class="icon-btn" type="button" data-action="close" title="Đóng">×</button>
            </header>
            <div class="modal-body">
              <div class="empty-state">Chế độ hiện cả hai không chấm Đúng/Sai.</div>
            </div>
            <footer class="modal-foot">
              <button class="btn ghost" type="button" data-action="close">Đóng</button>
              <button class="btn primary" type="button" data-action="restart">Học lại</button>
            </footer>
          </section>
        </div>
      `;
      modalRoot.onclick = (event) => {
        if (event.target.closest('[data-action="restart"]')) onRestart();
        if (event.target.closest('[data-action="close"]')) onClose();
      };
    },

    renderResult({ deck, answers, onRestart, onClose }) {
      const total = answers.length;
      const wrong = answers.filter((item) => !item.correct);
      const correct = total - wrong.length;
      const percent = total ? Math.round((correct / total) * 100) : 0;
      modalRoot.innerHTML = `
        <div class="modal-backdrop">
          <section class="modal large" role="dialog" aria-modal="true">
            <header class="modal-head">
              <div>
                <h2>Kết quả: ${escapeHtml(deck.title)}</h2>
                <p>Hoàn thành ${total} từ. Điểm này dựa trên tự đánh giá Đúng/Sai.</p>
              </div>
              <button class="icon-btn" type="button" data-action="close" title="Đóng">×</button>
            </header>
            <div class="modal-body">
              <div class="result-summary">
                <div class="result-box"><span class="meta">Đúng</span><span class="result-value">${correct}</span></div>
                <div class="result-box"><span class="meta">Sai</span><span class="result-value">${wrong.length}/${total}</span></div>
                <div class="result-box"><span class="meta">Tỷ lệ nhớ</span><span class="result-value">${percent}%</span></div>
              </div>
              ${
                wrong.length
                  ? `<h3>Các câu sai</h3>
                    <div class="wrong-list">
                      ${wrong
                        .map(
                          (item) => `
                            <div class="wrong-item">
                              <strong>${escapeHtml(item.card.promptLabel)}: ${escapeHtml(item.card.prompt)}</strong>
                              <div>Đáp án đúng (${escapeHtml(item.card.answerLabel)}): ${escapeHtml(item.card.answer)}</div>
                            </div>
                          `
                        )
                        .join("")}
                    </div>`
                  : `<div class="empty-state">Bạn không đánh dấu sai câu nào trong lượt học này.</div>`
              }
            </div>
            <footer class="modal-foot">
              <button class="btn ghost" type="button" data-action="close">Đóng</button>
              <button class="btn primary" type="button" data-action="restart">Học lại bộ này</button>
            </footer>
          </section>
        </div>
      `;
      modalRoot.onclick = (event) => {
        if (event.target.closest('[data-action="restart"]')) onRestart();
        if (event.target.closest('[data-action="close"]')) onClose();
      };
    },

    showJsonDialog({ title, value = "", readonly = false, onSubmit }) {
      modalRoot.innerHTML = `
        <div class="modal-backdrop">
          <section class="modal large" role="dialog" aria-modal="true">
            <header class="modal-head">
              <div>
                <h2>${escapeHtml(title)}</h2>
                <p>Dùng JSON để backup hoặc chuyển dữ liệu flashcards.</p>
              </div>
              <button class="icon-btn" type="button" data-action="close-modal" title="Đóng">×</button>
            </header>
            <div class="modal-body">
              <div class="field">
                <label>JSON</label>
                <textarea data-json-input ${readonly ? "readonly" : ""} style="min-height:320px;">${escapeHtml(value)}</textarea>
              </div>
            </div>
            <footer class="modal-foot">
              <button class="btn ghost" type="button" data-action="close-modal">Đóng</button>
              ${readonly ? "" : `<button class="btn primary" type="button" data-action="submit-json">Import</button>`}
            </footer>
          </section>
        </div>
      `;
      modalRoot.onclick = async (event) => {
        if (event.target.closest('[data-action="close-modal"]')) this.closeModal();
        if (event.target.closest('[data-action="submit-json"]')) {
          await runWithButtonLoading(event.target.closest("[data-action]"), "Đang import...", async () => {
            await onSubmit(modalRoot.querySelector("[data-json-input]").value);
          });
        }
      };
    },

    closeModal() {
      modalRoot.innerHTML = "";
      modalRoot.onclick = null;
    },

    alert(message) {
      window.alert(message);
    },

    confirm(message) {
      return window.confirm(message);
    }
  };
}

window.createAppView = createAppView;
