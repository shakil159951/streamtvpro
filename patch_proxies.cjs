const fs = require('fs');
let code = fs.readFileSync('src/components/Player.tsx', 'utf8');

code = code.replace(
    /const PROXIES = \[\n\s+'',\n\s+window\.location\.origin \+ '\/api\/proxy\?url='\n\s+\];/,
    `const PROXIES = [
        '', // Index 0: usually the URL from M3U (which might already be proxied by m3u.ts)
        'DIRECT' // Index 1: Force direct connection (bypassing the proxy)
    ];`
);

code = code.replace(
    /if \(p\.includes\('\/api\/proxy\?url='\)\) \{[\s\S]*?return resUrl;\n\s+\}/,
    `if (p === 'DIRECT') {
            return url; // url is already the decoded original URL thanks to the match above
        }`
);

fs.writeFileSync('src/components/Player.tsx', code);
