# Static App Template

Template này dùng lại cho các dự án web nhỏ deploy bằng GitHub Pages, viết bằng HTML/CSS/JS thuần, không build step.

## When To Use

Dùng template này khi cần:

- App cá nhân hoặc tool nhỏ.
- Deploy static trên GitHub Pages.
- Không cần backend server riêng.
- Có thể sync dữ liệu qua external API như Google Apps Script, Airtable, Supabase, hoặc fallback localStorage.
- Cần UI nhất quán, dễ mở rộng, dễ cho AI/coder khác tiếp tục.

Không phù hợp nếu app cần:

- Authentication phức tạp.
- SSR.
- Build pipeline lớn.
- Realtime nhiều người dùng.

## Folder Structure

```text
project-root/
  index.html
  data/
    seed.json
  src/
    styles/
      main.css
    js/
      app.js
      config.js
      models/
        appStore.js
      controllers/
        appController.js
      views/
        appView.js
  backend-or-scripts/
    Code.gs
    README.md
  AI_AGENT.md
  STATIC_APP_TEMPLATE.md
```

## HTML Template

`index.html` nên giữ đơn giản:

```html
<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>App Name</title>
    <link rel="stylesheet" href="./src/styles/main.css" />
  </head>
  <body>
    <div id="app"></div>
    <div id="modal-root"></div>

    <script src="./src/js/config.js"></script>
    <script src="./src/js/models/appStore.js"></script>
    <script src="./src/js/views/appView.js"></script>
    <script src="./src/js/controllers/appController.js"></script>
    <script src="./src/js/app.js"></script>
  </body>
</html>
```

Không dùng `<script type="module">` nếu muốn tránh lỗi MIME trên static server cấu hình sai.

## JavaScript Pattern

Không dùng import/export. Gắn factory vào `window`.

`app.js`:

```js
const root = document.querySelector("#app");
const modalRoot = document.querySelector("#modal-root");

const store = window.createAppStore();
const view = window.createAppView(root, modalRoot);
const controller = window.createController({ store, view });

store.init().finally(() => controller.start());
```

Store:

```js
function createAppStore() {
  let state = loadInitialState();

  return {
    async init() {},
    getItems() {
      return clone(state.items);
    },
    async saveItems(items) {
      state.items = normalizeItems(items);
      await persist();
      return clone(state.items);
    }
  };
}

window.createAppStore = createAppStore;
```

Controller:

```js
function createController({ store, view }) {
  function render() {
    const route = window.location.hash || "#/";
    if (route === "#/") {
      view.renderHome();
      return;
    }
    window.location.hash = "#/";
  }

  async function handleClick(event) {
    const target = event.target.closest("[data-action]");
    if (!target) return;
    const { action, id } = target.dataset;
  }

  return {
    start() {
      window.addEventListener("hashchange", render);
      document.addEventListener("click", handleClick);
      render();
    }
  };
}

window.createController = createController;
```

View:

```js
function createAppView(root, modalRoot) {
  return {
    renderLayout(content) {
      root.innerHTML = `
        <main class="page">
          <header class="topbar"></header>
          ${content}
        </main>
      `;
    },
    renderHome() {},
    closeModal() {
      modalRoot.innerHTML = "";
      modalRoot.onclick = null;
      modalRoot.onchange = null;
    },
    alert(message) {
      showAppAlert(message);
    },
    confirm(message) {
      return showAppConfirm(message);
    }
  };
}

window.createAppView = createAppView;
```

## Routing

Dùng hash route:

```text
#/
#/module
#/module/detail
```

Lý do:

- Hoạt động tốt trên GitHub Pages.
- Không cần server rewrite.
- Dễ debug.

## Data Sync Pattern

Luôn có fallback local:

1. Thử load external backend nếu có config.
2. Nếu fail, dùng localStorage cache.
3. Nếu chưa có cache, dùng `data/seed.json`.

Pattern:

```js
async function persist() {
  if (!hasBackend()) {
    persistLocal();
    return;
  }

  const response = await fetch(config.url, {
    method: "POST",
    body: JSON.stringify({ action: "saveAll", token: config.token, state })
  });

  const payload = await response.json();
  if (!payload.ok) throw new Error(payload.error || "Không lưu được dữ liệu.");

  state = normalizeState(payload.state);
  persistLocal();
}
```

Nếu thao tác có thể thêm nhiều item, nên dùng draft local trên UI và chỉ sync khi user bấm `Lưu thay đổi`.

## UI Components

Class nên dùng lại:

- `.page`: page container.
- `.topbar`: header/nav.
- `.section-head`: title + actions.
- `.feature-grid`: feature tiles.
- `.deck-grid`: card grid.
- `.deck-card`: card item.
- `.button-row`: group buttons.
- `.btn`, `.btn.primary`, `.btn.ghost`, `.btn.danger`.
- `.modal-backdrop`, `.modal`, `.modal.large`, `.modal-foot`.
- `.field`, `.form-grid`.
- `.list-toolbar`.
- `.empty-state`.

Button actions:

```html
<button class="btn primary" data-action="save-item" data-id="abc">Lưu</button>
```

Controller đọc:

```js
const target = event.target.closest("[data-action]");
const { action, id } = target.dataset;
```

## Toast And Confirm

Không dùng native `window.alert`.

View nên expose:

```js
view.alert("Đã lưu.");
await view.confirm("Xóa item này?");
```

Toast:

- Không block UI.
- Tự ẩn.
- Màu theo loại: success/warning/error.

Confirm:

- Return Promise boolean.
- Không render vào `modalRoot` nếu có thể có modal đang mở.
- Click backdrop hoặc Esc = cancel.

## Modal Rules

- Modal dùng `modalRoot`.
- Khi đóng phải cleanup event:

```js
closeModal() {
  modalRoot.innerHTML = "";
  modalRoot.onclick = null;
  modalRoot.onchange = null;
}
```

- Không dùng nested modal nếu không cần.
- Nếu cần confirm khi modal đang mở, dùng confirm overlay riêng ngoài `modalRoot`.

## CSS Rules

Base variables:

```css
:root {
  --bg: #f7f5ef;
  --surface: #ffffff;
  --surface-2: #f0f7f4;
  --text: #1f2a2e;
  --muted: #607079;
  --line: #dbe2df;
  --primary: #16736b;
  --primary-strong: #0f5c55;
  --accent: #c94f2d;
  --warning: #ad6d05;
  --danger: #b42318;
  --ok: #247a43;
  --shadow: 0 18px 48px rgba(31, 42, 46, 0.12);
}
```

Style conventions:

- Border radius 8px.
- Không dùng gradient/orb decoration.
- Text không overlap, mobile responsive.
- Buttons min-height 40px.
- Cards chỉ dùng cho item lặp lại hoặc modal/tool surface.
- Sections không bọc trong card nếu không cần.

Responsive breakpoints gợi ý:

```css
@media (max-width: 820px) {}
@media (min-width: 821px) and (max-width: 1080px) {}
@media (max-width: 640px) {}
@media (max-width: 420px) {}
```

## Validation Rules

Mọi input từ user:

- Trim string.
- Validate required fields trước khi save.
- Escape khi render HTML bằng `escapeHtml`.
- Import JSON phải parse bằng `JSON.parse`, không tự split string.
- Nếu import có row invalid, nên chặn toàn bộ import và báo rõ dòng lỗi.
- Với duplicate, có thể skip và báo số lượng skipped.

## Canvas / Drawing Tool Pattern

Nếu cần viết/vẽ:

- Dùng `<canvas>`.
- Pointer events để hỗ trợ mouse/touch.
- Set `touch-action: none`.
- Scale theo `devicePixelRatio`.
- Gắn method clear vào canvas instance.

```js
canvas.clearDrawing = () => {
  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.restore();
};
```

## Checks

JS:

```powershell
node --check .\src\js\config.js
node --check .\src\js\models\appStore.js
node --check .\src\js\controllers\appController.js
node --check .\src\js\views\appView.js
node --check .\src\js\app.js
```

Apps Script `.gs`:

```powershell
$tmp = New-TemporaryFile
$jsPath = "$($tmp.FullName).js"
Copy-Item .\backend-or-scripts\Code.gs $jsPath
node --check $jsPath
Remove-Item $tmp -ErrorAction SilentlyContinue
Remove-Item $jsPath -ErrorAction SilentlyContinue
```

Git:

```powershell
git diff --check
git status --short
```

## AI Instructions For New Projects

When using this template:

1. Keep app static unless user explicitly asks for framework/backend.
2. Start from data model and routes.
3. Put business logic in store/controller, not view.
4. Keep view as render + DOM event wiring.
5. Use `data-action` for commands.
6. Use custom toast/confirm.
7. Use local draft state for bulk edits, then save once.
8. Run `node --check` and `git diff --check` before final answer.
9. Do not auto-start dev server if user says they use Go Live.

