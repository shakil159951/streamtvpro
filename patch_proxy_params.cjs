const fs = require('fs');
let code = fs.readFileSync('api/proxy.ts', 'utf8');

code = code.replace(
    /proxyUrlParams\.delete\('useragent'\);/,
    "proxyUrlParams.delete('useragent');\n          proxyUrlParams.delete('cookie');\n          proxyUrlParams.delete('origin');"
);

fs.writeFileSync('api/proxy.ts', code);
