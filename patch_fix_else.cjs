const fs = require('fs');
let code = fs.readFileSync('src/components/Player.tsx', 'utf8');

code = code.replace(/    \} else if \(activeEngine === 'Video\.js'\) \{\s*initVideoJs\(0\);\s*else if/g, "    } else if (activeEngine === 'Video.js') {\n        initVideoJs(0);\n    } else if");

fs.writeFileSync('src/components/Player.tsx', code);
