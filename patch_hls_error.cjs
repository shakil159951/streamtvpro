const fs = require('fs');
let code = fs.readFileSync('src/components/Player.tsx', 'utf8');

code = code.replace(
    /if \(data\.type === Hls\.ErrorTypes\.NETWORK_ERROR\) \{\n\s+if \(proxyIdx < maxProxyIndex\) \{\n\s+initHls\(proxyIdx \+ 1\);\n\s+\} else \{\n\s+hls\.destroy\(\);\n\s+handleEngineFailure\('HLS Error: Network error\.'\);\n\s+\}\n\s+\} else if/,
    `if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                    if (data.response && (data.response.code === 404 || data.response.code === 403)) {
                        hls.destroy();
                        setError(\`Stream access denied or not found (\${data.response.code})\`);
                        setLoading(false);
                        return;
                    }
                    if (proxyIdx < maxProxyIndex) {
                        initHls(proxyIdx + 1);
                    } else {
                        hls.destroy();
                        handleEngineFailure('HLS Error: Network error.');
                    }
                } else if`
);

fs.writeFileSync('src/components/Player.tsx', code);
