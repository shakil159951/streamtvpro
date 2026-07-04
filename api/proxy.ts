import type { VercelRequest, VercelResponse } from '@vercel/node';
import https from 'https';
import http from 'http';


// Basic Rate Limiting
const rateLimit = new Map<string, number>();
const LIMIT = 200; // max requests per minute

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

export default function handler(req: VercelRequest, res: VercelResponse) {
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    if (typeof ip === 'string' && !checkRateLimit(ip)) {
        return res.status(429).send("Too Many Requests");
    }

    // Return CORS headers immediately for OPTIONS requests
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Range");
    
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    const targetUrl = req.query.url as string;
    const customReferer = req.query.referer as string;
    const customUserAgent = req.query.useragent as string;
    
    if (!targetUrl) {
      return res.status(400).send("No target URL provided.");
    }
    
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
    
    // Override sensitive headers
    headers["host"] = urlObj.host;
    headers["origin"] = urlObj.origin;
    headers["referer"] = customReferer || (urlObj.origin + "/");
    
    if (customUserAgent) {
        headers["user-agent"] = customUserAgent;
    } else if (!headers["user-agent"]) {
        headers["user-agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36";
    }
    
    delete headers.cookie;
    
    const requestOptions = {
        headers,
        method: req.method,
        timeout: 60000 
    };

    const client = targetUrl.startsWith("https") ? https : http;
    
    const proxyReq = client.request(targetUrl, requestOptions, (proxyRes) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Range");
        
        if (proxyRes.statusCode) {
            res.status(proxyRes.statusCode);
        }
        
        for (const [key, value] of Object.entries(proxyRes.headers)) {
            if (value && !key.toLowerCase().startsWith("access-control-")) {
                try {
                  if (key.toLowerCase() === 'location') {
                      let loc = value as string;
                      if (!loc.startsWith('http')) {
                          loc = new URL(loc, targetUrl).href;
                      }
                      res.setHeader(key, `/api/proxy?url=${encodeURIComponent(loc)}${req.query.rewrite === '1' ? '&rewrite=1' : ''}`);
                  } else {
                      res.setHeader(key, value);
                  }
                } catch(e) {}
            }
        }
        
        const contentType = proxyRes.headers['content-type']?.toLowerCase() || '';
        const isM3u8 = (contentType.includes('mpegurl') || targetUrl.includes('.m3u8')) && req.query.rewrite === '1';
        
        if (isM3u8 && proxyRes.statusCode === 200) {
            let body = '';
            proxyRes.setEncoding('utf8');
            proxyRes.on('data', (chunk) => {
                body += chunk;
            });
            proxyRes.on('end', () => {
                const lines = body.split('\n');
                const rewritten = lines.map(line => {
                    const trimmed = line.trim();
                    if (trimmed && !trimmed.startsWith('#')) {
                        try {
                            const absUrl = new URL(trimmed, targetUrl).href;
                            return `/api/proxy?url=${encodeURIComponent(absUrl)}&rewrite=1`;
                        } catch(e) {
                            return line;
                        }
                    } else if (trimmed.startsWith('#EXT-X-KEY:')) {
                        return line.replace(/URI="([^"]+)"/, (match, uri) => {
                            try {
                                const absUrl = new URL(uri, targetUrl).href;
                                return `URI="/api/proxy?url=${encodeURIComponent(absUrl)}&rewrite=1"`;
                            } catch(e) {
                                return match;
                            }
                        });
                    }
                    return line;
                }).join('\n');
                res.send(rewritten);
            });
            return;
        }

        proxyRes.pipe(res);
    });
    
    proxyReq.on("error", (err) => {
        if (!res.headersSent) {
            res.status(502).send("Proxy Error: " + err.message);
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
