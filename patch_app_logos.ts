import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

const importTarget = `import { useAntiDebug } from './hooks/useAntiDebug';`;
const importReplace = `import { useAntiDebug } from './hooks/useAntiDebug';\nimport { ChannelLogo } from './components/ChannelLogo';`;
if (content.includes(importTarget)) {
    content = content.replace(importTarget, importReplace);
}

const stateTarget = `  const [playlists, setPlaylists] = useState<Playlist[]>(() => getPlaylists());`;
const stateReplace = `  const [playlists, setPlaylists] = useState<Playlist[]>(() => getPlaylists());\n  const [customLogos, setCustomLogos] = useState<Record<string, string>>(() => { try { return JSON.parse(localStorage.getItem('custom_logos') || '{}'); } catch { return {}; } });\n  const handleUpdateLogo = (channelName: string, logoUrl: string | null) => { const updated = { ...customLogos }; if (logoUrl) { updated[channelName] = logoUrl; } else { delete updated[channelName]; } setCustomLogos(updated); localStorage.setItem('custom_logos', JSON.stringify(updated)); if (isAdmin) { updateConfig({ customLogos: updated }); } };`;
if (content.includes(stateTarget)) {
    content = content.replace(stateTarget, stateReplace);
}

const firebaseDataTarget = `    if (data.xtream) {`;
const firebaseDataReplace = `    if (data.customLogos) {\n      setCustomLogos(data.customLogos);\n      localStorage.setItem('custom_logos', JSON.stringify(data.customLogos));\n    }\n    if (data.xtream) {`;
if (content.includes(firebaseDataTarget)) {
    content = content.replace(firebaseDataTarget, firebaseDataReplace);
}

const publishTarget = `          type: p.type || 'live'\n        }))\n      }));`;
const publishReplace = `          type: p.type || 'live'\n        })),\n        customLogos: customLogos\n      }));`;
if (content.includes(publishTarget)) {
    content = content.replace(publishTarget, publishReplace);
}

// Replace the image rendering for channels
const imgTarget1 = `<div className={\`w-10 h-10 rounded-lg border shadow-sm bg-transparent flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden transition-colors \${isActive ? 'border-primary/50 text-primary' : 'border-white/10 text-slate-400 group-hover:border-white/20'}\`}>\n                                      {ch.logo ? <img src={ch.logo} alt="" className="w-full h-full object-cover" /> : ch.name.substring(0, 2).toUpperCase()}\n                                    </div>`;

const imgReplace1 = `<ChannelLogo channel={ch} className="w-10 h-10 shrink-0" customLogo={customLogos[ch.name] === 'none' ? undefined : customLogos[ch.name]} isAdmin={isAdmin} onUpdateLogo={handleUpdateLogo} />`;

if (content.includes(imgTarget1)) {
    content = content.replace(imgTarget1, imgReplace1);
} else {
    console.error("Could not find imgTarget1");
}

const imgTarget2 = `<div className={\`w-10 h-10 rounded-lg bg-transparent flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden border transition-colors \${isActive ? 'border-primary/50 text-primary' : 'border-white/10 text-slate-400 group-hover:border-white/20'}\`}>\n                                {ch.logo ? <img src={ch.logo} alt="" className="w-full h-full object-cover" /> : ch.name.substring(0, 2).toUpperCase()}\n                              </div>`;

const imgReplace2 = `<ChannelLogo channel={ch} className="w-10 h-10 shrink-0" customLogo={customLogos[ch.name] === 'none' ? undefined : customLogos[ch.name]} isAdmin={isAdmin} onUpdateLogo={handleUpdateLogo} />`;

if (content.includes(imgTarget2)) {
    content = content.replace(imgTarget2, imgReplace2);
} else {
    console.error("Could not find imgTarget2");
}

fs.writeFileSync('src/App.tsx', content);
console.log("Patched App.tsx with custom logos");

