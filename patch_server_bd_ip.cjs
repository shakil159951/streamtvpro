const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
/    if \(\!fetchHeaders\.has\("user-agent"\)\) \{/g,
"    fetchHeaders.set('x-forwarded-for', '103.112.150.1');\n    fetchHeaders.set('x-real-ip', '103.112.150.1');\n\n    if (!fetchHeaders.has(\"user-agent\")) {"
);

fs.writeFileSync('server.ts', code);
