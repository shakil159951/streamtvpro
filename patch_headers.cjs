const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
"    fetchHeaders.set('x-forwarded-for', '103.112.150.1');\n    fetchHeaders.set('x-real-ip', '103.112.150.1');",
"    fetchHeaders.set('x-forwarded-for', '103.112.150.1');\n    fetchHeaders.set('x-real-ip', '103.112.150.1');\n    fetchHeaders.set('client-ip', '103.112.150.1');\n    fetchHeaders.set('true-client-ip', '103.112.150.1');\n    fetchHeaders.set('cf-connecting-ip', '103.112.150.1');"
);

fs.writeFileSync('server.ts', code);

let code2 = fs.readFileSync('api/proxy.ts', 'utf8');

code2 = code2.replace(
"    fetchHeaders.set('x-forwarded-for', '103.112.150.1');\n    fetchHeaders.set('x-real-ip', '103.112.150.1');",
"    fetchHeaders.set('x-forwarded-for', '103.112.150.1');\n    fetchHeaders.set('x-real-ip', '103.112.150.1');\n    fetchHeaders.set('client-ip', '103.112.150.1');\n    fetchHeaders.set('true-client-ip', '103.112.150.1');\n    fetchHeaders.set('cf-connecting-ip', '103.112.150.1');"
);

fs.writeFileSync('api/proxy.ts', code2);
