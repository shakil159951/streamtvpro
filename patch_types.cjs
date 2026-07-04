const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

code = code.replace(
    'userAgent?: string;',
    'userAgent?: string;\n  cookie?: string;'
);

fs.writeFileSync('src/types.ts', code);
