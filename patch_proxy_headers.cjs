const fs = require('fs');
let code = fs.readFileSync('api/proxy.ts', 'utf8');

code = code.replace(
    /const allowedHeaders = \['user-agent', 'accept', 'accept-language', 'cookie', 'authorization', 'range'\];/,
    "const allowedHeaders = ['accept', 'accept-language', 'range'];"
);

code = code.replace(
    /if \(!fetchHeaders\.has\("user-agent"\)\) \{\n\s+fetchHeaders\.set\("user-agent", "Mozilla\/5\.0 \(Windows NT 10\.0; Win64; x64\) AppleWebKit\/537\.36 \(KHTML, like Gecko\) Chrome\/114\.0\.0\.0 Safari\/537\.36"\);\n\s+\}\n\s+if \(!hasCustomReferer\) \{\n\s+fetchHeaders\.set\("referer", urlObj\.origin \+ "\/"\);\n\s+\}\n\s+if \(!hasCustomOrigin\) \{\n\s+fetchHeaders\.set\("origin", urlObj\.origin\);\n\s+\}/,
    `if (!fetchHeaders.has("user-agent")) {
        fetchHeaders.set("user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36");
    }`
);

fs.writeFileSync('api/proxy.ts', code);
