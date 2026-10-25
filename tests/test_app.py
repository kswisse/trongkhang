import json
import os
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path

import app


class ContactApiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        app.MESSAGES = os.path.join(cls.tmp.name, "messages.jsonl")
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), app.Handler)
        cls.base = f"http://127.0.0.1:{cls.server.server_address[1]}"
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.tmp.cleanup()

    def post(self, payload):
        req = urllib.request.Request(
            self.base + "/api/contact",
            data=json.dumps(payload).encode(),
            headers={"content-type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req) as res:
                return res.status, json.loads(res.read())
        except urllib.error.HTTPError as err:
            return err.code, json.loads(err.read())

    def test_home_page_serves_the_clone(self):
        with urllib.request.urlopen(self.base + "/") as res:
            html = res.read().decode()
        self.assertIn("Trong Khang", html)
        self.assertIn('id="flappy"', html)

    def test_contact_message_is_stored(self):
        status, body = self.post({"name": "Khang", "email": "a@b.co", "message": "hi"})
        self.assertEqual((status, body), (200, {"ok": True}))
        with open(app.MESSAGES, encoding="utf-8") as fh:
            saved = json.loads(fh.readlines()[-1])
        self.assertEqual(saved["message"], "hi")
        self.assertIn("received_at", saved)

    def test_invalid_contact_message_is_rejected(self):
        def stored():
            if not os.path.exists(app.MESSAGES):
                return 0
            with open(app.MESSAGES, encoding="utf-8") as fh:
                return len(fh.readlines())

        before = stored()
        self.assertEqual(self.post({"name": "", "email": "a@b.co", "message": "x"})[0], 400)
        self.assertEqual(self.post({"name": "a", "email": "nope", "message": "x"})[0], 400)
        self.assertEqual(stored(), before)


class PostsApiTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.orig_posts = app.POSTS
        app.POSTS = Path(cls.tmp.name) / "posts"
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), app.Handler)
        cls.base = f"http://127.0.0.1:{cls.server.server_address[1]}"
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        app.POSTS = cls.orig_posts
        cls.tmp.cleanup()

    def request(self, path, payload=None):
        if payload is None:
            req = urllib.request.Request(self.base + path)
        else:
            req = urllib.request.Request(
                self.base + path,
                data=json.dumps(payload).encode(),
                headers={"content-type": "application/json"},
                method="POST",
            )
        try:
            with urllib.request.urlopen(req) as res:
                return res.status, json.loads(res.read())
        except urllib.error.HTTPError as err:
            return err.code, json.loads(err.read())

    def test_create_list_and_get_post(self):
        status, body = self.request(
            "/api/posts",
            {
                "title": "Bài viết đầu tiên",
                "body": "# Chào\n\nđây là **bài** đầu tiên\n\n- một\n- hai",
                "date": "2026-10-22",
                "category": "technical",
            },
        )
        self.assertEqual((status, body), (200, {"ok": True, "slug": "bai-viet-dau-tien"}))

        _, listing = self.request("/api/posts")
        self.assertEqual(len(listing["posts"]), 1)
        entry = listing["posts"][0]
        self.assertEqual(entry["title"], "Bài viết đầu tiên")
        self.assertEqual(entry["category"], "technical")
        self.assertTrue(entry["excerpt"].startswith("Chào"))

        _, post = self.request("/api/posts/bai-viet-dau-tien")
        self.assertEqual(post["title"], "Bài viết đầu tiên")
        self.assertIn("<strong>bài</strong>", post["html"])
        self.assertIn("<li>hai</li>", post["html"])
        self.assertEqual(post["raw"].rstrip("\n"), "# Chào\n\nđây là **bài** đầu tiên\n\n- một\n- hai")

    def test_post_is_stored_as_markdown_file(self):
        self.request("/api/posts", {"title": "Lưu file", "body": "nội dung"})
        self.assertTrue((app.POSTS / "luu-file.md").is_file())

    def test_invalid_post_requests_are_rejected(self):
        self.assertEqual(self.request("/api/posts", {"title": "", "body": "x"})[0], 400)
        self.assertEqual(self.request("/api/posts", {"title": "x", "body": ""})[0], 400)
        self.assertEqual(self.request("/api/posts", {"title": "x" * 300, "body": "y"})[0], 400)
        self.assertEqual(self.request("/api/posts/khong-ton-tai")[0], 404)
        self.assertEqual(self.request("/api/posts/..%2Fx")[0], 400)

    def test_slug_falls_back_to_title_when_invalid(self):
        _, body = self.request("/api/posts", {"title": "Đường về", "body": "x", "slug": "../x"})
        self.assertEqual(body["slug"], "duong-ve")


if __name__ == "__main__":
    unittest.main()
