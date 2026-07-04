const fs = require('fs');
let code = fs.readFileSync('src/lib/m3u.ts', 'utf8');

code = code.replace(
    /let rewrittenUrl = \`\/api\/proxy\?u=\$\{encodeURIComponent\(targetUrl\)\}\`;\n\s+const headers: Record<string, string> = \{\};\n\s+if \(ref\) headers\['Referer'\] = ref;\n\s+if \(ua\) headers\['User-Agent'\] = ua;\n\s+if \(cookie\) headers\['Cookie'\] = cookie;\n\s+if \(Object\.keys\(headers\)\.length > 0\) \{\n\s+rewrittenUrl \+= \`&h=\$\{encodeURIComponent\(btoa\(JSON\.stringify\(headers\)\)\)\}\`;\n\s+\}\n\s+return rewrittenUrl;/g,
    `if (targetUrl.match(/^https?:\\/\\/(10\\.|192\\.168\\.|172\\.(1[6-9]|2[0-9]|3[0-1])\\.|127\\.|localhost)/)) {
        return targetUrl;
    }
    
    // Some channels only work via proxy if they have headers
    // But for now, let's keep everything passing through proxy EXCEPT local IPs
    // and let Player.tsx handle fallbacks.
    let rewrittenUrl = \`/api/proxy?u=\${encodeURIComponent(targetUrl)}\`;
    
    const headers: Record<string, string> = {};
    if (ref) headers['Referer'] = ref;
    if (ua) headers['User-Agent'] = ua;
    if (cookie) headers['Cookie'] = cookie;
    
    if (Object.keys(headers).length > 0) {
        rewrittenUrl += \`&h=\${encodeURIComponent(btoa(JSON.stringify(headers)))}\`;
    }
    return rewrittenUrl;`
);

fs.writeFileSync('src/lib/m3u.ts', code);
