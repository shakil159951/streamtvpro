import { Channel } from '../types';

export function parseM3U(text: string): Channel[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const channels: Channel[] = [];
  let current: Partial<Channel> | null = null;
  let referer = '';
  let userAgent = '';
  const uidCounts: Record<string, number> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('#EXTINF:')) {
      current = {};
      let inQuotes = false;
      let commaIdx = -1;
      for (let j = 0; j < line.length; j++) {
          if (line[j] === '"') inQuotes = !inQuotes;
          if (line[j] === ',' && !inQuotes) {
              commaIdx = j;
              break;
          }
      }
      
      if (commaIdx !== -1) {
          current.name = line.substring(commaIdx + 1).trim() || 'Unknown';
      } else {
          current.name = line.replace(/#EXTINF:[^,]*,/, '').trim() || 'Unknown';
      }
      
      const logoMatch = line.match(/tvg-logo="([^"]*)"/);
      const groupMatch = line.match(/group-title="([^"]*)"/);
      const idMatch = line.match(/tvg-id="([^"]*)"/);
      current.logo = logoMatch ? logoMatch[1] : '';
      current.group = groupMatch ? groupMatch[1] : 'Uncategorized';
      
      let baseUid = idMatch && idMatch[1] ? idMatch[1] : `ch-${i}`;
      if (uidCounts[baseUid]) {
          uidCounts[baseUid]++;
          current.uid = `${baseUid}_${uidCounts[baseUid]}`;
      } else {
          uidCounts[baseUid] = 1;
          current.uid = baseUid;
      }
      referer = '';
      userAgent = '';
    } else if (line.startsWith('#EXTVLCOPT:http-referrer=')) {
      referer = line.replace('#EXTVLCOPT:http-referrer=', '').trim();
    } else if (line.startsWith('#EXTVLCOPT:http-user-agent=')) {
      userAgent = line.replace('#EXTVLCOPT:http-user-agent=', '').trim();
    } else if (line.includes('vlcopt:http-referrer=')) {
       referer = line.split('vlcopt:http-referrer=')[1].trim();
    } else if (!line.startsWith('#') && current) {
      // Sometimes URL has |Referer=...
      let urlStr = line;
      if (urlStr.includes('|Referer=')) {
        const parts = urlStr.split('|Referer=');
        urlStr = parts[0];
        referer = parts[1].split('&')[0];
      }
      if (urlStr.includes('|User-Agent=')) {
        const parts = urlStr.split('|User-Agent=');
        urlStr = parts[0];
        userAgent = parts[1].split('&')[0];
      }
      
      current.url = urlStr;
      if (referer) current.referer = referer;
      if (userAgent) current.userAgent = userAgent;

      if (!current.uid || current.uid.startsWith('ch-')) {
        current.uid = 'ch-' + channels.length;
      }
      channels.push(current as Channel);
      current = null;
    }
  }
  return channels;
}
