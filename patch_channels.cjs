const fs = require('fs');
let code = fs.readFileSync('api/channels.ts', 'utf8');

code = code.replace(
    /export const config = \{\n\s+runtime: 'edge',\n\};\n/,
    `export const config = {
  runtime: 'edge',
  regions: ['sin1', 'bom1'],
};
`
);

fs.writeFileSync('api/channels.ts', code);
