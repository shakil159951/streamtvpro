const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(/Readable\.fromWeb\(proxyRes\.body\);/g, 'Readable.fromWeb(proxyRes.body as any);');

fs.writeFileSync('server.ts', code);
