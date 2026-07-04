const fs = require('fs');
let code = fs.readFileSync('src/components/Player.tsx', 'utf8');

code = code.replace(
    'manifestLoadingMaxRetry: 2,',
    'manifestLoadingMaxRetry: 0,'
);
code = code.replace(
    'levelLoadingMaxRetry: 2,',
    'levelLoadingMaxRetry: 0,'
);
code = code.replace(
    'fragLoadingMaxRetry: 2',
    'fragLoadingMaxRetry: 0'
);

fs.writeFileSync('src/components/Player.tsx', code);
