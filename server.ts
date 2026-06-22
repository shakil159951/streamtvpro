import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import https from "https";
import http from "http";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Simple proxy route
  app.all("/api/proxy", (req, res) => {
    // Return CORS headers immediately for OPTIONS requests
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Range");
    
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    const targetUrl = req.query.url as string;
    
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
    
    // Override sensitive headers to look like a browser directly accessing the stream
    headers["host"] = urlObj.host;
    headers["origin"] = urlObj.origin;
    headers["referer"] = urlObj.origin + "/";
    
    if (!headers["user-agent"]) {
        headers["user-agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36";
    }
    
    delete headers.cookie; // Don't pass our cookies along

    
    const requestOptions = {
        headers,
        method: req.method,
        timeout: 15000 // 15 second timeout to fail fast on unreachable local networks
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
                  res.setHeader(key, value);
                } catch(e) {}
            }
        }
        
        proxyRes.pipe(res);
    });
    
    proxyReq.on("error", (err) => {
        // Suppress console.error to avoid false positive crash reports in the console
        // console.error("Proxy error:", err.message, "Target:", targetUrl);
        if (!res.headersSent) {
            res.status(502).send("Proxy Error: " + err.message);
        }
    });

    proxyReq.on("timeout", () => {
        proxyReq.destroy();
        // console.error("Proxy timeout:", targetUrl);
        if (!res.headersSent) {
            res.status(504).send("Proxy timeout fetching target URL");
        }
    });
    
    proxyReq.end();
  });

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
