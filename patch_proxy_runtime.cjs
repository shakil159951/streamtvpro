const fs = require('fs');
let code = fs.readFileSync('api/proxy.ts', 'utf8');

code = code.replace(/export const config = \{\n  runtime: 'edge',\n\};\n/g, '');
// Also if regions was there (we removed it before)
code = code.replace(/export const config = \{\n  runtime: 'edge',\n  regions: \['sin1', 'bom1'\],\n\};\n/g, '');
code = code.replace(/export const config = \{\n  runtime: 'edge',\n\};\n/g, '');

fs.writeFileSync('api/proxy.ts', code);
