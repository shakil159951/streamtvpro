import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// We have some left over.
content = content.replace(
  /<select\s+value=\{activeLivePlaylist\?\.id \|\| ''\}\s+onChange=\{\(e\) => \{\s+const updated = playlists\.map\(p => \(\{ \.\.\.p, active: p\.type !== 'vod' \? p\.id === e\.target\.value : p\.active \}\)\);\s+setPlaylists\(updated\);\s+savePlaylists\(updated\);\s+\}\}\s+className="w-full bg-white\/5 border border-white\/10 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-teal-500\/50 focus:bg-white\/10 appearance-none cursor-pointer text-slate-300"\s*>\s*\{playlists\.filter\(p => p\.type !== 'vod'\)\.map\(p => <option className="bg-slate-900 text-slate-200" key=\{p\.id\} value=\{p\.id\}>\{p\.name\}<\/option>\)\}\s*<\/select>/g,
  `<div className="relative group shadow-sm">
                    <select
                      value={activeLivePlaylist?.id || ''}
                      onChange={(e) => {
                        const updated = playlists.map(p => ({ ...p, active: p.type !== 'vod' ? p.id === e.target.value : p.active }));
                        setPlaylists(updated);
                        savePlaylists(updated);
                      }}
                      className="w-full bg-[#111111] hover:bg-[#1a1a1a] border border-white/10 group-hover:border-white/20 rounded-xl py-2 pl-3 pr-8 text-sm font-semibold focus:outline-none focus:border-teal-500/50 appearance-none cursor-pointer text-slate-200 transition-all"
                    >
                      {playlists.filter(p => p.type !== 'vod').map(p => <option className="bg-slate-900 text-slate-200" key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none group-hover:text-teal-400 transition-colors" />
                  </div>`
);


content = content.replace(
  /<select\s+value=\{groupFilter\}\s+onChange=\{\(e\) => setGroupFilter\(e\.target\.value\)\}\s+className="w-full bg-white\/5 border border-white\/10 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-teal-500\/50 focus:bg-white\/10 appearance-none cursor-pointer"\s*>\s*<option className="bg-slate-900 text-slate-200" value="">All Groups \(\{channels\.length\}\)<\/option>\s*\{groups\.map\(g => <option className="bg-slate-900 text-slate-200" key=\{g\} value=\{g\}>\{g\} \(\{channels\.filter\(c => c\.group === g\)\.length\}\)<\/option>\)\}\s*<\/select>/g,
  `<div className="relative group shadow-sm">
                  <select 
                    value={groupFilter} 
                    onChange={(e) => setGroupFilter(e.target.value)}
                    className="w-full bg-[#111111] hover:bg-[#1a1a1a] border border-white/10 group-hover:border-white/20 rounded-xl py-2 pl-3 pr-8 text-sm font-semibold focus:outline-none focus:border-teal-500/50 appearance-none cursor-pointer transition-all text-slate-200"
                  >
                    <option className="bg-slate-900 text-slate-200" value="">All Groups ({channels.length})</option>
                    {groups.map(g => <option className="bg-slate-900 text-slate-200" key={g} value={g}>{g} ({channels.filter(c => c.group === g).length})</option>)}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none group-hover:text-teal-400 transition-colors" />
                </div>`
);

fs.writeFileSync('src/App.tsx', content);
