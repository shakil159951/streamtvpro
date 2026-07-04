import fs from 'fs';

let content = fs.readFileSync('src/components/Player.tsx', 'utf8');

const target = `    const getProxiedUrl = (url: string, proxyIdx: number): string => {
        if (proxyIdx === 0) return url;
        const p = PROXIES[proxyIdx];`;

const replace = `    const getProxiedUrl = (url: string, proxyIdx: number): string => {
        if (url.startsWith('/api/')) return url;
        if (proxyIdx === 0) return url;
        const p = PROXIES[proxyIdx];`;

if (content.includes(target)) {
    content = content.replace(target, replace);
    fs.writeFileSync('src/components/Player.tsx', content);
    console.log("Patched Player getProxiedUrl");
} else {
    console.log("Could not find getProxiedUrl target");
}
