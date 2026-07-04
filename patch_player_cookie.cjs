const fs = require('fs');
let code = fs.readFileSync('src/components/Player.tsx', 'utf8');

code = code.replace(
    /if \(channel\.userAgent\) \{\s*resUrl \+= `&useragent=\$\{encodeURIComponent\(channel\.userAgent\)\}`;\s*\}/,
    `if (channel.userAgent) {\n                resUrl += \`&useragent=\${encodeURIComponent(channel.userAgent)}\`;\n            }\n            if (channel.cookie) {\n                // Send cookie as a header via h=\n                const hObj = {};\n                if (channel.referer) hObj['Referer'] = channel.referer;\n                if (channel.userAgent) hObj['User-Agent'] = channel.userAgent;\n                hObj['Cookie'] = channel.cookie;\n                resUrl = p + encodeURIComponent(url) + '&h=' + encodeURIComponent(btoa(JSON.stringify(hObj)));\n            }`
);

fs.writeFileSync('src/components/Player.tsx', code);
