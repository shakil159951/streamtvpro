import fs from 'fs';

let content = fs.readFileSync('src/components/ChannelLogo.tsx', 'utf8');

content = content.replace(
    'if (customLogo) {\\n            newSources.push(customLogo);\\n        }',
    'if (customLogo && customLogo !== "none") {\\n            newSources.push(customLogo);\\n        }'
);

content = content.replace(
    'if (!customLogo) {\\n            try {',
    'if (!customLogo || customLogo !== "none") {\\n            try {'
);

fs.writeFileSync('src/components/ChannelLogo.tsx', content);

