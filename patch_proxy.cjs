const fs = require('fs');
let code = fs.readFileSync('src/components/Player.tsx', 'utf8');

code = code.replace(
    'const getProxiedUrl = (url: string, proxyIdx: number): string => {',
    `const getProxiedUrl = (url: string, proxyIdx: number): string => {
        // If the URL is already routed through our proxy, don't double-proxy it
        if (url.startsWith('/api/proxy') && proxyIdx > 0) {
            // Extract the original URL and proxy that instead
            const match = url.match(/u=([^&]+)/);
            if (match) {
                url = decodeURIComponent(match[1]);
            }
        }`
);

fs.writeFileSync('src/components/Player.tsx', code);
