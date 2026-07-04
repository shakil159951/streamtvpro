import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const target = `    proxyReq.on("error", (err) => {
        if (!res.headersSent) {
            res.status(502).send("Proxy Error");
        }
    });`;

const replace = `    proxyReq.on("error", (err) => {
        console.error("Proxy error for target:", targetUrl, err);
        if (!res.headersSent) {
            res.status(502).send("Proxy Error: " + err.message);
        }
    });`;

if (content.includes(target)) {
    content = content.replace(target, replace);
    fs.writeFileSync('server.ts', content);
    console.log("Patched server proxy error log");
} else {
    console.log("Could not find proxy error target");
}
