import { parseM3U } from './src/lib/m3u';
const text = `
#EXTM3U
#EXTINF:-1,Test
http://test.com/stream.m3u8
`;
console.log(parseM3U(text));
