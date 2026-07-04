import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const regex = /const lines = text\.split\('\\n'\);[\s\S]*?const m3uText = rewrittenLines\.join\('\\n'\);/g;
if (regex.test(content)) {
    content = content.replace(regex, "const m3uText = text;");
    fs.writeFileSync('server.ts', content);
    console.log("Patched server.ts using regex");
} else {
    console.log("Regex not found");
}
