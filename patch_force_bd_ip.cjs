const fs = require('fs');
let code = fs.readFileSync('api/proxy.ts', 'utf8');

code = code.replace(
/  const clientIp = req\.headers\.get\('x-forwarded-for'\) \|\| req\.headers\.get\('x-real-ip'\);\n  if \(clientIp\) \{\n      fetchHeaders\.set\('x-forwarded-for', clientIp\);\n  \} else \{\n      fetchHeaders\.set\('x-forwarded-for', '103\.112\.150\.1'\); \/\/ A dummy BD IP\n  \}/g,
"  fetchHeaders.set('x-forwarded-for', '103.112.150.1');\n  fetchHeaders.set('x-real-ip', '103.112.150.1');"
);

fs.writeFileSync('api/proxy.ts', code);
