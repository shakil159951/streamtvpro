import { parseM3U } from './src/lib/m3u';
async function test() {
    const res = await fetch('https://raw.githubusercontent.com/sm-monirulislam/Toffee-Auto-Update-Playlist/refs/heads/main/Ns_player.m3u');
    const text = await res.text();
    const channels = parseM3U(text);
    console.log("Channels:", channels.length);
    console.log(channels[3]); // Let's try one from Toffee
}
test();
