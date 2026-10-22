# trongkhang

Bản clone của [nathanchen.me](https://nathanchen.me/), đổi tên thành **Trong Khang** —
giao diện tối kiểu vùng cực (nền băng tuyết động + hoạ tiết ruy băng Thánh George "50 лет Победы · 1945–1995"),
logo gấu bắc cực, có backend nhỏ cho form liên hệ và **engine blog tự viết bài**.

## Chạy

```bash
python app.py          # http://localhost:8000
```

Env: `PORT` (mặc định 8000). Không cần cài dependency — chỉ Python 3 stdlib.

## Viết bài

1. Mở `/public/write.html` → điền tiêu đề, ngày, chuyên mục (Technical / Reflection / Article), nội dung markdown → **Đăng bài**.
2. Bài được lưu thành `posts/<slug>.md` (front matter `title` / `date` / `category`).
3. Danh sách: `/public/blog.html` (đọc `GET /api/posts`, bấm legend để lọc theo chuyên mục).
4. Xem một bài: `/public/post.html?slug=<slug>` — có link *edit bài này* quay lại form (đã điền sẵn).
5. Markdown hỗ trợ: `#` tiêu đề, `**đậm**`, `*nghiêng*`, `` `code` ``, `[link](url)`, `![ảnh](url)`, `> trích dẫn`, `- danh sách`, ``` ``` code block ```.

API (JSON):

| Method | Path | Body |
|---|---|---|
| `GET` | `/api/posts` | – |
| `GET` | `/api/posts/<slug>` | – (`title`, `date`, `category`, `excerpt`, `html`, `raw`) |
| `POST` | `/api/posts` | `title`, `body`, `date?`, `category?`, `slug?` |
| `POST` | `/api/contact` | `name`, `email`, `message` → `data/messages.jsonl` |
| `GET` | `/api/health` | – |

Slug không hợp lệ / có `/`, `..` sẽ tự rơi về slug sinh từ tiêu đề (`đ` → `d`, bỏ dấu tiếng Việt).

## Cấu trúc

```
app.py                 server tĩnh + API (stdlib, có markdown renderer)
index.html             trang About (nội dung gốc, chỉ đổi tên/giới thiệu)
public/                blog.html, write.html, post.html, contact.html
posts/                 bài viết markdown (tự tạo khi lưu bài đầu tiên)
static/                theme.css (nền tuyết + ruy băng), nav.css, post.css, blog.css, style.css
js/theme.js            sinh nền tuyết động + badge "50 лет Победы"
img/icon.png           logo gấu bắc cực (crop từ ảnh Wikimedia, vòng ruy băng 1945–1995)
img/polar-bear-bg.jpg  ảnh nền
data/messages.jsonl    tin nhắn gửi từ form (tự tạo khi có tin đầu tiên)
tests/test_app.py      unittest (contact API + posts API + trang chủ)
```

## Test

```bash
python -m unittest discover -s tests -v      # 7 tests
```

## Ghi chú

- **Theme tối một chiều** (`data-theme="dark"` luôn được set trong `<head>` từng trang), không còn switch sáng/tối.
- **Ảnh**: logo cắt từ [Polar Bear AdF.jpg](https://commons.wikimedia.org/wiki/File:Polar_Bear_AdF.jpg) của Arturo de Frias Marques — **CC BY-SA 4.0** (đã ghi credit ở cuối trang About); ảnh nền *Polar bears near north pole* là public domain (Wikimedia Commons).
- `static/post.css` vẫn khai báo font `Helmet` / `Space Mono` trỏ tới file `.ttf` không tồn tại — bản gốc cũng 404 đúng vậy, trình duyệt tự fallback về font hệ thống.
- Các link `x.com/trongkhang/status/...` là link gốc đã đổi handle nên sẽ không mở được; sửa trong file HTML nếu cần.
- Gỡ bài: xoá file `posts/<slug>.md`.
