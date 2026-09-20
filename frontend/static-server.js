/* Zero-dependency static server for the pre-rendered am-jeanjean.com site.
   Serves /app/site/dist on PORT (3000), with clean URLs and trailing-slash redirects. */
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = "/app/site/dist";
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp3": "audio/mpeg",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".map": "application/json; charset=utf-8",
};

function safeJoin(base, target) {
  const p = path.normalize(path.join(base, target));
  if (!p.startsWith(base)) return null;
  return p;
}

function send(res, status, body, headers) {
  res.writeHead(status, headers || {});
  res.end(body);
}

function serveFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || "application/octet-stream";
  const stat = fs.statSync(filePath);
  const cache = ext === ".html" ? "no-cache" :
    (/(assets\/fonts|media|react|react-dom|dccore|styles\.css)/.test(filePath) ? "public, max-age=31536000, immutable" : "public, max-age=3600");
  res.writeHead(200, {
    "Content-Type": type,
    "Content-Length": stat.size,
    "Cache-Control": cache,
    "X-Content-Type-Options": "nosniff",
  });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
  let urlPath;
  try { urlPath = decodeURIComponent(req.url.split("?")[0]); }
  catch { urlPath = req.url.split("?")[0]; }

  // root
  if (urlPath === "/") {
    return serveFile(res, path.join(ROOT, "index.html"));
  }

  const full = safeJoin(ROOT, urlPath);
  if (!full) return send(res, 400, "Bad request");

  // exact file with extension
  if (path.extname(urlPath) && fs.existsSync(full) && fs.statSync(full).isFile()) {
    return serveFile(res, full);
  }

  // directory route: /poesie/ -> poesie/index.html
  if (urlPath.endsWith("/")) {
    const idx = path.join(full, "index.html");
    if (fs.existsSync(idx)) return serveFile(res, idx);
  } else {
    // /poesie (no slash) -> if directory exists, redirect to /poesie/
    if (fs.existsSync(full) && fs.statSync(full).isDirectory() &&
        fs.existsSync(path.join(full, "index.html"))) {
      res.writeHead(301, { Location: urlPath + "/" });
      return res.end();
    }
    // also handle .dc.html or legacy -> nothing; fall through
  }

  // 404 -> serve home 404 minimal
  send(res, 404, "<!doctype html><html lang=fr><head><meta charset=utf-8><title>404</title></head><body style='font-family:serif;padding:4rem;text-align:center'><h1>Page introuvable</h1><p><a href='/'>Retour à l'accueil</a></p></body></html>",
    { "Content-Type": "text/html; charset=utf-8" });
});

server.listen(PORT, HOST, () => {
  console.log(`[amj-static] serving ${ROOT} on http://${HOST}:${PORT}`);
});
