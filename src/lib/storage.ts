import { Playlist } from '../types';

const DEFAULT_PLAYLISTS: Playlist[] = [
  {
    id: 'streamtv_default',
    name: 'Stream TV Pro',
    url: 'https://raw.githubusercontent.com/shakil951/PlaylistCheck/refs/heads/main/combined_playlist.m3u',
    active: true,
    isDefault: true,
    type: 'live'
  }
];

export function getPlaylists(): Playlist[] {
  try {
    const saved = JSON.parse(localStorage.getItem('stv_playlists') || 'null');
    if (!saved) return DEFAULT_PLAYLISTS.map(p => ({ ...p }));
    
    // Remove legacy playlists
    const cleaned = saved.filter((p: Playlist) => p.id !== 'bdix' && p.id !== 'pirates');
    
    // Ensure default playlists exist
    DEFAULT_PLAYLISTS.forEach(def => {
      const existing = cleaned.find((p: Playlist) => p.id === def.id);
      if (!existing) cleaned.unshift({ ...def });
      else {
        existing.isDefault = true;
        existing.url = def.url;
        existing.name = def.name;
      }
    });
    
    return cleaned;
  } catch {
    return DEFAULT_PLAYLISTS;
  }
}

export function savePlaylists(playlists: Playlist[]) {
  localStorage.setItem('stv_playlists', JSON.stringify(playlists));
}
