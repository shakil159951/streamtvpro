import fs from 'fs';

let tsConfig = fs.readFileSync('tsconfig.json', 'utf8');
if (!tsConfig.includes('"vite/client"')) {
    tsConfig = tsConfig.replace('"types": [', '"types": ["vite/client", ');
    fs.writeFileSync('tsconfig.json', tsConfig);
}

let viteConfig = fs.readFileSync('vite.config.ts', 'utf8');
viteConfig = viteConfig.replace("drop: ['console', 'debugger']", "drop: ['console', 'debugger'] as any");
fs.writeFileSync('vite.config.ts', viteConfig);

