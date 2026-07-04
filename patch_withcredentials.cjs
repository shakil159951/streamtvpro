const fs = require('fs');
let code = fs.readFileSync('src/components/Player.tsx', 'utf8');

code = code.replace(
    /xhrSetup: \(xhr, url\) => \{\n\s+if \(url\.startsWith\('\/api\/'\) \|\| url\.includes\(window\.location\.host\)\) \{\n\s+xhr\.withCredentials = true;\s*\/\/\s*Send cookies for AI Studio proxy check\n\s+\}\n\s+\},/g,
    ""
);

code = code.replace(
    /vhs: \{\n\s+beforeRequest: \(options: any\) => \{\n\s+if \(options\.uri\.startsWith\('\/api\/'\) \|\| options\.uri\.includes\(window\.location\.host\)\) \{\n\s+options\.withCredentials = true;\n\s+\}\n\s+return options;\n\s+\}\n\s+\}/g,
    ""
);

code = code.replace(
    /if \(request\.url\.startsWith\('\/api\/'\) \|\| request\.url\.includes\(window\.location\.host\)\) \{\n\s+xhr\.withCredentials = true;\n\s+\}/g,
    ""
);

fs.writeFileSync('src/components/Player.tsx', code);
