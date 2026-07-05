const fs = require('fs');
let code = fs.readFileSync('src/components/Player.tsx', 'utf8');

code = code.replace(/                 \} else if \(isDashExt\) \{\s*initDash\(0\);\s*/, '');
code = code.replace(/ else if \(isDashExt \|\| activeEngine === 'dash.js'\) \{\s*initDash\(0\);\s*\}/, '');

fs.writeFileSync('src/components/Player.tsx', code);
