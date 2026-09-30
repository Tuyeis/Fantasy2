"""Tiny local receiver: POST /save?name=x.png with a data URL body -> writes into ./shots/."""
import base64, os
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs
os.makedirs("shots", exist_ok=True)
class H(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204); self.send_header("Access-Control-Allow-Origin", "*"); self.send_header("Access-Control-Allow-Methods", "POST"); self.send_header("Access-Control-Allow-Headers", "*"); self.end_headers()
    def do_POST(self):
        name = os.path.basename(parse_qs(urlparse(self.path).query).get("name", ["shot.png"])[0])
        body = self.rfile.read(int(self.headers["Content-Length"])).decode()
        open(os.path.join("shots", name), "wb").write(base64.b64decode(body.split(",", 1)[1]))
        self.send_response(200); self.send_header("Access-Control-Allow-Origin", "*"); self.end_headers(); self.wfile.write(b"ok")
    def log_message(self, *a): pass
HTTPServer(("127.0.0.1", 5199), H).serve_forever()
