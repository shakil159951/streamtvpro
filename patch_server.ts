import fs from 'fs';

let serverTs = fs.readFileSync('server.ts', 'utf8');

const newServerTs = `import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import https from "https";
import http from "http";
import crypto from "crypto";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Generate a secret key for encrypting URLs in tokens
  const SECRET_KEY = crypto.randomBytes(32);

  function encryptToken(url: string, expiresInMs: number = 5 * 60 * 1000): string {
      const expiresAt = Date.now() + expiresInMs;
      const payload = \`\${expiresAt}|\${url}\`;
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
      rateLimit.set(\`\${ip}-\${now}\`, now);
      return true;
  }

  // Validates if the request comes from our own app
  function validateInternalRequest(req: express.Request, res: express.Response): boolean {
      const referer = req.headers.referer || '';
      const origin = req.headers.origin || '';
      const host = req.headers.host || '';
      
      // Some players don't send referer/origin, but if they do, they must match our host
      if (origin && !origin.includes(host)) {
          res.status(403).send("Forbidden: Invalid Origin");
          return false;
      }
      if (referer && !referer.includes(host)) {
          res.status(403).send("Forbidden: Invalid Referer");
          return false;
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
  const channelCache = new Map<string, string>(); // channelId -> originalUrl

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
        
        const lines = text.split('\\n');
        const rewrittenLines = [];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith('#EXTINF:')) {
                rewrittenLines.push(lines[i]);
                // Look for the URL line
                let j = i + 1;
                while (j < lines.length) {
                    const nextLine = lines[j].trim();
                    if (nextLine && !nextLine.startsWith('#')) {
                        const originalUrl = nextLine;
                        const channelId = crypto.createHash('md5').update(originalUrl).digest('hex');
                        channelCache.set(channelId, originalUrl);
                        
                        // Rewrite URL
                        const host = req.headers.host || '';
                        const proto = req.protocol || 'http';
                        rewrittenLines.push(\`\${proto}://\${host}/api/live/\${channelId}\`);
                        i = j;
                        break;
                    } else {
                        rewrittenLines.push(lines[j]);
                        j++;
                    }
                }
            } else {
                rewrittenLines.push(lines[i]);
            }
        }
        
        const m3uText = rewrittenLines.join('\\n');
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
      const originalUrl = channelCache.get(channelId);
      
      if (!originalUrl) {
          return res.status(404).send('Channel not found or expired. Please refresh the playlist.');
      }
      
      // Generate a short-lived token to start playback
      const token = encryptToken(originalUrl, 5 * 60 * 1000); // 5 minutes
      res.redirect(\`/api/play/\${token}\`);
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
    const targetUrl = req.query.url as string;
    if (!targetUrl) {
      return res.status(400).send("No target URL provided.");
    }
    handleProxyRequest(targetUrl, req, res);
  });

  function handleProxyRequest(targetUrl: string, req: express.Request, res: express.Response) {
    // Return CORS headers immediately for OPTIONS requests
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Range");
    
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    const customReferer = req.query.referer as string;
    const customUserAgent = req.query.useragent as string;
    
    // Create clean headers
    const headers: Record<string, string | string[]> = {};
    for (const [key, value] of Object.entries(req.headers)) {
        if (value !== undefined) {
             headers[key] = value;
        }
    }
    
    let urlObj: URL;
    try {
        urlObj = new URL(targetUrl);
    } catch (e) {
        return res.status(400).send("Invalid target URL format.");
    }
    
    // Override sensitive headers to look like a browser directly accessing the stream
    headers["host"] = urlObj.host;
    headers["origin"] = urlObj.origin;
    headers["referer"] = customReferer || (urlObj.origin + "/");
    
    if (customUserAgent) {
        headers["user-agent"] = customUserAgent;
    } else if (!headers["user-agent"]) {
        headers["user-agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36";
    }
    
    delete headers.cookie; // Don't pass our cookies along

    const requestOptions = {
        headers,
        method: req.method,
        timeout: 60000 // 60 second timeout for large VOD playlists
    };

    const client = targetUrl.startsWith("https") ? https : http;
    
    const proxyReq = client.request(targetUrl, requestOptions, (proxyRes) => {
        // Set CORS headers
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Range");
        
        if (proxyRes.statusCode) {
            res.status(proxyRes.statusCode);
        }
        
        // Pass through mostly all headers except CORS related ones
        for (const [key, value] of Object.entries(proxyRes.headers)) {
            if (value && !key.toLowerCase().startsWith("access-control-")) {
                try {
                  if (key.toLowerCase() === 'location') {
                      let loc = value as string;
                      if (!loc.startsWith('http')) {
                          loc = new URL(loc, targetUrl).href;
                      }
                      // Protect location header with new token
                      const locToken = encryptToken(loc, 60 * 60 * 1000);
                      res.setHeader(key, \`/api/stream/\${locToken}\`);
                  } else {
                      res.setHeader(key, value);
                  }
                } catch(e) {}
            }
        }
        
        const contentType = proxyRes.headers['content-type']?.toLowerCase() || '';
        const isM3u8 = contentType.includes('mpegurl') || targetUrl.includes('.m3u8');
        
        if (isM3u8 && proxyRes.statusCode === 200) {
            let body = '';
            proxyRes.setEncoding('utf8');
            proxyRes.on('data', (chunk) => {
                body += chunk;
            });
            proxyRes.on('end', () => {
                const lines = body.split('\\n');
                const rewritten = lines.map(line => {
                    const trimmed = line.trim();
                    if (trimmed && !trimmed.startsWith('#')) {
                        try {
                            const absUrl = new URL(trimmed, targetUrl).href;
                            // 2-hour token for segments
                            const segToken = encryptToken(absUrl, 2 * 60 * 60 * 1000); 
                            return \`/api/stream/\${segToken}\`;
                        } catch(e) {
                            return line;
                        }
                    } else if (trimmed.startsWith('#EXT-X-KEY:')) {
                        return line.replace(/URI="([^"]+)"/, (match, uri) => {
                            try {
                                const absUrl = new URL(uri, targetUrl).href;
                                const keyToken = encryptToken(absUrl, 2 * 60 * 60 * 1000); 
                                return \`URI="/api/stream/\${keyToken}"\`;
                            } catch(e) {
                                return match;
                            }
                        });
                    }
                    return line;
                }).join('\\n');
                res.send(rewritten);
            });
            return;
        }

        proxyRes.pipe(res);
    });
    
    proxyReq.on("error", (err) => {
        if (!res.headersSent) {
            res.status(502).send("Proxy Error");
        }
    });

    proxyReq.on("timeout", () => {
        proxyReq.destroy();
        if (!res.headersSent) {
            res.status(504).send("Proxy timeout fetching target URL");
        }
    });
    
    req.on("close", () => {
        if (!res.writableEnded) {
            proxyReq.destroy();
        }
    });
    
    proxyReq.end();
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
    console.log(\`Server running on http://localhost:\${PORT}\`);
  });
}

startServer();
`

fs.writeFileSync('server.ts', newServerTs);
