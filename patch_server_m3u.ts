import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const target = `                        // Rewrite URL
                        const host = req.headers.host || '';
                        const proto = req.protocol || 'http';
                        rewrittenLines.push(\`\${proto}://\${host}/api/live/\${channelId}\`);`;

const replace = `                        // Rewrite URL to relative path
                        rewrittenLines.push(\`/api/live/\${channelId}\`);`;

if (content.includes(target)) {
    content = content.replace(target, replace);
    fs.writeFileSync('server.ts', content);
    console.log("Patched server.ts M3U rewrite to relative URL");
} else {
    console.log("Could not find server.ts M3U rewrite target");
}
