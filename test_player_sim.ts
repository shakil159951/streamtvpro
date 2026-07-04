import { parseM3U } from './src/lib/m3u';
async function test() {
    const res = await fetch('https://raw.githubusercontent.com/shakil951/PlaylistCheck/refs/heads/main/combined_playlist.m3u');
    const text = await res.text();
    const channels = parseM3U(text);
    const c = channels.find(ch => ch.name.includes('Drama'));
    if (!c) return console.log("Not found");
    
    console.log("Found:", c.name, "url:", c.url);
    
    // simulate proxy request
    const proxyUrl = "http://localhost:3000" + c.url;
    console.log("Fetching", proxyUrl);
    
    const r1 = await fetch(proxyUrl);
    console.log("r1 status:", r1.status);
    const m3u8Text = await r1.text();
    console.log(m3u8Text);
}
test();
