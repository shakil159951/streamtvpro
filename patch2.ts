import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

const parts = content.split('{/* Mobile Lists... */}');

if (parts.length > 1) {
  let mobileSection = parts[1];
  
  mobileSection = mobileSection.replace(
    /\{playlists\.map\(\(pl\) => \(\s*<div key=\{pl\.id\}/,
    `{playlists.map((pl) => (
                            editingPlaylistId === pl.id ? (
                              <div key={pl.id} className="p-4 rounded-xl border bg-slate-900 border-teal-500/50 shadow-[0_0_15px_rgba(20,184,166,0.1)] flex flex-col gap-3">
                                <input type="text" value={editPlName} onChange={(e) => setEditPlName(e.target.value)} placeholder="Playlist Name" className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-teal-500 text-white" />
                                <input type="url" value={editPlUrl} onChange={(e) => setEditPlUrl(e.target.value)} placeholder="M3U URL" className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-teal-500 text-white" />
                                <select value={editPlType} onChange={(e) => setEditPlType(e.target.value as 'live' | 'vod')} className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-teal-500 text-white appearance-none">
                                  <option value="live">Live TV</option>
                                  <option value="vod">VOD (Movies/Series)</option>
                                </select>
                                <div className="flex gap-2 justify-end mt-2">
                                  <button onClick={() => setEditingPlaylistId(null)} className="px-4 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">Cancel</button>
                                  <button onClick={() => {
                                    const updated = playlists.map(p => p.id === pl.id ? { ...p, name: editPlName, url: editPlUrl, type: editPlType } : p);
                                    setPlaylists(updated);
                                    savePlaylists(updated);
                                    if (isRouteAdmin && isAdmin) publishConfigToFirebase(updated);
                                    setEditingPlaylistId(null);
                                  }} className="px-4 py-2 rounded-lg text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white transition-colors">Save</button>
                                </div>
                              </div>
                            ) : (
                            <div key={pl.id}`
  );
  
  mobileSection = mobileSection.replace(
    /<\/div>\s*<\/div>\s*<\/div>\s*\)\)\}/,
    `</div>\n                            </div>\n                            )\n                          ))}`
  );

  fs.writeFileSync('src/App.tsx', parts[0] + '{/* Mobile Lists... */}' + mobileSection);
}
