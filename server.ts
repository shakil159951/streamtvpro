import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import https from "https";
import http from "http";
import crypto from "crypto";
import { Readable } from "stream";
import { Readable } from "stream";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use a stable key for serverless environments (Vercel)
  // so tokens remain valid across different lambda instances.
  const baseKeyStr = process.env.STREAM_SECRET_KEY || "DEFAULT_STREAM_SECURE_TOKEN_KEY_V1";
  const SECRET_KEY = crypto.createHash('sha256').update(baseKeyStr).digest();

  function encryptToken(url: string, expiresInMs: number = 5 * 60 * 1000): string {
      const expiresAt = Date.now() + expiresInMs;
      const payload = `${expiresAt}|${url}`;
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-cbc', SECRET_KEY, iv);
      let encrypted = cipher.update(payload, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return iv.toString('hex') + encrypted;
  }

  function decryptToken(token: string): string | null {
      try {
          const iv = Buffer.from(token.substring(0, 32), 'hex');
          const encrypted = token.substring(32);
          const decipher = crypto.createDecipheriv('aes-256-cbc', SECRET_KEY, iv);
          let decrypted = decipher.update(encrypted, 'hex', 'utf8');
          decrypted += decipher.final('utf8');
          
          const splitIdx = decrypted.indexOf('|');
          if (splitIdx === -1) return null;
          
          const expiresAt = parseInt(decrypted.substring(0, splitIdx), 10);
          if (Date.now() > expiresAt) {
              return null; // Expired
          }
          
          return decrypted.substring(splitIdx + 1);
      } catch {
          return null;
      }
  }

  // Basic Rate Limiting
  const rateLimit = new Map<string, number>();
  const LIMIT = 300; // max requests per minute

  function checkRateLimit(ip: string): boolean {
      const now = Date.now();
      const windowStart = now - 60000;
      for (const [key, timestamp] of rateLimit.entries()) {
          if (timestamp < windowStart) rateLimit.delete(key);
      }
      const count = Array.from(rateLimit.entries()).filter(([k, t]) => k.startsWith(ip) && t > windowStart).length;
      if (count >= LIMIT) return false;
      rateLimit.set(`${ip}-${now}`, now);
      return true;
  }

  // Validates if the request comes from our own app
  function validateInternalRequest(req: express.Request, res: express.Response): boolean {
      const origin = req.headers.origin || '';
      const referer = req.headers.referer || '';
      const host = (req.headers['x-forwarded-host'] || req.headers.host || '') as string;
      
      // Check if origin matches host (allow localhost for dev/preview)
      if (origin) {
          try {
              const originHost = new URL(origin).host;
              if (originHost !== host && !host.includes('localhost') && !originHost.includes('localhost') && !originHost.includes('ais-dev') && !originHost.includes('ais-pre')) {
                  res.status(403).send("Forbidden: Invalid Origin");
                  return false;
              }
          } catch(e) {}
      }
      return true;
  }

  app.use("/api", (req, res, next) => {
      const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
      if (typeof ip === 'string' && !checkRateLimit(ip)) {
          return res.status(429).send("Too Many Requests");
      }
      if (!validateInternalRequest(req, res)) return;
      next();
  });

  // Caching
  const playlistCache = new Map<string, { m3uText: string, expiresAt: number }>();

  app.get("/api/channels", async (req, res) => {
    let targetUrl = req.query.url as string;
    if (!targetUrl || targetUrl === '/api/playlists') {
        targetUrl = 'https://raw.githubusercontent.com/shakil951/PlaylistCheck/refs/heads/main/combined_playlist.m3u';
    }

    const cached = playlistCache.get(targetUrl);
    if (cached && cached.expiresAt > Date.now()) {
        res.setHeader('Content-Type', 'audio/x-mpegurl');
        res.setHeader('Access-Control-Allow-Origin', '*');
        return res.send(cached.m3uText);
    }

    try {
        const fetchRes = await fetch(targetUrl);
        if (!fetchRes.ok) throw new Error('Fetch failed');
        const text = await fetchRes.text();
        
        const m3uText = text;
        playlistCache.set(targetUrl, {
            m3uText,
            expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes cache
        });
        
        res.setHeader('Content-Type', 'audio/x-mpegurl');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.send(m3uText);
    } catch (err) {
        if (cached) {
            res.setHeader('Content-Type', 'audio/x-mpegurl');
            return res.send(cached.m3uText);
        }
        res.status(500).send('Failed to fetch playlist');
    }
  });

  app.get("/api/playlists", (req, res) => {
      // Legacy redirect to /api/channels
      res.redirect('/api/channels');
  });

  app.get("/api/live/:id", (req, res) => {
      const channelId = req.params.id;
      const originalUrl = decryptToken(channelId);
      
      if (!originalUrl) {
          return res.status(404).send('Channel not found or expired. Please refresh the playlist.');
      }
      
      // Generate a short-lived token to start playback
      const token = encryptToken(originalUrl, 5 * 60 * 1000); // 5 minutes
      res.redirect(`/api/play/${token}`);
  });

  app.get(["/api/play/:token", "/api/stream/:token"], (req, res) => {
      const token = req.params.token;
      const originalUrl = decryptToken(token);
      
      if (!originalUrl) {
          return res.status(403).send('Invalid or expired playback token.');
      }
      
      handleProxyRequest(originalUrl, req, res);
  });

  // Simple proxy route
  app.all("/api/proxy", (req, res) => {
    const targetUrl = (req.query.url || req.query.u) as string;
    if (!targetUrl) {
      return res.status(400).send("No target URL provided.");
    }
    handleProxyRequest(targetUrl, req, res);
  });

  



async function handleProxyRequest(targetUrl: string, req: express.Request, res: express.Response) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS, HEAD");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Range, Authorization");
    res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range, Content-Type, Accept-Ranges");
    
    if (req.method === "OPTIONS") {
        res.setHeader("Access-Control-Max-Age", "86400");
        return res.status(200).end();
    }

    let urlObj: URL;
    try {
        urlObj = new URL(targetUrl);
    } catch (e) {
        return res.status(400).send("Invalid target URL format.");
    }

    const proxyUrlParams = new URLSearchParams();
    for (const [k, v] of Object.entries(req.query)) {
        if (k !== 'url' && k !== 'u' && k !== 'h' && k !== 'referer' && k !== 'useragent' && v !== undefined) {
            if (Array.isArray(v)) {
                v.forEach(val => proxyUrlParams.append(k, String(val)));
            } else {
                proxyUrlParams.append(k, String(v));
            }
        }
    }

    const fetchHeaders = new Headers();
    const allowedHeaders = ['user-agent', 'accept', 'accept-language', 'cookie', 'authorization', 'range'];
    
    for (const [key, value] of Object.entries(req.headers)) {
        const lowerKey = key.toLowerCase();
        if (value !== undefined && allowedHeaders.includes(lowerKey)) {
             if (Array.isArray(value)) {
                 fetchHeaders.set(lowerKey, value[0]);
             } else {
                 fetchHeaders.set(lowerKey, value as string);
             }
        }
    }

    const customHeadersBase64 = req.query.h as string;
    let hasCustomReferer = false;
    let hasCustomOrigin = false;

    if (customHeadersBase64) {
        try {
            const decodedHeaders = JSON.parse(Buffer.from(customHeadersBase64, 'base64').toString('utf-8'));
            for (const [k, v] of Object.entries(decodedHeaders)) {
                if (v !== undefined && typeof v === 'string') {
                    const lowerK = k.toLowerCase();
                    fetchHeaders.set(lowerK, v);
                    if (lowerK === 'referer') hasCustomReferer = true;
                    if (lowerK === 'origin') hasCustomOrigin = true;
                }
            }
        } catch (e) {
            console.warn("Failed to decode custom headers:", e);
        }
    } else {
        if (req.query.referer) {
            fetchHeaders.set("referer", req.query.referer as string);
            hasCustomReferer = true;
        }
        if (req.query.useragent) fetchHeaders.set("user-agent", req.query.useragent as string);
        if (req.query.origin) {
            fetchHeaders.set("origin", req.query.origin as string);
            hasCustomOrigin = true;
        }
    }
    
    if (!fetchHeaders.has("user-agent")) {
        fetchHeaders.set("user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36");
    }

    if (!hasCustomReferer) {
        fetchHeaders.set("referer", urlObj.origin + "/");
    }
    if (!hasCustomOrigin) {
        fetchHeaders.set("origin", urlObj.origin);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    req.on('close', () => {
        controller.abort();
    });

    try {
        const proxyRes = await fetch(targetUrl, {
            method: req.method,
            headers: fetchHeaders,
            redirect: 'follow',
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        const finalUrl = proxyRes.url || targetUrl;
        const contentType = proxyRes.headers.get('content-type')?.toLowerCase() || '';
        const isM3u8 = contentType.includes('mpegurl') || contentType.includes('vnd.apple.mpegurl') || finalUrl.includes('.m3u8');

        res.status(proxyRes.status);

        const headersToPreserve = ['content-type', 'cache-control', 'accept-ranges', 'etag', 'last-modified', 'content-length', 'content-range'];
        
        proxyRes.headers.forEach((value, key) => {
            const lowerKey = key.toLowerCase();
            if (headersToPreserve.includes(lowerKey)) {
                if (isM3u8 && (lowerKey === 'content-length' || lowerKey === 'etag' || lowerKey === 'last-modified' || lowerKey === 'content-range')) {
                    return; 
                }
                res.setHeader(key, value);
            }
        });

        const buildRewrittenUrl = (absUrl: string) => {
            let rewrittenUrl = `/api/proxy?u=${encodeURIComponent(absUrl)}`;
            if (customHeadersBase64) rewrittenUrl += `&h=${encodeURIComponent(customHeadersBase64)}`;
            const extraParams = proxyUrlParams.toString();
            if (extraParams) rewrittenUrl += `&${extraParams}`;
            return rewrittenUrl;
        };

        if (isM3u8 && proxyRes.status >= 200 && proxyRes.status < 300) {
            const text = await proxyRes.text();
            const lines = text.split('\n');
            const rewritten = lines.map(line => {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#')) {
                    try {
                        const absUrl = new URL(trimmed, finalUrl).href;
                        return buildRewrittenUrl(absUrl);
                    } catch(e) {
                        return line;
                    }
                } else if (trimmed.startsWith('#EXT')) {
                    return line.replace(/URI="([^"]+)"/g, (match, uri) => {
                        try {
                            const absUrl = new URL(uri, finalUrl).href;
                            return `URI="${buildRewrittenUrl(absUrl)}"`;
                        } catch(e) {
                            return match;
                        }
                    });
                }
                return line;
            }).join('\n');
            res.setHeader('Content-Length', Buffer.byteLength(rewritten).toString());
            return res.send(rewritten);
        }

        if (proxyRes.body) {
            
            const nodeStream = Readable.fromWeb(proxyRes.body);
            
            nodeStream.on('error', (streamErr: any) => {
                console.error("Stream pipe error:", streamErr);
                if (!res.headersSent) {
                    res.status(502).end();
                } else {
                    res.end();
                }
            });

            nodeStream.pipe(res);
            
            req.on('close', () => {
                nodeStream.destroy();
            });
        } else {
            res.end();
        }

    } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            if (!res.headersSent) res.status(504).send("Proxy timeout fetching target URL");
        } else {
            if (!res.headersSent) res.status(502).send("Proxy Error: " + err.message);
        }
    }
}

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
