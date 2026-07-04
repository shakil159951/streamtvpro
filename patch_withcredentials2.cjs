const fs = require('fs');
let code = fs.readFileSync('src/components/Player.tsx', 'utf8');

code = code.replace(
    /hlsjsConfig: \{\n\s+xhrSetup: \(xhr: any, url: string\) => \{\n\s+if \(url\.startsWith\('\/api\/'\) \|\| url\.includes\(window\.location\.host\)\) \{\n\s+xhr\.withCredentials = true;\n\s+\}\n\s+\}\n\s+\}/,
    ""
);

fs.writeFileSync('src/components/Player.tsx', code);
