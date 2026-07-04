const fs = require('fs');
let code = fs.readFileSync('src/components/Player.tsx', 'utf8');

code = code.replace(
    'manifestLoadingMaxRetry: 0,',
    'manifestLoadingMaxRetry: 2,'
);
code = code.replace(
    'levelLoadingMaxRetry: 0,',
    'levelLoadingMaxRetry: 2,'
);
code = code.replace(
    'fragLoadingMaxRetry: 0',
    'fragLoadingMaxRetry: 2'
);

fs.writeFileSync('src/components/Player.tsx', code);
