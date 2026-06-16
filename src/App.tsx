import React, { useState, useEffect, useMemo } from 'react';
import Player from './components/Player';
import { Channel, Playlist } from './types';
import { getPlaylists, savePlaylists } from './lib/storage';
import { parseM3U } from './lib/m3u';
import { 
  Tv, Code, ListVideo, Search, Plus, PlayCircle, RefreshCw, 
  Trash2, X, MonitorPlay, ExternalLink, Activity
} from 'lucide-react';

const APP_NOTICE = "Welcome to STREAM TV PRO. Enjoy the best premium broadcast experience. High-definition sports channels and premium content updated daily. ⚡";

export default function App() {
  const [playlists, setPlaylists] = useState<Playlist[]>(() => getPlaylists());
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'channels' | 'info' | 'lists' | 'dev'>('channels');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // UI State
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);
  const [showNotice, setShowNotice] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPlName, setNewPlName] = useState('');
  const [newPlUrl, setNewPlUrl] = useState('');
  
  // Direct Link
  const [directName, setDirectName] = useState('');
  const [directUrl, setDirectUrl] = useState('');

  const activePlaylist = useMemo(() => playlists.find(p => p.active) || playlists[0], [playlists]);

  useEffect(() => {
    loadPlaylist(activePlaylist);
  }, [activePlaylist]);

  const loadPlaylist = async (pl: Playlist) => {
    setLoading(true);
    setError('');
    setChannels([]);
    setActiveChannel(null);
    try {
      const resp = await fetch(pl.url).catch(() => fetch(`https://corsproxy.io/?${encodeURIComponent(pl.url)}`));
      if (!resp.ok) throw new Error('Network error');
      const text = await resp.text();
      const chs = parseM3U(text);
      if (chs.length === 0) throw new Error('No channels found');
      setChannels(chs);
    } catch (err: any) {
      setError(err.message || 'Failed to load playlist');
    } finally {
      setLoading(false);
    }
  };

  const filteredChannels = useMemo(() => {
    return channels.filter(c => {
      const matchQ = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.group.toLowerCase().includes(search.toLowerCase());
      const matchG = !groupFilter || c.group === groupFilter;
      return matchQ && matchG;
    });
  }, [channels, search, groupFilter]);

  const groups = useMemo(() => {
    return Array.from(new Set(channels.map(c => c.group))).sort();
  }, [channels]);

  const handlePlay = (ch: Channel) => {
    setActiveChannel(ch);
  };

  const handleNext = () => {
    if (!filteredChannels.length || !activeChannel) return;
    const idx = filteredChannels.findIndex(c => c.uid === activeChannel.uid);
    handlePlay(filteredChannels[(idx + 1) % filteredChannels.length]);
  };

  const handlePrev = () => {
    if (!filteredChannels.length || !activeChannel) return;
    const idx = filteredChannels.findIndex(c => c.uid === activeChannel.uid);
    handlePlay(filteredChannels[(idx - 1 + filteredChannels.length) % filteredChannels.length]);
  };

  const addPlaylist = () => {
    if (!newPlUrl) return;
    const name = newPlName.trim() || 'Custom Playlist';
    const newPl: Playlist = { id: `custom_${Date.now()}`, name, url: newPlUrl.trim(), active: true };
    const updated = playlists.map(p => ({ ...p, active: false }));
    updated.push(newPl);
    setPlaylists(updated);
    savePlaylists(updated);
    setShowAddModal(false);
    setNewPlName('');
    setNewPlUrl('');
    setActiveTab('channels');
  };

  const playDirectLink = () => {
    if (!directUrl) return;
    const name = directName.trim() || 'Direct Stream';
    handlePlay({ uid: 'direct', name, group: 'Direct Link', url: directUrl.trim(), logo: '' });
    setDirectName('');
    setDirectUrl('');
    setActiveTab('channels');
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-slate-950 text-slate-200 overflow-hidden font-sans">
      {/* Header */}
      <header className="flex-shrink-0 h-16 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/80 flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-3">
          <button onClick={() => setLeftDrawerOpen(true)} className="hidden md:flex lg:hidden p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-full transition-colors">
            <ListVideo className="w-5 h-5" />
          </button>
          <div className="hidden sm:flex w-10 h-10 bg-gradient-to-br from-teal-400 to-teal-600 rounded-full items-center justify-center shadow-[0_0_20px_rgba(20,184,166,0.3)] shrink-0">
            <Tv className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-black tracking-widest text-white whitespace-nowrap drop-shadow-[0_0_10px_rgba(20,184,166,0.2)]">
            STREAM <span className="text-teal-400">TV</span> <span className="text-amber-500 font-normal">PRO</span>
          </h1>
        </div>
        
        <div className="hidden md:flex flex-1 max-w-md mx-6 relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-teal-400 transition-colors" />
          <input 
            type="text" 
            placeholder="Search channels..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800/50 border border-slate-700/80 rounded-full py-2 pl-10 pr-4 focus:outline-none focus:border-teal-500/80 focus:ring-1 focus:ring-teal-500/50 text-sm transition-all"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={() => setRightDrawerOpen(true)} className="hidden md:flex lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-full transition-colors">
            <Activity className="w-5 h-5" />
          </button>
          {activeChannel && (
            <div className="hidden lg:flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg mr-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-bold text-red-500 tracking-widest">LIVE</span>
            </div>
          )}
          <button onClick={() => setShowAddModal(true)} className="p-2.5 bg-slate-800 border border-slate-700 hover:border-teal-500 hover:text-teal-400 rounded-full transition-all" title="Add Playlist">
            <Plus className="w-4 h-4" />
          </button>
          <button onClick={() => loadPlaylist(activePlaylist)} className="p-2.5 bg-slate-800 border border-slate-700 hover:border-teal-500 hover:text-teal-400 rounded-full transition-all" title="Reload">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {showNotice && (
        <div className="flex items-center justify-between bg-teal-500/10 border-b border-teal-500/20 px-4 py-2 relative overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 to-amber-500/5 backdrop-blur-md" />
          <div className="flex-1 overflow-hidden whitespace-nowrap z-10 flex text-xs sm:text-sm">
            <div className="animate-marquee inline-block text-teal-50/90 font-medium tracking-wide">
              <span className="text-amber-500 font-bold mr-3 uppercase tracking-widest text-[10px] sm:text-xs bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">NOTICE</span>
              {APP_NOTICE}
            </div>
          </div>
          <button onClick={() => setShowNotice(false)} className="ml-4 p-1.5 hover:bg-white/10 rounded-full z-10 text-slate-400 hover:text-white transition-colors bg-slate-900/50 backdrop-blur-md">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <main className="flex-1 flex overflow-hidden min-h-0 relative">
        
        {/* Drawers Backdrops */}
        {leftDrawerOpen && <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden" onClick={() => setLeftDrawerOpen(false)} />}
        {rightDrawerOpen && <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 lg:hidden" onClick={() => setRightDrawerOpen(false)} />}

        {/* Left Sidebar / Drawer */}
        <aside className={`
          flex flex-col w-72 lg:w-80 bg-slate-950 border-r border-slate-800/80 shrink-0
          fixed lg:relative inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out shadow-[10px_0_30px_rgba(0,0,0,0.5)]
          ${leftDrawerOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          hidden md:flex lg:flex
        `}>
          <div className="flex p-2 gap-1 bg-slate-950/50 border-b border-slate-800/80 shrink-0">
            <button onClick={() => setActiveTab('channels')} className={`flex-1 flex flex-col items-center gap-1.5 p-2 rounded-xl text-xs font-semibold transition-colors ${activeTab === 'channels' ? 'bg-slate-800/80 text-teal-400 shadow-sm' : 'text-slate-400 hover:bg-slate-800/40 hover:text-white'}`}>
              <MonitorPlay className="w-4 h-4" /> Channels
            </button>
            <button onClick={() => setActiveTab('lists')} className={`flex-1 flex flex-col items-center gap-1.5 p-2 rounded-xl text-xs font-semibold transition-colors ${activeTab === 'lists' ? 'bg-slate-800/80 text-teal-400 shadow-sm' : 'text-slate-400 hover:bg-slate-800/40 hover:text-white'}`}>
              <ListVideo className="w-4 h-4" /> Playlists
            </button>
            <button onClick={() => setActiveTab('dev')} className={`flex-1 flex flex-col items-center gap-1.5 p-2 rounded-xl text-xs font-semibold transition-colors ${activeTab === 'dev' ? 'bg-slate-800/80 text-teal-400 shadow-sm' : 'text-slate-400 hover:bg-slate-800/40 hover:text-white'}`}>
              <Code className="w-4 h-4" /> Developer
            </button>
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
            {activeTab === 'channels' && (
              <div className="flex flex-col h-full">
                <div className="p-3 shrink-0">
                  <select 
                    value={groupFilter} 
                    onChange={(e) => setGroupFilter(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-teal-500 appearance-none cursor-pointer"
                  >
                    <option value="">All Groups ({channels.length})</option>
                    {groups.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                
                <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
                  {loading ? (
                     <div className="p-4 text-center text-sm text-slate-500 flex flex-col items-center gap-2">
                       <div className="animate-spin w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full" />
                       Loading channels...
                     </div>
                  ) : filteredChannels.length === 0 ? (
                     <div className="p-4 text-center text-sm text-slate-500">No channels found</div>
                  ) : (
                    filteredChannels.map(ch => {
                      const isActive = activeChannel?.uid === ch.uid;
                      return (
                        <button 
                          key={ch.uid}
                          onClick={() => handlePlay(ch)}
                          className={`w-full flex items-center gap-3 p-2.5 rounded-2xl transition-all border relative overflow-hidden group ${isActive ? 'bg-gradient-to-r from-teal-500/10 to-transparent border-teal-500/40 shadow-[0_0_15px_rgba(20,184,166,0.1)]' : 'border-transparent hover:bg-white/5'}`}
                        >
                          {isActive && <div className="absolute inset-y-0 left-0 w-1 bg-teal-400 shadow-[0_0_10px_rgba(20,184,166,0.8)]" />}
                          <div className={`w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-xs font-black shrink-0 overflow-hidden border shadow-inner transition-colors ${isActive ? 'border-teal-400/50 text-teal-400 shadow-[0_0_10px_rgba(20,184,166,0.2)]' : 'border-slate-700/50 text-slate-400 group-hover:border-slate-500/50'}`}>
                            {ch.logo ? <img src={ch.logo} alt="" className="w-full h-full object-cover" /> : ch.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <div className={`truncate text-sm font-bold transition-colors ${isActive ? 'text-teal-400 drop-shadow-[0_0_8px_rgba(20,184,166,0.5)]' : 'text-slate-200 group-hover:text-white'}`}>{ch.name}</div>
                            <div className="truncate text-[10px] uppercase tracking-widest text-slate-500 mt-0.5 font-medium">{ch.group}</div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {activeTab === 'lists' && (
              <div className="p-4 space-y-6">
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-3">Saved Playlists</h3>
                  {playlists.map((pl) => (
                    <div key={pl.id} className={`p-4 rounded-xl border transition-all ${pl.active ? 'bg-slate-800 border-teal-500/50 shadow-[0_0_15px_rgba(20,184,166,0.1)]' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}>
                      <div className="font-bold text-sm mb-1 break-words">{pl.name} {pl.isDefault && <span className="text-[10px] text-teal-400 ml-2 tracking-wide">DEFAULT</span>}</div>
                      <div className="text-xs text-slate-500 truncate mb-4">{pl.url}</div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            const updated = playlists.map(p => ({ ...p, active: p.id === pl.id }));
                            setPlaylists(updated);
                            savePlaylists(updated);
                          }}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-colors ${pl.active ? 'bg-teal-600 border-teal-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'}`}
                        >
                          {pl.active ? 'Active' : 'Load'}
                        </button>
                        {!pl.isDefault && (
                          <button 
                            onClick={() => {
                              const updated = playlists.filter(p => p.id !== pl.id);
                              if (pl.active && updated.length > 0) updated[0].active = true;
                              setPlaylists(updated);
                              savePlaylists(updated);
                            }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-slate-800/80">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-3">Direct Video Link</h3>
                  <div className="space-y-3">
                    <input type="text" placeholder="Title (optional)" value={directName} onChange={e => setDirectName(e.target.value)} className="w-full bg-slate-800/80 border border-slate-700 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-teal-500" />
                    <input type="text" placeholder="https:// or ftp:// video link" value={directUrl} onChange={e => setDirectUrl(e.target.value)} className="w-full bg-slate-800/80 border border-slate-700 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-teal-500" />
                    <button onClick={playDirectLink} className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white rounded-xl text-sm font-bold shadow-lg transition-all flex items-center justify-center gap-2">
                      <PlayCircle className="w-4 h-4" /> Play Direct Link
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'dev' && (
              <div className="p-5 flex flex-col gap-6">
                <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-teal-500/10 to-blue-500/5 rounded-2xl border border-teal-500/20 shadow-lg">
                  <div className="w-16 h-16 rounded-xl flex items-center justify-center text-xl font-black shadow-[0_0_15px_rgba(20,184,166,0.4)] overflow-hidden border-2 border-teal-500/50">
                    <img src="https://api.dicebear.com/7.x/lorelei/svg?seed=Farabi&backgroundColor=0d9488" alt="Developer" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h2 className="font-black text-sm tracking-wide text-slate-100">FARABI AHMED SHAKIL</h2>
                    <div className="text-xs text-teal-400 font-bold tracking-widest uppercase mt-1 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" /> Developer
                    </div>
                  </div>
                </div>

                <blockquote className="p-4 bg-slate-800/40 border-l-4 border-teal-500 rounded-r-xl text-sm italic text-slate-400 leading-relaxed font-serif">
                  "Dream big, write code, never give up."
                </blockquote>

                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Contact</h3>
                  <a href="https://www.facebook.com/farabiahmedshakil11" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-3 bg-slate-800/60 border border-slate-700/80 hover:border-teal-500/50 hover:bg-slate-800 rounded-xl transition-all group">
                    <div className="w-10 h-10 bg-[#1877F2] rounded-lg flex items-center justify-center shrink-0"><span className="font-bold text-lg text-white">f</span></div>
                    <div className="flex-1">
                      <div className="font-bold text-sm group-hover:text-teal-400 transition-colors text-slate-200">Facebook</div>
                      <div className="text-xs text-slate-500">farabiahmedshakil11</div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-teal-400" />
                  </a>
                  <a href="https://t.me/farabiSH" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-3 bg-slate-800/60 border border-slate-700/80 hover:border-teal-500/50 hover:bg-slate-800 rounded-xl transition-all group">
                    <div className="w-10 h-10 bg-[#229ED9] rounded-lg flex items-center justify-center shrink-0"><span className="font-bold italic text-white">TG</span></div>
                    <div className="flex-1">
                      <div className="font-bold text-sm group-hover:text-teal-400 transition-colors text-slate-200">Telegram</div>
                      <div className="text-xs text-slate-500">@farabiSH</div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-teal-400" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-black overflow-hidden relative z-10">
          <div className="w-full shrink-0 aspect-video md:aspect-auto md:flex-1 relative shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-20">
            <div className="absolute inset-0">
              <Player channel={activeChannel} onNext={handleNext} onPrev={handlePrev} />
            </div>
          </div>
          
          {/* Mobile panel takes up the rest of the height on phones */}
          <div className="md:hidden flex-1 flex flex-col bg-slate-900 border-t border-slate-800 min-h-0 z-30">
              <div className="flex p-1.5 gap-1 bg-slate-950/40 border-b border-slate-800 shadow-sm shrink-0">
                <button onClick={() => setActiveTab('channels')} className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-[10px] font-bold tracking-wide uppercase transition-colors ${activeTab === 'channels' ? 'bg-slate-800 text-teal-400 shadow' : 'text-slate-400 hover:text-white'}`}>
                   <MonitorPlay className="w-4 h-4 mb-0.5" />
                   Channels
                </button>
                <button onClick={() => setActiveTab('info')} className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-[10px] font-bold tracking-wide uppercase transition-colors ${activeTab === 'info' ? 'bg-slate-800 text-teal-400 shadow' : 'text-slate-400 hover:text-white'}`}>
                   <Activity className="w-4 h-4 mb-0.5" />
                   Info
                </button>
                <button onClick={() => setActiveTab('lists')} className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-[10px] font-bold tracking-wide uppercase transition-colors ${activeTab === 'lists' ? 'bg-slate-800 text-teal-400 shadow' : 'text-slate-400 hover:text-white'}`}>
                   <ListVideo className="w-4 h-4 mb-0.5" />
                   Lists
                </button>
                <button onClick={() => setActiveTab('dev')} className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg text-[10px] font-bold tracking-wide uppercase transition-colors ${activeTab === 'dev' ? 'bg-slate-800 text-teal-400 shadow' : 'text-slate-400 hover:text-white'}`}>
                   <Code className="w-4 h-4 mb-0.5" />
                   Dev
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
                  {/* Mobile Mobile Channels */}
                  {activeTab === 'channels' && (
                    <div className="flex flex-col h-full">
                      <div className="p-2.5 shrink-0 flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                          <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-slate-800/80 border border-slate-700 rounded-lg py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:border-teal-500" />
                        </div>
                        <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="w-1/3 bg-slate-800/80 border border-slate-700 rounded-lg py-1.5 px-2 text-xs focus:outline-none focus:border-teal-500 appearance-none">
                          <option value="">All</option>
                          {groups.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto px-2 pb-6 space-y-1">
                        {loading ? (
                           <div className="p-8 text-center text-sm text-slate-500 flex flex-col items-center gap-2"><div className="animate-spin w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full" />Loading...</div>
                        ) : filteredChannels.length === 0 ? (
                           <div className="p-8 text-center text-sm text-slate-500">No channels found</div>
                        ) : (
                          filteredChannels.slice(0, 200).map(ch => {
                            const isActive = activeChannel?.uid === ch.uid;
                            return (
                              <button key={ch.uid} onClick={() => handlePlay(ch)} className={`w-full flex items-center gap-3 p-2.5 rounded-2xl transition-all border relative overflow-hidden group ${isActive ? 'bg-gradient-to-r from-teal-500/10 to-transparent border-teal-500/40 shadow-[0_0_15px_rgba(20,184,166,0.1)]' : 'border-transparent hover:bg-white/5'}`}>
                                {isActive && <div className="absolute inset-y-0 left-0 w-1 bg-teal-400 shadow-[0_0_10px_rgba(20,184,166,0.8)]" />}
                                <div className={`w-10 h-10 rounded-full border shadow-inner bg-slate-900 flex items-center justify-center text-xs font-black shrink-0 overflow-hidden transition-colors ${isActive ? 'border-teal-400/50 text-teal-400 shadow-[0_0_10px_rgba(20,184,166,0.2)]' : 'border-slate-700/50 text-slate-400 group-hover:border-slate-500/50'}`}>
                                  {ch.logo ? <img src={ch.logo} alt="" className="w-full h-full object-cover" /> : ch.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                  <div className={`truncate text-sm font-bold transition-colors ${isActive ? 'text-teal-400 drop-shadow-[0_0_8px_rgba(20,184,166,0.5)]' : 'text-slate-200 group-hover:text-white'}`}>{ch.name}</div>
                                  <div className="truncate text-[10px] uppercase tracking-widest text-slate-500 mt-0.5 font-medium leading-tight">{ch.group}</div>
                                </div>
                              </button>
                            );
                          })
                        )}
                        {filteredChannels.length > 200 && <div className="text-center text-xs text-slate-500 p-2">Search to see more...</div>}
                      </div>
                    </div>
                  )}

                  {/* Mobile Info */}
                  {activeTab === 'info' && (
                     <div className="p-4 space-y-4">
                       <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase mb-4 flex items-center gap-2">
                         <Activity className="w-4 h-4 text-teal-500" /> NOW PLAYING
                       </h3>
                       {activeChannel ? (
                         <div className="flex flex-col gap-4 animate-in fade-in">
                           <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 group">
                             <div className="flex justify-between items-start mb-2">
                               <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Channel ID</div>
                               <span className="text-[10px] font-mono text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20">{activeChannel.uid.substring(0,6)}</span>
                             </div>
                             <div className="font-bold text-white text-lg leading-tight">{activeChannel.name}</div>
                             <div className="text-xs text-amber-500 font-bold tracking-wide mt-1">{activeChannel.group}</div>
                           </div>
                           
                           {/* Broadcast Monitor Data Feed Grid */}
                           <div className="grid grid-cols-2 gap-3">
                             <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80 flex flex-col justify-between relative overflow-hidden">
                               <div className="absolute -top-1 -right-1 p-2 opacity-5"><Activity className="w-12 h-12" /></div>
                               <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-2">Video Res</div>
                               <div className="font-mono text-white text-sm font-bold">1080p<span className="text-[10px] text-teal-400 ml-1">FHD</span></div>
                             </div>
                             <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80 flex flex-col justify-between relative overflow-hidden">
                               <div className="absolute -top-1 -right-1 p-2 opacity-5"><RefreshCw className="w-12 h-12" /></div>
                               <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-2">Framerate</div>
                               <div className="font-mono text-white text-sm font-bold">60<span className="text-[10px] text-teal-400 ml-1">FPS</span></div>
                             </div>
                             <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80 flex flex-col justify-between relative overflow-hidden">
                               <div className="absolute -top-1 -right-1 p-2 opacity-5"><MonitorPlay className="w-12 h-12" /></div>
                               <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-2">Bitrate</div>
                               <div className="font-mono text-white text-sm font-bold">4.2<span className="text-[10px] text-amber-500 ml-1">Mbps</span></div>
                             </div>
                             <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80 flex flex-col justify-between relative overflow-hidden">
                               <div className="absolute -top-1 -right-1 p-2 opacity-5"><Code className="w-12 h-12" /></div>
                               <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-2">Codec</div>
                               <div className="font-mono text-white text-sm font-bold">H.264<span className="text-[10px] text-slate-500 ml-1">AVC</span></div>
                             </div>
                           </div>
                           
                           <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 mt-2">
                             <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1">Stream Feed (Encrypted)</div>
                             <div className="text-[10px] text-slate-400/80 break-all font-mono line-clamp-2">{activeChannel.url}</div>
                           </div>
                         </div>
                       ) : (
                         <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50 py-10">
                           <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                             <Tv className="w-8 h-8 text-slate-500" />
                           </div>
                           <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">No Signal</p>
                         </div>
                       )}
                     </div>
                  )}

                  {/* Mobile Lists... */}
                  {activeTab === 'lists' && (
                     <div className="p-4 space-y-6 overflow-y-auto">
                       <div className="space-y-3">
                         <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2">Saved Playlists</h3>
                         {playlists.map((pl) => (
                           <div key={pl.id} className={`p-4 rounded-xl border transition-all ${pl.active ? 'bg-slate-800 border-teal-500/50 shadow-[0_0_15px_rgba(20,184,166,0.1)]' : 'bg-slate-900 border-slate-800'}`}>
                             <div className="font-bold text-sm mb-1 break-words">{pl.name} {pl.isDefault && <span className="text-[10px] text-teal-400 ml-2 tracking-wide">DEFAULT</span>}</div>
                             <div className="text-xs text-slate-500 truncate mb-4">{pl.url}</div>
                             <div className="flex gap-2">
                               <button 
                                 onClick={() => {
                                   const updated = playlists.map(p => ({ ...p, active: p.id === pl.id }));
                                   setPlaylists(updated);
                                   savePlaylists(updated);
                                 }} 
                                 className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors border ${pl.active ? 'bg-teal-600 border-teal-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300'}`}
                               >
                                 {pl.active ? 'Active' : 'Load'}
                               </button>
                               {!pl.isDefault && (
                                 <button 
                                   onClick={() => {
                                     const updated = playlists.filter(p => p.id !== pl.id);
                                     if (pl.active && updated.length > 0) updated[0].active = true;
                                     setPlaylists(updated);
                                     savePlaylists(updated);
                                   }}
                                   className="px-4 py-2 rounded-lg text-xs font-bold border border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors flex items-center justify-center shrink-0"
                                 >
                                   <Trash2 className="w-4 h-4" />
                                 </button>
                               )}
                             </div>
                           </div>
                         ))}
                       </div>

                       <div className="pt-4 border-t border-slate-800/80">
                         <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-3">Direct Video Link</h3>
                         <div className="space-y-3">
                           <input type="text" placeholder="Title (optional)" value={directName} onChange={e => setDirectName(e.target.value)} className="w-full bg-slate-800/80 border border-slate-700 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-teal-500 transition-colors" />
                           <input type="text" placeholder="https:// or ftp:// video link" value={directUrl} onChange={e => setDirectUrl(e.target.value)} className="w-full bg-slate-800/80 border border-slate-700 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-teal-500 transition-colors" />
                           <button onClick={playDirectLink} className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 active:scale-[0.98] text-white rounded-xl text-sm font-bold shadow-lg transition-transform flex items-center justify-center gap-2">
                             <PlayCircle className="w-5 h-5" /> Play Direct Link
                           </button>
                         </div>
                       </div>
                     </div>
                  )}
                  
                  {activeTab === 'dev' && (
                    <div className="p-4 flex flex-col gap-4">
                      <div className="p-5 bg-gradient-to-br from-teal-500/10 to-indigo-500/5 rounded-xl border border-teal-500/20 text-center flex flex-col items-center">
                        <div className="w-16 h-16 rounded-xl overflow-hidden shadow-[0_0_15px_rgba(20,184,166,0.5)] border-2 border-teal-500/50 mb-3">
                          <img src="https://api.dicebear.com/7.x/lorelei/svg?seed=Farabi&backgroundColor=0d9488" alt="Developer" className="w-full h-full object-cover" />
                        </div>
                        <h2 className="font-black text-sm tracking-wide mb-1 text-slate-100">FARABI AHMED SHAKIL</h2>
                        <div className="text-[10px] text-teal-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" /> Developer
                        </div>
                      </div>
                      <a href="https://www.facebook.com/farabiahmedshakil11" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-slate-800/60 rounded-xl">
                        <div className="w-8 h-8 bg-[#1877F2] rounded-lg flex items-center justify-center font-bold">f</div>
                        <div className="text-sm font-bold">Facebook</div>
                      </a>
                      <a href="https://t.me/farabiSH" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-slate-800/60 rounded-xl">
                        <div className="w-8 h-8 bg-[#229ED9] rounded-lg flex items-center justify-center font-bold italic">TG</div>
                        <div className="text-sm font-bold">Telegram</div>
                      </a>
                    </div>
                  )}
              </div>
            </div>

          </div>

        {/* Right Info Panel / Drawer */}
        <aside className={`
          flex flex-col w-80 bg-slate-950 border-l border-slate-800/80 shrink-0
          fixed lg:relative inset-y-0 right-0 z-50 transform transition-transform duration-300 ease-in-out shadow-[-10px_0_30px_rgba(0,0,0,0.5)]
          ${rightDrawerOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
          hidden md:flex lg:flex
        `}>
          <div className="flex items-center justify-between p-4 border-b border-slate-800/80 lg:hidden shrink-0">
            <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase">Stream Info</h3>
            <button onClick={() => setRightDrawerOpen(false)} className="p-1.5 hover:bg-slate-800 rounded-full text-slate-400">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="p-6 flex-1 flex flex-col overflow-y-auto">
            <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase mb-6 flex items-center gap-2">
              <Activity className="w-4 h-4 text-teal-500" /> NOW PLAYING
            </h3>
            {activeChannel ? (
              <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-full aspect-square rounded-2xl bg-slate-950/50 border border-slate-800/80 flex items-center justify-center overflow-hidden p-6 relative group mb-2 shadow-inner">
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent z-10" />
                  {activeChannel.logo ? (
                    <img src={activeChannel.logo} alt="" className="w-full h-full object-contain drop-shadow-2xl relative z-20 group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="relative z-20 w-28 h-28 sm:w-32 sm:h-32 rounded-full flex items-center justify-center bg-slate-900 border border-slate-800 shadow-[0_0_30px_rgba(20,184,166,0.05)] group-hover:shadow-[0_0_30px_rgba(20,184,166,0.15)] transition-all duration-700">
                      <div className="absolute inset-0 rounded-full border-t-2 border-teal-500/50 animate-spin" style={{ animationDuration: '4s' }} />
                      <div className="absolute inset-2 sm:inset-3 rounded-full border-b-2 border-amber-500/30 animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }} />
                      <div className="absolute inset-0 flex items-center justify-center gap-1 sm:gap-1.5 opacity-50">
                        <div className="w-1.5 h-4 sm:h-6 bg-slate-500 rounded-full animate-[bounce_1s_infinite]" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-8 sm:h-12 bg-slate-400 rounded-full animate-[bounce_1.2s_infinite]" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-12 sm:h-16 bg-teal-500 rounded-full animate-[bounce_0.9s_infinite]" style={{ animationDelay: '300ms' }} />
                        <div className="w-1.5 h-7 sm:h-10 bg-slate-400 rounded-full animate-[bounce_1.1s_infinite]" style={{ animationDelay: '450ms' }} />
                        <div className="w-1.5 h-5 sm:h-8 bg-slate-500 rounded-full animate-[bounce_1.3s_infinite]" style={{ animationDelay: '600ms' }} />
                      </div>
                    </div>
                  )}
                  <div className="absolute top-4 right-4 z-20 flex items-center gap-2 bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                    <span className="text-[10px] font-bold text-white tracking-widest leading-none">LIVE</span>
                  </div>
                </div>
                
                <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 hover:border-teal-500/30 transition-colors group">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Channel ID</div>
                    <span className="text-[10px] font-mono text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20">{activeChannel.uid.substring(0,6)}</span>
                  </div>
                  <div className="font-bold text-white text-lg leading-tight group-hover:text-teal-400 transition-colors">{activeChannel.name}</div>
                  <div className="text-xs text-amber-500 font-bold tracking-wide mt-1">{activeChannel.group}</div>
                </div>

                {/* Broadcast Monitor Data Feed Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute -top-1 -right-1 p-2 opacity-5"><Activity className="w-12 h-12" /></div>
                    <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-2">Video Res</div>
                    <div className="font-mono text-white text-sm font-bold">1080p<span className="text-[10px] text-teal-400 ml-1">FHD</span></div>
                  </div>
                  <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute -top-1 -right-1 p-2 opacity-5"><RefreshCw className="w-12 h-12" /></div>
                    <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-2">Framerate</div>
                    <div className="font-mono text-white text-sm font-bold">60<span className="text-[10px] text-teal-400 ml-1">FPS</span></div>
                  </div>
                  <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute -top-1 -right-1 p-2 opacity-5"><MonitorPlay className="w-12 h-12" /></div>
                    <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-2">Bitrate</div>
                    <div className="font-mono text-white text-sm font-bold">4.2<span className="text-[10px] text-amber-500 ml-1">Mbps</span></div>
                  </div>
                  <div className="bg-slate-950/50 p-3 rounded-xl border border-slate-800/80 flex flex-col justify-between relative overflow-hidden">
                    <div className="absolute -top-1 -right-1 p-2 opacity-5"><Code className="w-12 h-12" /></div>
                    <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-2">Codec</div>
                    <div className="font-mono text-white text-sm font-bold">H.264<span className="text-[10px] text-slate-500 ml-1">AVC</span></div>
                  </div>
                </div>
                
                <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 mt-2">
                  <div className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-1">Stream Feed (Encrypted)</div>
                  <div className="text-[10px] text-slate-400/80 break-all font-mono line-clamp-2">{activeChannel.url}</div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-800 rounded-3xl text-slate-500 text-sm font-medium">
                <div className="flex flex-col items-center gap-3">
                  <MonitorPlay className="w-10 h-10 opacity-20" />
                  <span className="opacity-60">No active stream</span>
                </div>
              </div>
            )}
          </div>
        </aside>
      </main>

      {/* Add Playlist Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700/80 p-6 rounded-2xl w-full max-w-md shadow-2xl relative">
            <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-black mb-6">Add New Playlist</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Name (optional)</label>
                <input type="text" value={newPlName} onChange={(e) => setNewPlName(e.target.value)} placeholder="My IPTV List" className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 focus:outline-none focus:border-teal-500 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">M3U/M3U8 URL</label>
                <input type="url" value={newPlUrl} onChange={(e) => setNewPlUrl(e.target.value)} placeholder="https://..." className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 focus:outline-none focus:border-teal-500 transition-colors" />
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button onClick={() => setShowAddModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">Cancel</button>
                <button onClick={addPlaylist} disabled={!newPlUrl} className="px-5 py-2.5 rounded-xl font-bold bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-lg shadow-teal-500/20 transition-all">Add Playlist</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
