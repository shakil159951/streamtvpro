import { Channel } from '../types';

export function parseM3U(text: string): Channel[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const channels: Channel[] = [];
  let current: Partial<Channel> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('#EXTINF:')) {
      current = {};
      current.name = line.replace(/#EXTINF:[^,]*,/, '').trim() || 'Unknown';
      const logoMatch = line.match(/tvg-logo="([^"]*)"/);
      const groupMatch = line.match(/group-title="([^"]*)"/);
      const idMatch = line.match(/tvg-id="([^"]*)"/);
      current.logo = logoMatch ? logoMatch[1] : '';
      current.group = groupMatch ? groupMatch[1] : 'Uncategorized';
      current.uid = idMatch ? idMatch[1] : `ch-${i}`;
    } else if (!line.startsWith('#') && current) {
      current.url = line;
      if (!current.uid || current.uid.startsWith('ch-')) {
        current.uid = 'ch-' + channels.length;
      }
      channels.push(current as Channel);
      current = null;
    }
  }
  return channels;
}
