async function run() {
    const fetch = (await import('node-fetch')).default;
    const r = await fetch("http://localhost:3000/api/proxy?u=https%3A%2F%2Fbldcmprod-cdn.toffeelive.com%2Fcdn%2Flive%2Fsports_highlights%2Fplaylist.m3u8&h=eyJDb29raWUiOiJFZGdlLUNhY2hlLUNvb2tpZT1VUkxQcmVmaXg9YUhSMGNITTZMeTlpYkdSamJYQnliMlF0WTJSdUxuUnZabVpsWld4cGRtVXVZMjl0OkV4cGlyZXM9MTc4MzMzMTk3ODpLZXlOYW1lPXByb2RfbGluZWFyOlNpZ25hdHVyZT1ha3RTX3BzUmN0TFFzczVtREktUDNScVBlVElwZy04NTRhb29kdFRjRzdaSTZJLVhFX0RjQzB3VUtSSnk3S2tINFFoUmpOdHRITkVwVHMycC1iUlhBdyJ9");
    console.log(r.status);
}
run();
