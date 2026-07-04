import fs from 'fs';

let content = fs.readFileSync('api/proxy.ts', 'utf8');

const targetStr1 = `                            return \`/api/proxy?url=\${encodeURIComponent(absUrl)}\`;`;
const replacementStr1 = `                            return \`/api/proxy?url=\${encodeURIComponent(absUrl)}&rewrite=1\`;`;

const targetStr2 = `                                return \`URI="/api/proxy?url=\${encodeURIComponent(absUrl)}"\`;`;
const replacementStr2 = `                                return \`URI="/api/proxy?url=\${encodeURIComponent(absUrl)}&rewrite=1"\`;`;

if (content.includes(targetStr1) && content.includes(targetStr2)) {
    content = content.replace(targetStr1, replacementStr1);
    content = content.replace(targetStr2, replacementStr2);
    fs.writeFileSync('api/proxy.ts', content);
    console.log("Patched proxy.ts M3U body rewrite");
} else {
    console.log("Could not find proxy.ts target strings for M3U body");
}
