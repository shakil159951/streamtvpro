import fs from 'fs';

let content = fs.readFileSync('src/components/Player.tsx', 'utf8');

const targetStr = `            let resUrl = p + encodeURIComponent(url);`;
const replacementStr = `            let resUrl = p + encodeURIComponent(url) + '&rewrite=1';`;

if (content.includes(targetStr)) {
    content = content.replace(targetStr, replacementStr);
    fs.writeFileSync('src/components/Player.tsx', content);
    console.log("Patched Player.tsx getProxiedUrl");
} else {
    console.log("Could not find Player.tsx target string");
}
