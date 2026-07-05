const fs = require('fs');
let code = fs.readFileSync('src/components/Player.tsx', 'utf8');

code = code.replace(
    /const \[engine, setEngine\] = useState<'Default' \| 'Shaka' \| 'Clappr' \| 'dash\.js' \| 'Video\.js'>\('Video\.js'\);/,
    "const [engine, setEngine] = useState<'Default' | 'Shaka' | 'Clappr' | 'dash.js' | 'Video.js'>('Default');"
);

fs.writeFileSync('src/components/Player.tsx', code);
