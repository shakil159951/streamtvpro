import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Readable } from "stream";

// Known streaming sites that require specific Origin/Referer headers
const SITE_HEADERS: Record<string, { origin: string; referer: string }> = {
  'toffe.live': { origin: 'https://www.toffe.live', referer: 'https://www.toffe.live/' },
  'toffee.tv': { origin: 'https://www.toffee.tv', referer: 'https://www.toffee.tv/' },
  'toffeelive': { origin: 'https://www.toffe.live', referer: 'https://www.toffe.live/' },
  'bioscopelive': { origin: 'https://www.bioscopelive.com', referer: 'https://www.bioscopelive.com/' },
  'hoichoi': { origin: 'https://www.hoichoi.tv', referer: 'https://www.hoichoi.tv/' },
  'chorki': { origin: 'https://www.chorki.com', referer: 'https://www.chorki.com/' },
};

function getSiteHeaders(targetUrl: string) {
  try {
    const hostname = new URL(targetUrl).hostname.toLowerCase();
    for (const [key, headers] of Object.entries(SITE_HEADERS)) {
      if (hostname.includes(key)) return headers;
    }
  } catch {}
  return null;
}

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 2): Promise<Response> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok || res.status === 403 || res.status === 404) return res;
      if (res.status >= 500 && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
        continue;
      }
      return res;
    } catch (e: any) {
      lastError = e;
      if (attempt < maxRetries && e.name !== 'AbortError') {
        await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
        continue;
      }
      throw e;
    }
  }
  throw lastError || new Error('Fetch failed');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Playlist caching
  const playlistCache = new Map<string, { text: string; expiresAt: number }>();

  // CORS middleware for API routes
  app.use("/api", (req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS, HEAD");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Range, Authorization");
    if (req.method === "OPTIONS") return res.status(200).end();
    next();
  });

  // Channel/playlist fetcher
  app.get("/api/channels", async (req, res) => {
    let targetUrl = req.query.url as string;
    if (!targetUrl || targetUrl === '/api/playlists') {
      targetUrl = 'https://raw.githubusercontent.com/shakil951/PlaylistCheck/refs/heads/main/combined_playlist.m3u';
    }

    const cached = playlistCache.get(targetUrl);
    if (cached && cached.expiresAt > Date.now()) {
      res.setHeader('Content-Type', 'audio/x-mpegurl');
      return res.send(cached.text);
    }

    try {
      const fetchRes = await fetch(targetUrl);
      if (!fetchRes.ok) throw new Error('Fetch failed');
      const text = await fetchRes.text();
      playlistCache.set(targetUrl, { text, expiresAt: Date.now() + 10 * 60 * 1000 });
      res.setHeader('Content-Type', 'audio/x-mpegurl');
      res.send(text);
    } catch {
      if (cached) {
        res.setHeader('Content-Type', 'audio/x-mpegurl');
        return res.send(cached.text);
      }
      res.status(500).send('Failed to fetch playlist');
    }
  });

  app.get("/api/playlists", (_req, res) => res.redirect('/api/channels'));

  // Proxy endpoint
  app.all("/api/proxy", async (req, res) => {
    const targetUrl = (req.query.url || req.query.u) as string;
    if (!targetUrl) return res.status(400).send("No target URL provided.");

    const urlObj = new URL(req.url, `http://${req.headers.host}`);

    const fetchHeaders = new Headers();
    const allowedHeaders = ['accept', 'accept-language', 'range'];
    for (const [key, value] of Object.entries(req.headers)) {
      if (value !== undefined && allowedHeaders.includes(key.toLowerCase())) {
        fetchHeaders.set(key.toLowerCase(), Array.isArray(value) ? value[0] : value as string);
      }
    }

    // Parse custom headers
    const customHeadersBase64 = req.query.h as string;
    let hasCustomOrigin = false;
    let hasCustomReferer = false;

    if (customHeadersBase64) {
      try {
        const decoded = JSON.parse(Buffer.from(customHeadersBase64, 'base64').toString('utf-8'));
        for (const [k, v] of Object.entries(decoded)) {
          if (v && typeof v === 'string') {
            const lk = k.toLowerCase();
            fetchHeaders.set(lk, v);
            if (lk === 'origin') hasCustomOrigin = true;
            if (lk === 'referer') hasCustomReferer = true;
          }
        }
      } catch (e) { console.warn("Failed to decode headers:", e); }
    } else {
      if (req.query.referer) { fetchHeaders.set("referer", req.query.referer as string); hasCustomReferer = true; }
      if (req.query.useragent) fetchHeaders.set("user-agent", req.query.useragent as string);
      if (req.query.cookie) fetchHeaders.set("cookie", req.query.cookie as string);
      if (req.query.origin) { fetchHeaders.set("origin", req.query.origin as string); hasCustomOrigin = true; }
    }

    // Auto-detect site-specific headers for Toffee, Bioscope, etc.
    const siteHeaders = getSiteHeaders(targetUrl);
    if (siteHeaders) {
      if (!hasCustomOrigin) fetchHeaders.set('origin', siteHeaders.origin);
      if (!hasCustomReferer) fetchHeaders.set('referer', siteHeaders.referer);
    }

    // Bangladesh IP headers for geo-restricted streams
    fetchHeaders.set('x-forwarded-for', '103.112.150.1');
    fetchHeaders.set('x-real-ip', '103.112.150.1');
    fetchHeaders.set('client-ip', '103.112.150.1');
    fetchHeaders.set('true-client-ip', '103.112.150.1');
    fetchHeaders.set('cf-connecting-ip', '103.112.150.1');

    if (!fetchHeaders.has("user-agent")) {
      fetchHeaders.set("user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36");
    }
    if (!fetchHeaders.has('accept')) fetchHeaders.set('accept', '*/*');

    const controller = new AbortController();
    const timeoutMs = targetUrl.includes('.m3u8') || targetUrl.includes('.m3u') ? 15000 : 30000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    req.on('close', () => controller.abort());

    try {
      const proxyRes = await fetchWithRetry(targetUrl, {
        method: req.method,
        headers: fetchHeaders,
        redirect: 'follow',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const finalUrl = proxyRes.url || targetUrl;
      const contentType = proxyRes.headers.get('content-type')?.toLowerCase() || '';
      const isM3u8 = contentType.includes('mpegurl') || contentType.includes('vnd.apple.mpegurl') ||
        (contentType.includes('octet-stream') && (finalUrl.includes('.m3u8') || finalUrl.includes('.m3u'))) ||
        finalUrl.includes('.m3u8') || finalUrl.includes('.m3u');

      res.status(proxyRes.status);

      const headersToPreserve = ['content-type', 'cache-control', 'accept-ranges', 'etag', 'last-modified', 'content-length', 'content-range'];
      proxyRes.headers.forEach((value, key) => {
        const lk = key.toLowerCase();
        if (headersToPreserve.includes(lk)) {
          if (isM3u8 && ['content-length', 'etag', 'last-modified', 'content-range'].includes(lk)) return;
          res.setHeader(key, value);
        }
      });

      // Build proxy URL params for sub-requests
      const extraParams = new URLSearchParams();
      for (const [k, v] of Object.entries(req.query)) {
        if (!['url', 'u', 'h', 'referer', 'useragent', 'cookie', 'origin'].includes(k) && v !== undefined) {
          if (Array.isArray(v)) v.forEach(val => extraParams.append(k, String(val)));
          else extraParams.append(k, String(v));
        }
      }

      const buildRewrittenUrl = (absUrl: string) => {
        let rw = `/api/proxy?u=${encodeURIComponent(absUrl)}`;
        if (customHeadersBase64) rw += `&h=${encodeURIComponent(customHeadersBase64)}`;
        if (req.query.referer) rw += `&referer=${encodeURIComponent(req.query.referer as string)}`;
        if (req.query.useragent) rw += `&useragent=${encodeURIComponent(req.query.useragent as string)}`;
        if (req.query.cookie) rw += `&cookie=${encodeURIComponent(req.query.cookie as string)}`;
        const extra = extraParams.toString();
        if (extra) rw += `&${extra}`;
        return rw;
      };

      if (isM3u8 && proxyRes.status >= 200 && proxyRes.status < 300) {
        const text = await proxyRes.text();
        const rewritten = text.split('\n').map(line => {
          const trimmed = line.trim();
          if (trimmed && !trimmed.startsWith('#')) {
            try {
              const absUrl = trimmed.startsWith('http') ? trimmed : new URL(trimmed, finalUrl).href;
              return buildRewrittenUrl(absUrl);
            } catch { return line; }
          } else if (trimmed.startsWith('#EXT')) {
            return line.replace(/URI="([^"]+)"/g, (match, uri) => {
              try {
                const absUrl = uri.startsWith('http') ? uri : new URL(uri, finalUrl).href;
                return `URI="${buildRewrittenUrl(absUrl)}"`;
              } catch { return match; }
            });
          }
          return line;
        }).join('\n');
        res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
        res.setHeader('Content-Length', Buffer.byteLength(rewritten).toString());
        return res.send(rewritten);
      }

      // Stream binary content
      if (proxyRes.body) {
        const nodeStream = Readable.fromWeb(proxyRes.body as any);
        nodeStream.on('error', () => { if (!res.headersSent) res.status(502).end(); else res.end(); });
        nodeStream.pipe(res);
        req.on('close', () => nodeStream.destroy());
      } else {
        res.end();
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (!res.headersSent) {
        res.status(err.name === 'AbortError' ? 504 : 502)
          .send(err.name === 'AbortError' ? "Proxy timeout" : "Proxy Error: " + err.message);
      }
    }
  });

  // Vite dev server middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, "0.0.0.0", () => console.log(`Server running on http://localhost:${PORT}`));
}

startServer();
