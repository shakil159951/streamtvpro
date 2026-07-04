async function run() {
    const fetch = (await import('node-fetch')).default;
    try {
        const r = await fetch("https://owrcovcrpy.gpcdn.net/bpk-tv/1709/output/index.m3u8");
        console.log(r.status);
    } catch(e) {
        console.error(e);
    }
}
run();
