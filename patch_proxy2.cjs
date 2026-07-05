const fs = require('fs');
let code = fs.readFileSync('api/proxy.ts', 'utf8');

// 1. Remove regions
code = code.replace(/  regions: \['sin1', 'bom1'\],\n/g, '');

// 2. Remove content-length from preserved headers
code = code.replace(/const headersToPreserve = \['content-type', 'cache-control', 'accept-ranges', 'etag', 'last-modified', 'content-length', 'content-range'\];/g, 
"const headersToPreserve = ['content-type', 'cache-control', 'accept-ranges', 'etag', 'last-modified', 'content-range'];");

fs.writeFileSync('api/proxy.ts', code);
