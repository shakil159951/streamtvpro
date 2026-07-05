const fs = require('fs');
let code = fs.readFileSync('src/components/Player.tsx', 'utf8');

code = code.replace(/        <div \n            ref=\{clapprContainerRef\} \n            className="w-full h-full absolute inset-0 z-0" \n            style=\{\{ display: activeEngine === 'Clappr' && !isDevToolsOpen \? 'block' : 'none' \}\} \n        \/>\n/g, '');

fs.writeFileSync('src/components/Player.tsx', code);
