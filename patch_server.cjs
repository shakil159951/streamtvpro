const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
    'import crypto from "crypto";',
    'import crypto from "crypto";\nimport { Readable } from "stream";'
);

code = code.replace(
    "const { Readable } = require('stream');",
    ""
);

fs.writeFileSync('server.ts', code);
