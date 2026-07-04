import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `      const fetchOpts = { cache: 'no-store' as RequestCache };
      let resp;
      try {
        resp = await fetch(pl.url, fetchOpts);
        if (!resp.ok) throw new Error('Not ok');
      } catch (e) {
        resp = await fetch(\`/api/proxy?url=\${encodeURIComponent(pl.url)}\`, fetchOpts);
        if (!resp.ok) throw new Error('Network error');
      }`;

const replace = `      const fetchOpts = { cache: 'no-store' as RequestCache };
      let resp;
      try {
        let fetchUrl = pl.url;
        if (pl.url === '/api/playlists') {
            fetchUrl = '/api/channels';
        } else {
            fetchUrl = \`/api/channels?url=\${encodeURIComponent(pl.url)}\`;
        }
        resp = await fetch(fetchUrl, fetchOpts);
        if (!resp.ok) {
             throw new Error('Not ok');
        }
      } catch (e) {
        resp = await fetch(\`/api/proxy?url=\${encodeURIComponent(pl.url)}\`, fetchOpts);
        if (!resp.ok) throw new Error('Network error');
      }`;

if (content.includes(target)) {
    content = content.replace(target, replace);
    fs.writeFileSync('src/App.tsx', content);
    console.log("Patched App.tsx playlist loading");
} else {
    console.log("Could not find App.tsx playlist loading target");
}
