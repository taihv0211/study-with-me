function showBootError(error) {
  const app = document.querySelector("#app");
  if (!app) return;
  app.innerHTML = `
    <main class="page">
      <div class="empty-state">
        <strong>Không thể tải trang.</strong>
        <p>${error.message}</p>
      </div>
    </main>
  `;
  console.error(error);
}

async function boot() {
  try {
    const app = document.querySelector("#app");
    const modalRoot = document.querySelector("#modal-root");

    if (!app || !modalRoot) {
      throw new Error("Thiếu #app hoặc #modal-root trong index.html.");
    }

    const store = window.createFlashcardStore();
    await store.init();
    const view = window.createAppView(app, modalRoot);
    const controller = window.createController({ store, view });

    controller.start();
  } catch (error) {
    showBootError(error);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
