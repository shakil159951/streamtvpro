async function test() {
    const res = await fetch('https://raw.githubusercontent.com/shakil951/PlaylistCheck/refs/heads/main/combined_playlist.m3u');
    const text = await res.text();
    const lines = text.split('\n');
    const urls = lines.filter(l => l.startsWith('http'));
    console.log(`Testing ${urls.length} urls`);
    for(const u of urls) {
        try {
            const r = await fetch(u.trim(), { method: 'HEAD', signal: AbortSignal.timeout(3000) });
            console.log(u.trim(), r.status);
        } catch(e) {
            console.log(u.trim(), "Failed");
        }
    }
}
test();
