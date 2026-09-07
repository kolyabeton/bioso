"""Loopback-only review server. Accepts just this test's video/report artifacts."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
PROOF=ROOT/'proof/biomes-v1'
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):
        super().__init__(*args,directory=str(PROOF/'site'),**kwargs)
    def do_POST(self):
        names={'/__proof/video':'terrain-tour.webm','/__proof/report':'browser-report.json'}
        if self.path not in names:
            self.send_error(404);return
        size=int(self.headers.get('Content-Length','0'))
        if size<=0 or size>100*1024*1024:
            self.send_error(413);return
        data=self.rfile.read(size)
        if self.path.endswith('report'):
            try: json.loads(data)
            except ValueError: self.send_error(400);return
        (PROOF/names[self.path]).write_bytes(data)
        self.send_response(200);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(json.dumps({'saved':names[self.path]}).encode())
ThreadingHTTPServer(('127.0.0.1',5200),Handler).serve_forever()
