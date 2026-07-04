import fs from 'fs';

let content = fs.readFileSync('src/components/Player.tsx', 'utf8');

const target1 = `style={{ display: activeEngine === 'Video.js' ? 'block' : 'none' }}`;
const replace1 = `style={{ display: activeEngine === 'Video.js' && !isDevToolsOpen ? 'block' : 'none' }}`;
content = content.replace(target1, replace1);

const target2 = `style={{ display: activeEngine === 'Clappr' ? 'block' : 'none' }}`;
const replace2 = `style={{ display: activeEngine === 'Clappr' && !isDevToolsOpen ? 'block' : 'none' }}`;
content = content.replace(target2, replace2);

const target3 = `className={\`w-full h-full object-contain \${(activeEngine === 'Video.js' || activeEngine === 'Clappr') ? 'hidden' : ''}\`}`;
const replace3 = `className={\`w-full h-full object-contain \${(activeEngine === 'Video.js' || activeEngine === 'Clappr' || isDevToolsOpen) ? 'hidden' : ''}\`}`;
content = content.replace(target3, replace3);

fs.writeFileSync('src/components/Player.tsx', content);
console.log("Patched video hiding");

