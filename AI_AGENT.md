# AI Agent Notes

File này dùng để AI/coder khác đọc nhanh khi tiếp tục dự án `study-with-me`.

## Project

Đây là web học tập cá nhân, deploy bằng GitHub Pages. Không dùng build tool, không dùng framework.

Stack:

- HTML thuần: `index.html`
- CSS thuần: `src/styles/main.css`
- JavaScript thuần: `src/js/**`
- Backend sync: Google Sheets qua Apps Script trong `google-apps-script/Code.gs`
- Local fallback: `localStorage` và file seed `data/flashcards.json`

Không tự chạy server khi user không yêu cầu. User thường mở bằng VS Code Go Live.

## Architecture

Pattern hiện tại giống MVC:

- `src/js/app.js`: bootstrap app.
- `src/js/config.js`: config Google Apps Script URL và token.
- `src/js/models/flashcardStore.js`: store, normalize dữ liệu, Google Sheets sync, localStorage fallback.
- `src/js/controllers/appController.js`: route hash, xử lý action, gọi store và view.
- `src/js/views/appView.js`: render HTML string, modal, toast, confirm, canvas viết tay.
- `src/styles/main.css`: toàn bộ UI style.

Routes:

- `#/`: Home.
- `#/chinese`: trang Tiếng Trung.
- `#/chinese/flashcards`: quản lý flashcards.
- `#/chinese/quiz`: trắc nghiệm flashcards.
- `#/chinese/writing`: luyện viết chữ Trung, dùng data riêng.
- `#/english`, `#/japanese`: placeholder.

## Data Model

Flashcards dùng sheet/data riêng:

```js
deck = {
  id,
  title,
  description,
  tags: [],
  cards: [
    { id, pinyin, meaning }
  ]
}
```

Writing practice dùng sheet riêng, không dùng chung với flashcards:

```js
writingItem = {
  id,
  pinyin,
  hanzi,
  meaning
}
```

Không thêm `hanzi` vào `vocabulary`/flashcards nếu user không yêu cầu. `hanzi` thuộc module `writing`.

## Google Sheets

Apps Script tạo các sheet:

- `settings`: token.
- `decks`: danh sách deck flashcards.
- `vocabulary`: từ vựng flashcards, columns `id`, `deck_id`, `pinyin`, `meaning`, `position`, `updated_at`.
- `writing`: luyện viết, columns `id`, `pinyin`, `hanzi`, `meaning`, `position`, `updated_at`.

Khi sửa schema sync, cập nhật cả:

- `google-apps-script/Code.gs`
- `google-apps-script/README.md`
- `src/js/models/flashcardStore.js`

Sau khi sửa Apps Script, nhắc user copy `Code.gs` lên Apps Script và deploy lại.

`src/js/config.js` có URL/token thật. Không tự ý revert nếu user đã đổi Web App URL.

## Current UX Rules

Flashcards:

- Tạo/sửa deck qua popup riêng.
- Quản lý từ vựng qua popup riêng.
- Thêm từ trong popup chỉ thêm vào danh sách tạm; bấm `Lưu thay đổi` mới sync.
- Import JSON cho từng bộ flashcard append vào bộ hiện tại, validate kỹ, bỏ trùng.
- JSON flashcard import format:

```json
{
  "cards": [
    { "pinyin": "di di", "meaning": "em trai" }
  ]
}
```

Quiz:

- Chọn danh sách câu hỏi.
- Có toggle ngẫu nhiên thứ tự câu hỏi và đáp án.
- Có loại câu hỏi:
  - Pinyin là câu hỏi, chọn nghĩa.
  - Nghĩa là câu hỏi, chọn pinyin.

Writing:

- Dữ liệu riêng ở sheet `writing`.
- Trên page có form thêm `pinyin`, `hanzi`, `meaning`.
- Thêm/xóa chỉ cập nhật draft trên màn hình.
- Chỉ bấm `Lưu thay đổi` mới sync DB một lần.
- Canvas viết tay dùng pointer events, hỗ trợ mouse/touch.
- `Study mặt chữ` có 2 mode:
  - `Chữ Trung trước`: hiện hanzi, lật ra pinyin + nghĩa.
  - `Pinyin + nghĩa trước`: hiện gợi ý, có canvas để viết thử, lật ra hanzi.

## UI Template

Giữ style hiện tại:

- Cards radius `8px`.
- Nền sáng, màu chính `--primary: #16736b`.
- Không dùng framework UI.
- Dùng class hiện có nếu được: `page`, `topbar`, `section-head`, `feature-grid`, `deck-card`, `btn`, `modal`, `modal-body`, `modal-foot`, `empty-state`, `list-toolbar`.
- Modal render vào `modalRoot`.
- Toast custom dùng `view.alert(...)`, không dùng `window.alert`.
- Confirm custom dùng `await view.confirm(...)`, không dùng `window.confirm`.
- Nếu thêm action xóa trong controller/view, nhớ `await view.confirm(...)`.

Không dùng card lồng card. Không tạo landing page mới. Màn hình đầu tiên phải là app dùng được.

## JavaScript Conventions

- Không dùng module imports; script được load bằng `<script>` thường.
- Các factory được gắn lên `window`, ví dụ `window.createFlashcardStore`.
- Tránh framework và build step.
- Render HTML bằng template literal trong `appView.js`.
- Escape mọi data user bằng `escapeHtml(...)`.
- Khi thêm event trong modal: set `modalRoot.onclick`/`modalRoot.onchange`, và clear trong `closeModal`.
- Khi thêm logic async save, disable button hoặc dùng `runWithButtonLoading`.

## Validation

Import flashcards:

- JSON hợp lệ.
- Là array hoặc object có `cards`/`questions`.
- Mỗi row phải có `pinyin` và `meaning`.
- Giới hạn file 1MB ở view.
- Giới hạn 1000 dòng.
- Bỏ qua duplicate theo `pinyin + meaning`.
- Nếu có row invalid thì chặn import toàn bộ và báo lỗi.

Writing:

- `pinyin` và `hanzi` bắt buộc.
- `meaning` optional.
- Save toàn bộ list bằng `store.saveWritingItems(...)`.

## Checks

Sau khi sửa JS, chạy:

```powershell
node --check .\src\js\config.js
node --check .\src\js\models\flashcardStore.js
node --check .\src\js\controllers\appController.js
node --check .\src\js\views\appView.js
node --check .\src\js\app.js
```

Check Apps Script bằng file tạm `.js`:

```powershell
$tmp = New-TemporaryFile
$jsPath = "$($tmp.FullName).js"
Copy-Item .\google-apps-script\Code.gs $jsPath
node --check $jsPath
Remove-Item $tmp -ErrorAction SilentlyContinue
Remove-Item $jsPath -ErrorAction SilentlyContinue
```

Check diff:

```powershell
git diff --check
git status --short
```

## Git

Remote hiện tại:

```text
origin git@github.com:taihv0211/study-with-me.git
```

Trước khi commit/push:

- Luôn xem `git status --short`.
- Không revert file user sửa, nhất là `src/js/config.js`.
- Nếu user bảo push, commit các thay đổi liên quan rồi `git push origin main`.

