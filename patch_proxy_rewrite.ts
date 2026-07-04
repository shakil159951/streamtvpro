import fs from 'fs';

let content = fs.readFileSync('api/proxy.ts', 'utf8');

const targetStr = `const isM3u8 = contentType.includes('mpegurl') || targetUrl.includes('.m3u8');`;
const replacementStr = `const isM3u8 = (contentType.includes('mpegurl') || targetUrl.includes('.m3u8')) && req.query.rewrite === '1';`;

if (content.includes(targetStr)) {
    content = content.replace(targetStr, replacementStr);
    fs.writeFileSync('api/proxy.ts', content);
    console.log("Patched proxy.ts to only rewrite when rewrite=1");
} else {
    console.log("Could not find proxy.ts target string");
}
