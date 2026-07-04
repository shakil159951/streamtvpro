import fs from 'fs';

let content = fs.readFileSync('src/components/Player.tsx', 'utf8');

const regexProxies = /const PROXIES = \[\s*'',\s*window\.location\.origin \+ '\/api\/proxy\?url='\s*\];/g;
content = content.replace(regexProxies, `const PROXIES = [
        '',
        window.location.origin + '/api/proxy?url=',
        'https://corsproxy.io/?url=',
        'https://api.allorigins.win/raw?url='
    ];`);

const regexGetProxy = /if \(url\.startsWith\('\/api\/'\)\) return url;/g;
content = content.replace(regexGetProxy, ``);

fs.writeFileSync('src/components/Player.tsx', content);
console.log("Patched Player.tsx proxies with regex");
