import { Channel } from '../types';

const isLocalIp = (url: string): boolean => {
    try {
        const hostname = new URL(url).hostname;
        return /^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|127\.|localhost|0\.0\.0\.0)/.test(hostname);
    } catch {
        return false;
    }
};

const buildProxyUrl = (targetUrl: string, ref?: string, ua?: string, cookie?: string) => {
    if (!targetUrl || !targetUrl.startsWith('http')) return targetUrl;
    if (targetUrl.includes('/api/proxy')) return targetUrl;
    if (isLocalIp(targetUrl)) return targetUrl;
    
    let rewrittenUrl = `/api/proxy?u=${encodeURIComponent(targetUrl)}`;
    const headers: Record<string, string> = {};
    if (ref) headers['Referer'] = ref;
    if (ua) headers['User-Agent'] = ua;
    if (cookie) headers['Cookie'] = cookie;
    if (Object.keys(headers).length > 0) {
        rewrittenUrl += `&h=${encodeURIComponent(btoa(JSON.stringify(headers)))}`;
    }
    return rewrittenUrl;
};

export function parseM3U(text: string): Channel[] {
  try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
          return parsed.map((item, index) => {
              const name = item.name || item.title || item.channel || 'Unknown';
              let url = item.link || item.url || item.stream || '';
              const logo = item.logo || item.icon || item.image || '';
              const group = item.group || item.category || 'Uncategorized';
              let referer = item.referer || item.referrer || '';
              let userAgent = item.userAgent || item.user_agent || '';
              let cookie = item.cookie || '';
              if (url.includes('|')) {
                  const pipeParts = url.split('|');
                  url = pipeParts[0];
                  for (let i = 1; i < pipeParts.length; i++) {
                      const part = pipeParts[i];
                      if (part.startsWith('Referer=') || part.startsWith('referer=')) referer = referer || part.split('=').slice(1).join('=');
                      if (part.startsWith('User-Agent=') || part.startsWith('user-agent=')) userAgent = userAgent || part.split('=').slice(1).join('=');
                      if (part.startsWith('Cookie=') || part.startsWith('cookie=')) cookie = cookie || part.split('=').slice(1).join('=');
                  }
              }
              return { uid: `json-ch-${index}`, name, url: buildProxyUrl(url, referer, userAgent, cookie), logo, group, referer, userAgent, cookie };
          }).filter(c => c.url && c.url !== '/api/proxy?u=');
      }
  } catch (e) {}

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
          if (line[j] === ',' && !inQuotes) { commaIdx = j; break; }
      }
      if (commaIdx !== -1) current.name = line.substring(commaIdx + 1).trim() || 'Unknown';
      else current.name = line.replace(/#EXTINF:[^,]*,/, '').trim() || 'Unknown';
      
      const logoMatch = line.match(/tvg-logo="([^"]*)"/);
      const groupMatch = line.match(/group-title="([^"]*)"/);
      const idMatch = line.match(/tvg-id="([^"]*)"/);
      current.logo = logoMatch ? logoMatch[1] : '';
      current.group = groupMatch ? groupMatch[1] : 'Uncategorized';
      
      let baseUid = idMatch && idMatch[1] ? idMatch[1] : `ch-${i}`;
      let candidateUid = baseUid;
      if (uidCounts[candidateUid]) {
          let suffix = 1;
          while (uidCounts[`${candidateUid}_${suffix}`]) suffix++;
          candidateUid = `${candidateUid}_${suffix}`;
      }
      uidCounts[candidateUid] = 1;
      current.uid = candidateUid;
      referer = '';
      userAgent = '';
      cookie = '';
    } else if (line.startsWith('#EXTVLCOPT:http-referrer=')) {
      referer = line.replace('#EXTVLCOPT:http-referrer=', '').trim();
    } else if (line.startsWith('#EXTVLCOPT:http-user-agent=')) {
      userAgent = line.replace('#EXTVLCOPT:http-user-agent=', '').trim();
    } else if (line.includes('vlcopt:http-referrer=')) {
      referer = line.split('vlcopt:http-referrer=')[1].trim();
    } else if (line.includes('vlcopt:http-user-agent=')) {
      userAgent = line.split('vlcopt:http-user-agent=')[1].trim();
    } else if (!line.startsWith('#') && current) {
      let urlStr = line;
      if (urlStr.includes('|')) {
          const pipeParts = urlStr.split('|');
          urlStr = pipeParts[0];
          for (let p = 1; p < pipeParts.length; p++) {
              const part = pipeParts[p];
              if (part.startsWith('Referer=') || part.startsWith('referer=')) referer = referer || decodeURIComponent(part.split('=').slice(1).join('='));
              if (part.startsWith('User-Agent=') || part.startsWith('user-agent=')) userAgent = userAgent || decodeURIComponent(part.split('=').slice(1).join('='));
              if (part.startsWith('Cookie=') || part.startsWith('cookie=')) cookie = cookie || decodeURIComponent(part.split('=').slice(1).join('='));
          }
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
