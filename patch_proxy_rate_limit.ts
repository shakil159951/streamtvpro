import fs from 'fs';

let content = fs.readFileSync('api/proxy.ts', 'utf8');

const rateLimitCode = `
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
    rateLimit.set(\`\${ip}-\${now}\`, now);
    return true;
}
`;

const handlerStart = `export default function handler(req: VercelRequest, res: VercelResponse) {`;
const rateLimitCheck = `
    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
    if (typeof ip === 'string' && !checkRateLimit(ip)) {
        return res.status(429).send("Too Many Requests");
    }
`;

if (!content.includes('checkRateLimit')) {
    content = content.replace(handlerStart, rateLimitCode + '\n' + handlerStart + rateLimitCheck);
    fs.writeFileSync('api/proxy.ts', content);
    console.log("Patched api/proxy.ts with rate limit");
}

let serverContent = fs.readFileSync('server.ts', 'utf8');
if (!serverContent.includes('checkRateLimit')) {
    const serverRateLimitCheck = `
  app.use("/api", (req, res, next) => {
      const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
      if (typeof ip === 'string' && !checkRateLimit(ip)) {
          return res.status(429).send("Too Many Requests");
      }
      next();
  });
`;
    const proxyStart = `  // Simple proxy route`;
    serverContent = serverContent.replace(proxyStart, rateLimitCode + '\n' + serverRateLimitCheck + '\n' + proxyStart);
    
    // Also add the new /api/playlists route
    const playlistRoute = `
  app.get("/api/playlists", (req, res) => {
    const targetUrl = 'https://raw.githubusercontent.com/shakil951/PlaylistCheck/refs/heads/main/combined_playlist.m3u';
    https.get(targetUrl, (proxyRes) => {
        res.setHeader('Content-Type', 'audio/x-mpegurl');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(proxyRes.statusCode || 200);
        proxyRes.pipe(res);
    }).on('error', (err) => {
        res.status(500).send('Failed to fetch default playlist');
    });
  });
`;
    serverContent = serverContent.replace(proxyStart, playlistRoute + '\n' + proxyStart);
    fs.writeFileSync('server.ts', serverContent);
    console.log("Patched server.ts with rate limit and playlist API");
}

