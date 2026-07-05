const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/import \{ Readable \} from "stream";\nimport \{ Readable \} from "stream";\n/, 'import { Readable } from "stream";\n');

fs.writeFileSync('server.ts', code);
