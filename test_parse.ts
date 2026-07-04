import { parseM3U } from './src/lib/m3u';

const jsonStr = `[
  {
    "name": "Toffee 1",
    "link": "https://cdn-tt.pages.dev/ch1.m3u8",
    "logo": "https://i.imgur.com/53aSeDH.png"
  }
]`;

console.log(parseM3U(jsonStr));
