import json
import os
import re
import threading
import unicodedata
from datetime import datetime, timezone
from html import escape
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = os.path.dirname(os.path.abspath(__file__))
MESSAGES = os.path.join(ROOT, "data", "messages.jsonl")
POSTS = Path(ROOT) / "posts"
MAX_BODY = 64 * 1024
_write_lock = threading.Lock()


# ---------------------------------------------------------------- markdown
def _inline(text):
    text = escape(text)
    text = re.sub(r"!\[([^\]]*)\]\(([^)\s]+)\)", r'<img src="\2" alt="\1">', text)
    text = re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", r'<a href="\2">\1</a>', text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<!\*)\*([^*\n]+)\*(?!\*)", r"<em>\1</em>", text)
    text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
    return text


def md_to_html(text):
    out = []
    code_lines = []
    in_code = False
    list_type = None

    def close_list():
        nonlocal list_type
        if list_type:
            out.append(f"</{list_type}>")
            list_type = None

    for raw in text.splitlines():
        line = raw.rstrip()
        if line.strip().startswith("```"):
            if in_code:
                out.append("<pre><code>" + escape("\n".join(code_lines)) + "</code></pre>")
                code_lines = []
                in_code = False
            else:
                close_list()
                in_code = True
            continue
        if in_code:
            code_lines.append(raw)
            continue
        if not line.strip():
            close_list()
            continue
        m = re.match(r"^(#{1,6})\s+(.*)$", line)
        if m:
            close_list()
            level = len(m.group(1))
            out.append(f"<h{level}>{_inline(m.group(2))}</h{level}>")
            continue
        if re.fullmatch(r"(\*\s*){3,}|(-\s*){3,}|(_\s*){3,}", line.strip()):
            close_list()
            out.append("<hr>")
            continue
        if line.lstrip().startswith(">"):
            close_list()
            out.append("<blockquote>" + _inline(line.lstrip("> ").strip()) + "</blockquote>")
            continue
        m = re.match(r"^\s*[-*+]\s+(.*)$", line)
        if m:
            if list_type != "ul":
                close_list()
                out.append("<ul>")
                list_type = "ul"
            out.append("<li>" + _inline(m.group(1)) + "</li>")
            continue
        m = re.match(r"^\s*\d+[.)]\s+(.*)$", line)
        if m:
            if list_type != "ol":
                close_list()
                out.append("<ol>")
                list_type = "ol"
            out.append("<li>" + _inline(m.group(1)) + "</li>")
            continue
        close_list()
        out.append("<p>" + _inline(line) + "</p>")

    if in_code:
        out.append("<pre><code>" + escape("\n".join(code_lines)) + "</code></pre>")
    close_list()
    return "\n".join(out)


def slugify(title):
    title = title.replace("đ", "d").replace("Đ", "D")
    ascii_title = unicodedata.normalize("NFKD", title).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_title.lower()).strip("-")
    return slug[:80] or "post-" + datetime.now().strftime("%Y%m%d%H%M%S")


def _parse_post(path):
    text = path.read_text(encoding="utf-8")
    meta, body = {}, text
    if text.startswith("---"):
        parts = text.split("---", 2)
        if len(parts) == 3:
            for line in parts[1].strip().splitlines():
                if ":" in line:
                    key, value = line.split(":", 1)
                    meta[key.strip().lower()] = value.strip()
            body = parts[2].lstrip("\n")
    meta.setdefault("title", path.stem)
    meta.setdefault("date", "")
    meta.setdefault("category", "reflection")
    return meta, body


def _excerpt(body, limit=150):
    for line in body.splitlines():
        clean = re.sub(r"[#>*`\[\]]", "", line).strip()
        if clean:
            return clean[:limit] + ("..." if len(clean) > limit else "")
    return ""


def list_posts():
    if not POSTS.is_dir():
        return []
    posts = []
    for path in POSTS.glob("*.md"):
        meta, body = _parse_post(path)
        posts.append(
            {
                "slug": path.stem,
                "title": meta["title"],
                "date": meta["date"],
                "category": meta["category"],
                "excerpt": _excerpt(body),
            }
        )
    posts.sort(key=lambda p: (p["date"], p["slug"]), reverse=True)
    return posts


# ---------------------------------------------------------------- server
class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def do_GET(self):
        path = self.path.split("?")[0]
        if path == "/api/health":
            return self._json(200, {"ok": True})
        if path == "/api/posts":
            return self._json(200, {"posts": list_posts()})
        if path.startswith("/api/posts/"):
            slug = path[len("/api/posts/"):]
            if not re.fullmatch(r"[a-z0-9-]{1,80}", slug):
                return self._json(400, {"error": "invalid slug"})
            file = POSTS / f"{slug}.md"
            if not file.is_file():
                return self._json(404, {"error": "post not found"})
            meta, body = _parse_post(file)
            return self._json(
                200,
                {
                    "slug": slug,
                    "title": meta["title"],
                    "date": meta["date"],
                    "category": meta["category"],
                    "excerpt": _excerpt(body),
                    "html": md_to_html(body),
                    "raw": body,
                },
            )
        super().do_GET()

    def do_POST(self):
        path = self.path.split("?")[0]
        if path == "/api/contact":
            return self._contact()
        if path == "/api/posts":
            return self._create_post()
        return self._json(404, {"error": "not found"})

    def _read_json(self):
        try:
            length = int(self.headers.get("content-length") or 0)
        except ValueError:
            return None, self._json(400, {"error": "bad content-length"})
        if length <= 0 or length > MAX_BODY:
            return None, self._json(400, {"error": "body must be 1 byte to 64 KB"})
        try:
            return json.loads(self.rfile.read(length)), None
        except ValueError:
            return None, self._json(400, {"error": "invalid JSON"})

    def _contact(self):
        data, err = self._read_json()
        if err:
            return
        try:
            entry = {k: str(data.get(k, "")).strip() for k in ("name", "email", "message")}
        except AttributeError:
            return self._json(400, {"error": "invalid JSON"})
        if not all(entry.values()):
            return self._json(400, {"error": "name, email and message are required"})
        if len(entry["name"]) > 80 or len(entry["email"]) > 200 or len(entry["message"]) > 4000:
            return self._json(400, {"error": "field too long"})
        if "@" not in entry["email"]:
            return self._json(400, {"error": "invalid email"})
        entry["received_at"] = datetime.now(timezone.utc).isoformat()
        with _write_lock:
            os.makedirs(os.path.dirname(MESSAGES), exist_ok=True)
            with open(MESSAGES, "a", encoding="utf-8") as fh:
                fh.write(json.dumps(entry, ensure_ascii=False) + "\n")
        return self._json(200, {"ok": True})

    def _create_post(self):
        data, err = self._read_json()
        if err:
            return
        if not isinstance(data, dict):
            return self._json(400, {"error": "invalid JSON"})
        title = str(data.get("title", "")).strip()
        body = str(data.get("body", "")).strip()
        if not title or not body:
            return self._json(400, {"error": "title and body are required"})
        if len(title) > 200 or len(body) > 50000:
            return self._json(400, {"error": "post too long"})
        slug = str(data.get("slug", "")).strip()
        if not re.fullmatch(r"[a-z0-9-]{1,80}", slug):
            slug = slugify(title)
        date = str(data.get("date", "")).strip() or datetime.now().strftime("%Y-%m-%d")
        category = str(data.get("category", "")).strip() or "reflection"
        if category not in ("technical", "reflection", "article"):
            category = "reflection"
        target = POSTS / f"{slug}.md"
        if target.resolve().parent != POSTS.resolve():
            return self._json(400, {"error": "invalid slug"})
        with _write_lock:
            POSTS.mkdir(parents=True, exist_ok=True)
            target.write_text(
                f"---\ntitle: {title}\ndate: {date}\ncategory: {category}\n---\n\n{body}\n",
                encoding="utf-8",
            )
        return self._json(200, {"ok": True, "slug": slug})

    def _json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("content-type", "application/json; charset=utf-8")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def end_headers(self):
        self.send_header("cache-control", "no-cache")
        super().end_headers()


def main():
    port = int(os.environ.get("PORT", "8000"))
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"serving {ROOT} at http://localhost:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
