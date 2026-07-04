import fs from 'fs';
let content = fs.readFileSync('vite.config.ts', 'utf8');
content = content.replace(/build: \{[\s\S]*?\},/, '');
content = content.replace(/esbuild: \{[\s\S]*?\},/, '');
fs.writeFileSync('vite.config.ts', content);
