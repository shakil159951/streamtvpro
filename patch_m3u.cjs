const fs = require('fs');
let code = fs.readFileSync('src/lib/m3u.ts', 'utf8');

code = code.replace(
    /const lines = text\.split\('\\n'\)\.map\(l => l\.trim\(\)\)\.filter\(Boolean\);/,
    "const rawLines = text.split('\\n');\n  const lines: string[] = [];\n  for (let i = 0; i < rawLines.length; i++) {\n    const trimmed = rawLines[i].trim();\n    if (trimmed) lines.push(trimmed);\n  }"
);

fs.writeFileSync('src/lib/m3u.ts', code);
