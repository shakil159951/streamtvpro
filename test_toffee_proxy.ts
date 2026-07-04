import { parseM3U } from './src/lib/m3u';
async function test() {
    const res = await fetch('https://raw.githubusercontent.com/sm-monirulislam/Toffee-Auto-Update-Playlist/refs/heads/main/Ns_player.m3u');
    const text = await res.text();
    const channels = parseM3U(text);
    const c = channels.find(ch => ch.name.includes('Sports VIP'));
    if (!c) return console.log("Not found");
    
    console.log("Found:", c.name);
    console.log("cookie:", c.cookie);
    console.log("url:", c.url);
    
    // Test fetch the proxy URL
    const proxyUrl = "http://localhost:3000" + c.url;
    console.log("Fetching", proxyUrl);
    
    const r1 = await fetch(proxyUrl);
    console.log("r1 status:", r1.status);
    const m3u8Text = await r1.text();
    console.log(m3u8Text.substring(0, 200));
}
test();
