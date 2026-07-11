import { Playlist } from '../types';

const DEFAULT_PLAYLISTS: Playlist[] = [
  {
    id: 'streamtv_default',
    name: 'Stream TV Pro',
    url: '/api/playlists',
    active: true,
    isDefault: true,
    
  }
];

export function getPlaylists(): Playlist[] {
  try {
    const saved = JSON.parse(localStorage.getItem('stv_playlists') || 'null');
    if (!saved || saved.length === 0) return DEFAULT_PLAYLISTS.map(p => ({ ...p }));
    
    // Remove legacy playlists
    const cleaned = saved.filter((p: Playlist) => p.id !== 'bdix' && p.id !== 'pirates');
    
    if (cleaned.length === 0) {
      return DEFAULT_PLAYLISTS.map(p => ({ ...p }));
    }
    
    return cleaned;
  } catch {
    return DEFAULT_PLAYLISTS;
  }
}

export function savePlaylists(playlists: Playlist[]) {
  localStorage.setItem('stv_playlists', JSON.stringify(playlists));
}
