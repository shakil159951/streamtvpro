import { Channel } from '../types';

const buildProxyUrl = (targetUrl: string, ref?: string, ua?: string, cookie?: string) => {
    return targetUrl;
};

export function parseM3U(text: string): Channel[] {
  // First, try to parse as JSON
  try {
      const parsed = JSON.parse(text);
      let items: any[] = [];
      if (Array.isArray(parsed)) {
          items = parsed;
      } else if (parsed && Array.isArray(parsed.channels)) {
          items = parsed.channels;
      } else if (parsed && Array.isArray(parsed.items)) {
          items = parsed.items;
      } else if (parsed && Array.isArray(parsed.playlist)) {
          items = parsed.playlist;
      } else if (parsed && Array.isArray(parsed.data)) {
          items = parsed.data;
      } else if (parsed && typeof parsed === 'object') {
          for (const key in parsed) {
              if (Array.isArray(parsed[key])) {
                  items = parsed[key];
                  break;
              }
          }
      }
      
      if (items.length > 0) {
          return items.map((item, index) => {
              const name = item.name || item.title || item.channel || item.Name || item.Title || item.Channel || item['tvg-name'] || 'Unknown';
              let url = item.link || item.url || item.stream || item.Link || item.Url || item.Stream || item.URL || '';
              const logo = item.logo || item.icon || item.image || item.tvg_logo || item.Logo || item.Icon || item['tvg-logo'] || '';
              const group = item.group || item.category || item.group_title || item.Group || item.Category || item['group-title'] || 'Uncategorized';
              
              let referer = item.referer || item.referrer || item.http_referrer || '';
              let userAgent = item.userAgent || item.user_agent || item.http_user_agent || '';
              let cookie = item.cookie || '';
              
              if (url.includes('|Referer=')) {
                const parts = url.split('|Referer=');
                url = parts[0];
                referer = referer || parts[1].split('&')[0];
              }
              if (url.includes('|User-Agent=')) {
                const parts = url.split('|User-Agent=');
                url = parts[0];
                userAgent = userAgent || parts[1].split('&')[0];
              }
              
              return {
                  uid: `json-ch-${index}`,
                  name,
                  url: buildProxyUrl(url, referer, userAgent, cookie),
                  logo,
                  group,
                  referer,
                  userAgent,
                  cookie
              } as Channel;
          }).filter(c => !!c.url); // filter out empty URLs
      }
  } catch (e) {
      // Not valid JSON, proceed to parse as M3U
  }

  const rawLines = text.split('\n');
  const lines: string[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const trimmed = rawLines[i].trim();
    if (trimmed) lines.push(trimmed);
  }
  const channels: Channel[] = [];
  let current: Partial<Channel> | null = null;
  let referer = '';
  let userAgent = '';
  let cookie = '';
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
      
      // Keep generating until unique
      let candidateUid = baseUid;
      if (uidCounts[candidateUid]) {
          let suffix = 1;
          while (uidCounts[`${candidateUid}_${suffix}`]) {
              suffix++;
          }
          candidateUid = `${candidateUid}_${suffix}`;
      }
      uidCounts[candidateUid] = 1;
      current.uid = candidateUid;
      
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
      if (urlStr.includes('|Cookie=')) {
        const parts = urlStr.split('|Cookie=');
        urlStr = parts[0];
        cookie = parts[1].split('&')[0];
      }
      if (urlStr.includes('|User-Agent=')) {
        const parts = urlStr.split('|User-Agent=');
        urlStr = parts[0];
        userAgent = parts[1].split('&')[0];
      }
      
      current.url = buildProxyUrl(urlStr, referer, userAgent, cookie);
      if (referer) current.referer = referer;
      if (userAgent) current.userAgent = userAgent;
      if (cookie) current.cookie = cookie;

      channels.push(current as Channel);
      current = null;
    }
  }
  return channels;
}
