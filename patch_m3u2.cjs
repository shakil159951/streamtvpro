const fs = require('fs');
let code = fs.readFileSync('src/lib/m3u.ts', 'utf8');

code = code.replace(
    /url: buildProxyUrl\(url, referer,[\s\S]*userAgent\n              };/,
    `url: buildProxyUrl(url, referer, userAgent, cookie),
                  logo,
                  group,
                  referer,
                  userAgent,
                  cookie
              };`
);

code = code.replace(
    /let userAgent = '';\s+cookie = '';\s+let cookie = '';/,
    "let userAgent = '';\n  let cookie = '';"
);

fs.writeFileSync('src/lib/m3u.ts', code);
