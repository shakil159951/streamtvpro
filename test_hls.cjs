async function run() {
    const fetch = (await import('node-fetch')).default;
    const r = await fetch("http://localhost:3000/api/proxy?u=https%3A%2F%2Fprod-cdn01-live.toffeelive.com%2Flive%2FFIFA-2026-6%2F0%2Fmaster_2000.m3u8%3Fhdntl%3DExpires%3D1783171219~_GO%3DGenerated~URLPrefix%3DaHR0cHM6Ly9wcm9kLWNkbjAxLWxpdmUudG9mZmVlbGl2ZS5jb20~Signature%3DAeQsclA4z8j04s1LN8U0GusssnpGV5b_7xXqO3zMdMXU_o3bq4bciZ7ZYBZ8fpxU5n7kmSSfvhfYH_710YoQVI1uxaEF");
    console.log(r.status);
    console.log(await r.text());
}
run();
