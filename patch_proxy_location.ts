import fs from 'fs';

let content = fs.readFileSync('api/proxy.ts', 'utf8');

const targetStr = `                      res.setHeader(key, \`/api/proxy?url=\${encodeURIComponent(loc)}\`);`;
const replacementStr = `                      res.setHeader(key, \`/api/proxy?url=\${encodeURIComponent(loc)}\${req.query.rewrite === '1' ? '&rewrite=1' : ''}\`);`;

if (content.includes(targetStr)) {
    content = content.replace(targetStr, replacementStr);
    fs.writeFileSync('api/proxy.ts', content);
    console.log("Patched proxy.ts Location header");
} else {
    console.log("Could not find proxy.ts target string for Location");
}
