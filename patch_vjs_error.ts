import fs from 'fs';

let content = fs.readFileSync('src/components/Player.tsx', 'utf8');

const targetStr = `player.on('error', () => { 
                if (proxyIdx < maxProxyIndex) initVideoJs(proxyIdx + 1);
                else handleEngineFailure('Video.js Error'); 
            });`;

const replacementStr = `player.on('error', () => { 
                const err = player.error();
                const errMsg = err ? \`Video.js Error: \${err.message || 'CODE ' + err.code}\` : 'Video.js Error';
                if (proxyIdx < maxProxyIndex) initVideoJs(proxyIdx + 1);
                else handleEngineFailure(errMsg); 
            });`;

if (content.includes(targetStr)) {
    content = content.replace(targetStr, replacementStr);
    console.log("Patched videojs error handling");
} else {
    console.log("Could not find videojs error target");
}

fs.writeFileSync('src/components/Player.tsx', content);

