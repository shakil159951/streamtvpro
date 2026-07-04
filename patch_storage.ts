import fs from 'fs';

let content = fs.readFileSync('src/lib/storage.ts', 'utf8');

const targetUrl = "'https://raw.githubusercontent.com/shakil951/PlaylistCheck/refs/heads/main/combined_playlist.m3u'";
content = content.replace(targetUrl, "'/api/playlists'");

fs.writeFileSync('src/lib/storage.ts', content);
console.log("Patched storage.ts");
