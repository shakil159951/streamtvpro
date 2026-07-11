import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Player from './components/Player';
import { Channel, Playlist } from './types';
import { getPlaylists, savePlaylists } from './lib/storage';
import { parseM3U } from './lib/m3u';
import { subscribeToConfig, updateConfig } from './lib/firebase';
import { AlertCircle, 
  Tv, Code, ListVideo, Search, Plus, PlayCircle, RefreshCw, 
  Trash2, X, MonitorPlay, ExternalLink, Activity, Film, Clapperboard, FolderOpen, Settings, Edit, ChevronDown, Rocket, ShieldCheck, Lightbulb, Quote, Code2, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAntiDebug } from './hooks/useAntiDebug';
import { ChannelLogo } from './components/ChannelLogo';
import { ChannelItem } from './components/ChannelItem';

const APP_NOTICE = "Welcome to STREAM TV PRO. Enjoy the best premium broadcast experience. High-definition sports channels and premium content updated daily. ⚡";

export default function App() {
  const isRouteAdmin = window.location.pathname.includes('/admin') || window.location.search.includes('admin=true') || window.location.hash.includes('admin');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoginInput, setAdminLoginInput] = useState('');

  const [playlists, setPlaylists] = useState<Playlist[]>(() => getPlaylists());
  const [customLogos, setCustomLogos] = useState<Record<string, string>>(() => { try { return JSON.parse(localStorage.getItem('custom_logos') || '{}'); } catch { return {}; } });
  const handleUpdateLogo = useCallback((channelName: string, logoUrl: string | null) => { const updated = { ...customLogos }; if (logoUrl) { updated[channelName] = logoUrl; } else { delete updated[channelName]; } setCustomLogos(updated); localStorage.setItem('custom_logos', JSON.stringify(updated)); if (isAdmin) { updateConfig({ customLogos: updated }); } }, [customLogos, isAdmin]);
  const [channels, setChannels] = useState<Channel[]>([]);
    const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const isDevToolsOpen = useAntiDebug();
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'channels' | 'lists' | 'dev' | 'setup'>('channels');
    const [loading, setLoading] = useState(true);
  (false);
  const [error, setError] = useState('');
  ('');

  // UI State
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const [showNotice, setShowNotice] = useState(true);
  const [appNotice, setAppNotice] = useState(() => localStorage.getItem('app_notice') || APP_NOTICE);
  const [devConfig, setDevConfig] = useState<any>(() => { try { return JSON.parse(localStorage.getItem('dev_config') || '{}'); } catch { return {}; } });
  
  // Backend Sync
  const [backendSyncing, setBackendSyncing] = useState(false);
  const [backendError, setBackendError] = useState('');
  const [backendSuccess, setBackendSuccess] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDirectModal, setShowDirectModal] = useState(false);
  const [newPlName, setNewPlName] = useState('');
  const [newPlUrl, setNewPlUrl] = useState('');
    
  // Edit Playlist Modal/Inline State
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);
  const [editPlName, setEditPlName] = useState('');
  const [editPlUrl, setEditPlUrl] = useState('');
    
  
  
  const [customJsonInput, setCustomJsonInput] = useState(() => localStorage.getItem('custom_json_config') || '');

  // Direct Link
  const [directName, setDirectName] = useState('');
  const [directUrl, setDirectUrl] = useState('');
  const activeLivePlaylist = useMemo(() => playlists.find(p => p.active) || playlists[0], [playlists]);

  
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.ctrlKey && e.key === 'U') ||
        (e.metaKey && e.altKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.metaKey && e.key === 'U')
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (activeChannel) {
      document.title = `${activeChannel.name} - StreamTVPro`;
    } else {
      document.title = 'StreamTVPro';
    }
  }, [activeChannel]);

  useEffect(() => {
    if (activeLivePlaylist) {
      loadPlaylist(activeLivePlaylist, setChannels, setLoading, setError);
    }
  }, [activeLivePlaylist?.url]);

  
  const loadPlaylist = async (pl: Playlist, setChs: any, setLdg: any, setErr: any) => {
    setLdg(true);
    setErr('');
    setChs([]);
    setActiveChannel(null);
    try {
      const fetchOpts = { cache: 'no-store' as RequestCache };
      let resp;
      const targetUrl = pl.url === '/api/playlists' 
            ? 'https://raw.githubusercontent.com/shakil951/PlaylistCheck/refs/heads/main/combined_playlist.m3u'
            : pl.url;
      
      let text = '';
      try {
        let fetchUrl = pl.url === '/api/playlists' ? '/api/channels' : `/api/channels?url=${encodeURIComponent(pl.url)}`;
        resp = await fetch(fetchUrl, fetchOpts);
        if (!resp.ok) {
           const errText = await resp.text();
           throw new Error('BACKEND_ERR: ' + (errText || 'Failed'));
        }
        text = await resp.text();
        // If the backend returns HTML (e.g. SPA fallback on static hosting), treat it as failed
        if (text.trim().startsWith('<') && (text.includes('<!DOCTYPE html>') || text.toLowerCase().includes('<html'))) {
            throw new Error('Backend returned HTML');
        }
      } catch (e) {
        // Allow fallback even if backend failed
        // Fallback if backend is unavailable (e.g. static hosting)
        try {
            resp = await fetch(targetUrl, fetchOpts);
            if (!resp.ok) throw new Error('Direct fetch failed');
            text = await resp.text();
        } catch (e2) {
            resp = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`, fetchOpts);
            if (!resp.ok) throw new Error('Proxy fetch failed');
            text = await resp.text();
        }
      }
      const chs = parseM3U(text);
      console.log("Parsed channels:", chs.length, "from text length:", text.length);
      if (chs.length === 0) throw new Error(text.includes('404') ? 'Error 404: Playlist not found' : 'No channels found in playlist');
      setChs(chs);
    } catch (err: any) {
      console.error("Playlist load error:", err);
      setErr(err.message || 'Failed to load playlist');
    } finally {
      setLdg(false);
    }
  };

  const displayChannels = channels;

  const filteredChannels = useMemo(() => {
    if (!displayChannels) return [];
    const lowerSearch = search.toLowerCase();
    return displayChannels.filter(c => {
      const matchQ = !lowerSearch || c.name.toLowerCase().includes(lowerSearch) || c.group.toLowerCase().includes(lowerSearch);
      const matchG = !groupFilter || c.group === groupFilter;
      return matchQ && matchG;
    });
  }, [displayChannels, search, groupFilter]);

  
  
  const groups = useMemo(() => {
    return Array.from(new Set(displayChannels.map(c => c.group))).sort();
  }, [displayChannels]);

  const handlePlay = useCallback((ch: Channel) => {
    setActiveChannel(ch);
  }, []);

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
    const newPl: Playlist = { id: `custom_${Date.now()}`, name, url: newPlUrl.trim(), active: true};
    const updated = playlists.map(p => ({ ...p, active: false }));
    updated.push(newPl);
    setPlaylists(updated);
    savePlaylists(updated);
    publishConfigToFirebase(updated);
    setShowAddModal(false);
    setNewPlName('');
    setNewPlUrl('');
    setActiveTab('channels');
  };

  const handleFirebaseData = (data: any) => {
    if (data.app_notice) {
      setAppNotice(data.app_notice);
      localStorage.setItem('app_notice', data.app_notice);
    }
    
    if (data.devConfig) {
      setDevConfig(data.devConfig);
      localStorage.setItem('dev_config', JSON.stringify(data.devConfig));
    }
    
    if (data.customLogos) {
      setCustomLogos(data.customLogos);
      localStorage.setItem('custom_logos', JSON.stringify(data.customLogos));
    }
    
    if (data.playlists && Array.isArray(data.playlists)) {
      let currentPls = getPlaylists().filter(p => !p.id.startsWith('remote_'));
      // If Firebase has playlists, we should remove the default playlist so it doesn't get merged if the admin didn't include it.
      if (data.playlists.length > 0) {
        currentPls = currentPls.filter(p => !p.isDefault);
      }
      const newPls = data.playlists.map((pl: any, i: number) => ({
        id: `remote_${Date.now()}_${i}`,
        name: pl.name || 'Remote Playlist',
        url: pl.url,
        active: false,
        type: pl.type || 'live'
      }));
      const newUrls = new Set(newPls.map((p: any) => p.url));
      const currentPlsDeduped = currentPls.filter(p => !newUrls.has(p.url));
      const combined = [...currentPlsDeduped, ...newPls];
      // Ensure at least one is active
      if (combined.length > 0 && !combined.find(p => p.active && p.type === 'live')) {
        const live = combined.find(p => true);
        if (live) live.active = true;
      }
      savePlaylists(combined);
      setPlaylists(getPlaylists());
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeToConfig((data) => {
      handleFirebaseData(data);
    });
    return () => unsubscribe();
  }, []);

  const publishConfigToFirebase = async (plsToPublish: Playlist[] = playlists) => {
    setBackendSyncing(true);
    setBackendError('');
    setBackendSuccess('');
    try {
      const data = JSON.parse(JSON.stringify({
        app_notice: appNotice || '',
        devConfig: devConfig || {},
        playlists: plsToPublish.map(p => ({
          name: p.name || '',
          url: p.url || '',
          type: 'live'
        })),
        customLogos: customLogos
      }));
      await updateConfig(data);
      localStorage.setItem('custom_json_config', JSON.stringify(data, null, 2));
      setCustomJsonInput(JSON.stringify(data, null, 2));
      setBackendSyncing(false);
      setBackendSuccess('Config successfully published to Firebase!');
      setTimeout(() => setBackendSuccess(''), 3000);
      return true;
    } catch (e: any) {
      setBackendError(e.message || 'Failed to sync');
      setBackendSyncing(false);
      return false;
    }
  };

  const playDirectLink = () => {
    if (!directUrl) return;
    const name = directName.trim() || 'Direct Stream';
    handlePlay({ uid: 'direct', name, group: 'Direct Link', url: directUrl.trim(), logo: '' });
    setDirectName('');
    setDirectUrl('');
    setActiveTab('channels');
  };

  useEffect(() => {
    setSearch('');
  }, [activeTab]);

  




  

  if (isRouteAdmin && !isAdmin) {
    return (
      <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-4 relative">
        <div className="cinematic-bg"></div>
        <div className="glass-card border border-white/5 p-8 rounded-2xl w-full max-w-sm shadow-2xl relative z-10">
          <div className="w-16 h-16 bg-primary-light rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(0,229,195,0.2)]">
            <Settings className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-center text-white mb-6 tracking-wide">Admin Authentication</h1>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (adminLoginInput === 'shakil10') {
              setIsAdmin(true);
            } else {
              alert('Incorrect password');
              setAdminLoginInput('');
            }
          }} className="space-y-4">
            <input 
              type="password" 
              value={adminLoginInput}
              onChange={(e) => setAdminLoginInput(e.target.value)}
              placeholder="Enter Admin Password" 
              className="w-full bg-black/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary shadow-inner"
              autoFocus
            />
            <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-teal-950 font-bold rounded-xl py-3 shadow-[0_0_20px_rgba(0,229,195,0.3)] transition-all">
              Login
            </button>
            <button type="button" onClick={() => window.location.href = '/'} className="w-full text-slate-400 hover:text-white text-sm py-2 transition-colors">
              Return to App
            </button>
          </form>
        </div>
      </div>
    );
  }

  const devPhoto = devConfig?.photo || "https://api.dicebear.com/7.x/lorelei/svg?seed=Farabi&backgroundColor=0d9488";
  const devName = devConfig?.name || "FARABI AHMED\nSHAKIL";
  const devFbUrl = devConfig?.facebookUrl || "https://www.facebook.com/farabiahmedshakil11";
  const devFbHandle = devConfig?.facebookHandle || "farabiahmedshakil11";
  const devTgUrl = devConfig?.telegramUrl || "https://t.me/farabiSH";
  const devTgHandle = devConfig?.telegramHandle || "@farabiSH";

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-transparent text-slate-200 overflow-hidden font-sans relative">
      <div className="cinematic-bg"></div>
      <div className="vignette"></div>
      {/* Header */}
      <header className="flex-shrink-0 h-16 glass-panel flex items-center justify-between px-4 z-40 border-b-0 border-white/5 relative">
        <div className="flex items-center gap-3">
          <button aria-label="Open Menu" onClick={() => setLeftDrawerOpen(true)} className="hidden md:flex lg:hidden p-2 -ml-2 text-slate-400 hover:text-white rounded-full transition-colors glass-button">
            <ListVideo className="w-5 h-5" />
          </button>
          <div className="hidden sm:flex w-9 h-9 bg-primary-light rounded-xl items-center justify-center border border-primary/20 shrink-0 shadow-[0_0_15px_rgba(0,229,195,0.2)]">
            <Tv className="w-5 h-5 text-primary" />
          </div>
          <h1 className="flex items-center gap-1.5 text-lg font-bold tracking-widest text-white whitespace-nowrap select-none drop-shadow-md">
            <span>STREAM <span className="text-primary font-semibold">TV</span></span>
            <span className="text-[10px] bg-gradient-to-r from-primary to-blue-400 text-slate-950 px-1.5 py-0.5 rounded font-black tracking-tight shadow-[0_0_10px_rgba(0,229,195,0.3)]">PRO</span>
          </h1>
        </div>
        
        <div className="hidden md:flex flex-1 max-w-md mx-6 relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Search channels..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full glass-card border-white/10 rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:border-primary/50 text-sm transition-all text-white placeholder-slate-500 shadow-inner"
          />
        </div>
        
        <div className="flex items-center gap-3">
          {activeChannel && (
            <div className="hidden lg:flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg mr-2 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-bold text-red-500 tracking-widest uppercase">Live</span>
            </div>
          )}
          {isRouteAdmin && isAdmin && (
            <button aria-label="Add Playlist" onClick={() => setShowAddModal(true)} className="p-2 glass-button text-slate-300 hover:text-white rounded-xl transition-all" title="Add Playlist">
              <Plus className="w-4 h-4" />
            </button>
          )}
          <button aria-label="Direct Play" onClick={() => setShowDirectModal(true)} className="p-2 glass-button text-slate-300 hover:text-white rounded-xl transition-all" title="Direct Play">
            <FolderOpen className="w-4 h-4" />
          </button>
          <button onClick={() => {
             if (activeLivePlaylist) {
              loadPlaylist(activeLivePlaylist, setChannels, setLoading, setError);
            }
          }} className="p-2 glass-button text-slate-300 hover:text-white rounded-xl transition-all" title="Reload">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {showNotice && (
        <div className="flex items-center justify-between bg-black/60 border-b border-white/5 px-4 py-2.5 relative overflow-hidden shrink-0 backdrop-blur-xl shadow-sm z-40">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/5" />
          <div className="flex-1 overflow-hidden whitespace-nowrap z-10 flex items-center text-xs sm:text-sm">
            <div className="animate-marquee inline-block text-slate-300 font-medium tracking-wide">
              <span className="text-primary font-bold mr-3 uppercase tracking-widest text-[10px] sm:text-xs bg-primary/10 px-2.5 py-1 rounded-md border border-primary/20 shadow-inner inline-flex items-center gap-1.5 align-middle">
                <Info className="w-3.5 h-3.5" />
                Update
              </span>
              <span className="align-middle">{appNotice}</span>
            </div>
          </div>
          <button aria-label="Close Notice" onClick={() => setShowNotice(false)} className="ml-4 p-1.5 hover:bg-white/10 rounded-full z-10 text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <main className="flex-1 flex overflow-hidden min-h-0 relative">
        
        {/* Drawers Backdrops */}
        {leftDrawerOpen && <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-40 lg:hidden" onClick={() => setLeftDrawerOpen(false)} />}

        {/* Left Sidebar / Drawer */}
        <aside className={`
          flex flex-col w-72 lg:w-80 glass-panel border-r-0 border-white/5 shrink-0
          fixed lg:relative inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out shadow-[10px_0_30px_rgba(0,0,0,0.5)]
          ${leftDrawerOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          hidden md:flex lg:flex
        `}>
          <div className="flex p-3 gap-2 bg-transparent border-b border-white/5 shrink-0 overflow-x-auto no-scrollbar relative z-10">
            <button onClick={() => setActiveTab('channels')} className={`flex-1 min-w-[70px] flex flex-col items-center gap-1.5 p-2.5 rounded-xl text-[10px] sm:text-xs font-semibold transition-all duration-300 ${activeTab === 'channels' ? 'glass-button-active' : 'glass-button text-slate-400 hover:text-white'}`}>
              <MonitorPlay className={`w-4 h-4 ${activeTab === 'channels' ? 'text-primary' : ''}`} /> Live TV
            </button>
            
            <button onClick={() => setActiveTab('dev')} className={`flex-1 min-w-[70px] flex flex-col items-center gap-1.5 p-2.5 rounded-xl text-[10px] sm:text-xs font-semibold transition-all duration-300 ${activeTab === 'dev' ? 'glass-button-active' : 'glass-button text-slate-400 hover:text-white'}`}>
              <Code className={`w-4 h-4 ${activeTab === 'dev' ? 'text-primary' : ''}`} /> Dev
            </button>
            {isRouteAdmin && isAdmin && (
              <>
                <button onClick={() => setActiveTab('lists')} className={`flex-1 min-w-[70px] flex flex-col items-center gap-1.5 p-2.5 rounded-xl text-[10px] sm:text-xs font-semibold transition-all duration-300 ${activeTab === 'lists' ? 'glass-button-active' : 'glass-button text-slate-400 hover:text-white'}`}>
                  <ListVideo className={`w-4 h-4 ${activeTab === 'lists' ? 'text-primary' : ''}`} /> Playlists
                </button>
                <button onClick={() => setActiveTab('setup')} className={`flex-1 min-w-[70px] flex flex-col items-center gap-1.5 p-2.5 rounded-xl text-[10px] sm:text-xs font-semibold transition-all duration-300 ${activeTab === 'setup' ? 'glass-button-active' : 'glass-button text-slate-400 hover:text-white'}`}>
                  <Settings className={`w-4 h-4 ${activeTab === 'setup' ? 'text-primary' : ''}`} /> Setup
                </button>
              </>
            )}
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
            {activeTab === 'channels' && (
              <div className="flex flex-col h-full">
                <div className="p-3 shrink-0 flex flex-col gap-2">
                  {playlists.length > 1 && (
                    <div className="relative group shadow-sm">
                    <select
                      value={activeLivePlaylist?.id || ''}
                      onChange={(e) => {
                        const updated = playlists.map(p => ({ ...p, active: p.id === e.target.value }));
                        setPlaylists(updated);
                        savePlaylists(updated);
                      }}
                      className="w-full bg-[#1a1a1a] hover:bg-[#252525] border border-white/10 group-hover:border-white/20 rounded-xl py-2 pl-3 pr-8 text-sm font-semibold focus:outline-none focus:border-primary/50 appearance-none cursor-pointer text-slate-200 transition-all"
                    >
                      {playlists.map(p => <option className="glass-card text-slate-200" key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/70 pointer-events-none group-hover:text-primary transition-colors" />
                  </div>
                  )}
                  <div className="relative group shadow-sm">
                    <select 
                      value={groupFilter} 
                      onChange={(e) => setGroupFilter(e.target.value)}
                      className="w-full bg-[#1a1a1a] hover:bg-[#252525] border border-white/10 group-hover:border-white/20 rounded-xl py-2 pl-3 pr-8 text-sm font-semibold focus:outline-none focus:border-primary/50 appearance-none cursor-pointer transition-all text-slate-200"
                    >
                      <option className="glass-card text-slate-200" value="">All Groups ({channels.length})</option>
                      {groups.map(g => <option className="glass-card text-slate-200" key={g} value={g}>{g}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/70 pointer-events-none group-hover:text-primary transition-colors" />
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
                  <AnimatePresence mode="wait">
                    {loading ? (
                       <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-8 text-center text-sm text-slate-500 flex flex-col items-center justify-center gap-4">
                         <div className="relative flex items-center justify-center">
                           <div className="absolute inset-0 border-[2px] border-white/5 rounded-full w-8 h-8 blur-[1px]"></div>
                           <div className="animate-spin w-8 h-8 border-[2px] border-primary border-t-transparent border-l-transparent rounded-full shadow-[0_0_10px_rgba(20,184,166,0.3)]" />
                         </div>
                         <span className="text-[10px] tracking-widest uppercase font-semibold text-primary animate-pulse">Loading</span>
                       </motion.div>
                    ) : error ? (
                       <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 text-center text-sm text-red-500">{error}</motion.div>
                    ) : filteredChannels.length === 0 ? (
                       <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 text-center text-sm text-slate-500">No channels found</motion.div>
                    ) : (
                      <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        {filteredChannels.slice(0, 200).map(ch => (
                              <ChannelItem
                                key={ch.uid}
                                channel={ch}
                                isActive={activeChannel?.uid === ch.uid}
                                onPlay={handlePlay}
                                customLogo={customLogos[ch.name] === 'none' ? undefined : customLogos[ch.name]}
                                isAdmin={isAdmin}
                                onUpdateLogo={handleUpdateLogo}
                                isMobile={false}
                              />
                            ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {filteredChannels.length > 200 && <div className="text-center text-xs text-slate-500 p-2">Search to see more...</div>}
                </div>
              </div>
            )}

            

            {activeTab === 'lists' && (
              <div className="p-4 space-y-6">
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-3">Saved Playlists</h3>
                  {playlists.map((pl) => (
                    editingPlaylistId === pl.id ? (
                      <div key={pl.id} className="p-4 rounded-xl border glass-card border-primary/50 shadow-[0_0_15px_rgba(20,184,166,0.1)] flex flex-col gap-3">
                        <input type="text" value={editPlName} onChange={(e) => setEditPlName(e.target.value)} placeholder="Playlist Name" className="w-full glass-button border border-white/10 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-primary text-white" />
                        <input type="url" value={editPlUrl} onChange={(e) => setEditPlUrl(e.target.value)} placeholder="M3U URL" className="w-full glass-button border border-white/10 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-primary text-white" />
                        <div className="flex gap-2 justify-end mt-2">
                          <button onClick={() => setEditingPlaylistId(null)} className="px-4 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-colors">Cancel</button>
                          <button onClick={() => {
                            const updated = playlists.map(p => p.id === pl.id ? { ...p, name: editPlName, url: editPlUrl} : p);
                            setPlaylists(updated);
                            savePlaylists(updated);
                            if (isRouteAdmin && isAdmin) publishConfigToFirebase(updated);
                            setEditingPlaylistId(null);
                          }} className="px-4 py-2 rounded-lg text-xs font-bold bg-primary hover:bg-primary text-white transition-colors">Save</button>
                        </div>
                      </div>
                    ) : (
                    <div key={pl.id} className={`p-4 rounded-xl border transition-all ${pl.active ? 'glass-button border-primary/50 shadow-[0_0_15px_rgba(20,184,166,0.1)]' : 'glass-card border-white/5 hover:border-white/10'}`}>
                      <div className="font-bold text-sm mb-1 break-words">{pl.name} {pl.isDefault && <span className="text-[10px] text-primary ml-2 tracking-wide">DEFAULT</span>}</div>
                      <div className="text-xs text-slate-500 truncate mb-4">{pl.url}</div>
                      <div className="flex gap-2">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                setEditPlName(pl.name);
                                setEditPlUrl(pl.url);
                                
                                setEditingPlaylistId(pl.id);
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {!pl.isDefault && (
                              <button 
                                onClick={() => {
                                  const updated = playlists.filter(p => p.id !== pl.id);
                                  setPlaylists(updated);
                                  savePlaylists(updated);
                                  if (isRouteAdmin && isAdmin) publishConfigToFirebase(updated);
                                }}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                      </div>
                    </div>
                    )
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'dev' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 sm:p-5 flex flex-col gap-6">
                <div className="p-5 sm:p-6 bg-black/60 glass-card rounded-3xl border border-primary/20 shadow-[0_0_30px_rgba(20,184,166,0.1)] flex flex-col gap-6 relative overflow-hidden">
                  {/* Inner background glow */}
                  <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

                  {/* Profile row */}
                  <div className="flex items-center gap-4 sm:gap-5 relative z-10">
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-xl font-black shadow-[0_0_20px_rgba(20,184,166,0.4)] overflow-hidden border-2 border-primary bg-teal-900/50 shrink-0">
                      <img src={devPhoto} alt="Developer" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h2 className="font-black text-lg sm:text-xl tracking-wide text-slate-50 uppercase drop-shadow-[0_2px_10px_rgba(20,184,166,0.5)] whitespace-pre-line">{devName.replace(/\\n/g, '\n')}</h2>
                      <div className="text-[10px] sm:text-xs text-primary font-bold tracking-widest uppercase mt-1.5 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(45,212,191,1)]" /> DEVELOPER
                      </div>
                    </div>
                  </div>

                  {/* Features grid */}
                  <div className="grid grid-cols-4 gap-2 sm:gap-3 relative z-10">
                    <div className="flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-2 sm:p-3 glass-button/40 rounded-xl border border-white/10/50 hover:border-primary/30 transition-colors">
                      <Code2 className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
                      <span className="text-[9px] sm:text-[10px] font-medium text-slate-300 text-center leading-tight">Clean<br/>Code</span>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-2 sm:p-3 glass-button/40 rounded-xl border border-white/10/50 hover:border-primary/30 transition-colors">
                      <Rocket className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                      <span className="text-[9px] sm:text-[10px] font-medium text-slate-300 text-center leading-tight">Fast<br/>Performance</span>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-2 sm:p-3 glass-button/40 rounded-xl border border-white/10/50 hover:border-primary/30 transition-colors">
                      <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
                      <span className="text-[9px] sm:text-[10px] font-medium text-slate-300 text-center leading-tight">Secure</span>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-2 sm:p-3 glass-button/40 rounded-xl border border-white/10/50 hover:border-primary/30 transition-colors">
                      <Lightbulb className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
                      <span className="text-[9px] sm:text-[10px] font-medium text-slate-300 text-center leading-tight">Creative<br/>Solution</span>
                    </div>
                  </div>

                  {/* Quote */}
                  <div className="relative p-3 sm:p-4 rounded-xl border border-white/10/50 bg-gradient-to-r from-primary/10 to-transparent flex items-center justify-between overflow-hidden group">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_10px_rgba(45,212,191,0.8)]" />
                    <div className="flex gap-2 sm:gap-3 relative z-10 pl-2 max-w-[70%]">
                      <Quote className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0 opacity-80" />
                      <p className="text-xs sm:text-sm italic text-slate-200 font-serif leading-relaxed">
                        "Dream big, write code,<br/>never give up."
                      </p>
                    </div>
                    <Code className="w-12 h-12 sm:w-16 sm:h-16 text-primary/30 -rotate-12 absolute -right-2 top-1/2 -translate-y-1/2 group-hover:scale-110 transition-transform duration-500 group-hover:text-primary/40" />
                  </div>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center gap-2 mb-1 sm:mb-2 ml-1">
                    <h3 className="text-xs sm:text-sm font-bold text-primary uppercase tracking-[0.2em] drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]">CONTACT</h3>
                  </div>
                  
                  <a href={devFbUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-3 sm:p-4 bg-black/60 glass-card border border-white/10 hover:border-primary/50 hover:bg-white/10/80 rounded-2xl transition-all group shadow-lg">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#1877F2] rounded-xl flex items-center justify-center shrink-0 shadow-[0_4px_15px_rgba(24,119,242,0.4)] group-hover:scale-105 transition-transform"><span className="font-bold text-xl sm:text-2xl text-white">f</span></div>
                    <div className="flex-1">
                      <div className="font-bold text-sm sm:text-base group-hover:text-teal-300 transition-colors text-slate-100">Facebook</div>
                      <div className="text-[10px] sm:text-xs text-slate-400">{devFbHandle}</div>
                    </div>
                    <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 group-hover:text-primary" />
                  </a>
                  
                  <a href={devTgUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-3 sm:p-4 bg-black/60 glass-card border border-white/10 hover:border-primary/50 hover:bg-white/10/80 rounded-2xl transition-all group shadow-lg">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#229ED9] rounded-xl flex items-center justify-center shrink-0 shadow-[0_4px_15px_rgba(34,158,217,0.4)] group-hover:scale-105 transition-transform"><span className="font-bold italic text-lg sm:text-xl text-white">TG</span></div>
                    <div className="flex-1">
                      <div className="font-bold text-sm sm:text-base group-hover:text-teal-300 transition-colors text-slate-100">Telegram</div>
                      <div className="text-[10px] sm:text-xs text-slate-400">{devTgHandle}</div>
                    </div>
                    <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 group-hover:text-primary" />
                  </a>
                </div>
              </motion.div>
            )}

            {activeTab === 'setup' && (
              <div className="p-4 flex flex-col gap-6">
                <div className="flex items-center gap-3 mb-2 border-b border-white/5 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                    <Settings className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-bold text-white text-lg">Server Configuration</h2>
                    <p className="text-xs text-slate-400">Publish Notice, Playlists to Firebase</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {backendError && (
                    <div className="p-4 bg-gradient-to-r from-red-500/10 to-transparent border-l-4 border-red-500 text-red-400 text-sm font-medium rounded-r-xl shadow-sm flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 shrink-0" />
                      <span>{backendError}</span>
                    </div>
                  )}
                  {backendSuccess && (
                    <div className="p-4 bg-gradient-to-r from-primary/10 to-transparent border-l-4 border-primary text-primary text-sm font-medium rounded-r-xl shadow-sm flex items-center gap-3">
                      <ShieldCheck className="w-5 h-5 shrink-0" />
                      <span>{backendSuccess}</span>
                    </div>
                  )}

                  <div className="border-t border-white/5 my-4 pt-4 space-y-4">
                    <h3 className="text-xs font-bold text-primary uppercase tracking-widest">Developer Profile</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Image URL</label>
                        <input type="text" value={devConfig?.photo || ''} onChange={e => setDevConfig({...devConfig, photo: e.target.value})} placeholder="https://api.dicebear.com/..." className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-primary/50 text-slate-200" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Developer Name</label>
                        <input type="text" value={devConfig?.name || ''} onChange={e => setDevConfig({...devConfig, name: e.target.value})} placeholder="FARABI AHMED\nSHAKIL" className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-primary/50 text-slate-200" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Facebook Handle</label>
                        <input type="text" value={devConfig?.facebookHandle || ''} onChange={e => setDevConfig({...devConfig, facebookHandle: e.target.value})} placeholder="farabiahmedshakil11" className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-primary/50 text-slate-200" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Facebook URL</label>
                        <input type="text" value={devConfig?.facebookUrl || ''} onChange={e => setDevConfig({...devConfig, facebookUrl: e.target.value})} placeholder="https://www.facebook.com/..." className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-primary/50 text-slate-200" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Telegram Handle</label>
                        <input type="text" value={devConfig?.telegramHandle || ''} onChange={e => setDevConfig({...devConfig, telegramHandle: e.target.value})} placeholder="@farabiSH" className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-primary/50 text-slate-200" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 mb-1">Telegram URL</label>
                        <input type="text" value={devConfig?.telegramUrl || ''} onChange={e => setDevConfig({...devConfig, telegramUrl: e.target.value})} placeholder="https://t.me/..." className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-primary/50 text-slate-200" />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                     <button 
                       onClick={() => publishConfigToFirebase()} 
                       disabled={backendSyncing}
                       className="flex-1 py-3 bg-primary hover:bg-primary active:bg-teal-700 text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                     >
                       {backendSyncing && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                       Publish Config to Firebase
                     </button>
                  </div>
                  
                  <div className="border-t border-white/5 my-2 pt-4">
                    <div className="flex items-center justify-between mb-1.5 ml-1">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Or Paste JSON Directly</label>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            const data = {
                              app_notice: appNotice,
                              playlists: playlists.map(p => ({
                                name: p.name,
                                url: p.url,
                                type: 'live'
                              }))
                            };
                            setCustomJsonInput(JSON.stringify(data, null, 2));
                          }}
                          className="text-[10px] bg-primary hover:bg-primary text-white px-2 py-1 rounded"
                        >
                          Show Current JSON
                        </button>
                        <button 
                          onClick={() => {
                            setCustomJsonInput(`{\n  "app_notice": "Your notice...",\n  "playlists": [\n    {\n      "name": "Live TV",\n      "url": "https://.../playlist.m3u",\n      "type": "live"\n    }\n  ]\n}`);
                          }}
                          className="text-[10px] bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded"
                        >
                          Load Example
                        </button>
                      </div>
                    </div>
                    <textarea 
                      id="json-paste-area"
                      value={customJsonInput}
                      onChange={(e) => setCustomJsonInput(e.target.value)}
                      className="w-full h-40 glass-button/80 border border-white/10/50 rounded-xl py-3 px-4 focus:outline-none focus:border-primary transition-colors text-white font-mono text-[10px] sm:text-xs placeholder:text-slate-600 resize-none"
                      placeholder="Paste your JSON configuration block here..."
                    ></textarea>
                    <button 
                      onClick={async () => {
                        try {
                          const val = customJsonInput;
                          let data;
                          try {
                            data = JSON.parse(val);
                          } catch (parseErr) {
                            // Try to fix unescaped newlines in strings
                            let fixedVal = '';
                            let inString = false;
                            let escapeNext = false;
                            for (let i = 0; i < val.length; i++) {
                              const c = val[i];
                              if (escapeNext) {
                                fixedVal += c;
                                escapeNext = false;
                                continue;
                              }
                              if (c === '\\') {
                                escapeNext = true;
                                fixedVal += c;
                                continue;
                              }
                              if (c === '"') {
                                inString = !inString;
                                fixedVal += c;
                                continue;
                              }
                              if (inString && (c === '\\n' || c === '\\r')) {
                                fixedVal += (c === '\\n' ? '\\\\n' : ''); // drop CR
                                continue;
                              }
                              fixedVal += c;
                            }
                            data = JSON.parse(fixedVal);
                          }
                          
                          if (data.app_notice) {
                            setAppNotice(data.app_notice);
                            localStorage.setItem('app_notice', data.app_notice);
                          }
                          
                          
                          if (data.playlists && Array.isArray(data.playlists)) {
                            const currentPls = getPlaylists().filter(p => !p.id.startsWith('remote_'));
                            const newPls = data.playlists.map((pl: any, i: number) => ({
                              id: `remote_${Date.now()}_${i}`,
                              name: pl.name || 'Remote Playlist',
                              url: pl.url,
                              active: false,
                              type: pl.type || 'live'
                            }));
                            const newUrls = new Set(newPls.map((p: any) => p.url));
                            const currentPlsDeduped = currentPls.filter(p => !newUrls.has(p.url));
                            const combined = [...currentPlsDeduped, ...newPls];
                            savePlaylists(combined);
                            setPlaylists(getPlaylists());
                          }

                          localStorage.setItem('custom_json_config', JSON.stringify(data, null, 2));
                          localStorage.removeItem('backend_api_url');
                          
                          // Also publish to firebase!
                          try {
                             await updateConfig(data);
                          } catch(err) {
                             console.warn("Could not publish to firebase", err);
                          }
                          
                          handleFirebaseData(data);
                          setActiveTab('channels');
                          alert("Configuration applied and published successfully!");
                        } catch (e: any) {
                          alert("Invalid JSON. Please ensure it is formatted correctly. Error: " + e.message);
                        }
                      }}
                      className="w-full mt-3 py-3 bg-primary hover:bg-primary active:bg-teal-700 text-white font-bold rounded-xl shadow-lg transition-all"
                    >
                      Apply Pasted JSON
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-transparent overflow-hidden relative z-10">
          <div className="w-full shrink-0 aspect-video md:aspect-auto md:flex-1 relative shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-20">
            <div className="absolute inset-0">
              <Player channel={activeChannel} isDevToolsOpen={isDevToolsOpen} />
            </div>
          </div>
          
          {/* Mobile panel takes up the rest of the height on phones */}
          <div className="md:hidden flex-1 flex flex-col bg-black/80 backdrop-blur-xl border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] min-h-0 z-30">
              <div className="flex p-1.5 gap-1 bg-transparent border-b border-white/5 shadow-sm shrink-0 overflow-x-auto no-scrollbar">
                <button onClick={() => setActiveTab('channels')} className={`flex-1 min-w-[70px] flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-bold tracking-wide uppercase transition-all duration-300 ${activeTab === 'channels' ? 'bg-primary/10 text-primary shadow-[0_0_15px_rgba(20,184,166,0.1)] scale-105' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                   <MonitorPlay className="w-4 h-4 mb-0.5" />
                   TV
                </button>
                
                <button onClick={() => setActiveTab('dev')} className={`flex-1 min-w-[60px] flex flex-col items-center gap-1 py-1 rounded-xl text-[10px] font-bold tracking-wide uppercase transition-all duration-300 ${activeTab === 'dev' ? 'bg-primary/10 text-primary shadow-[0_0_15px_rgba(20,184,166,0.1)] scale-105' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                   <Code className="w-4 h-4 mb-0.5" />
                   Dev
                </button>
                {isRouteAdmin && isAdmin && (
                  <>
                    <button onClick={() => setActiveTab('lists')} className={`flex-1 min-w-[60px] flex flex-col items-center gap-1 py-1 rounded-xl text-[10px] font-bold tracking-wide uppercase transition-all duration-300 ${activeTab === 'lists' ? 'bg-primary/10 text-primary shadow-[0_0_15px_rgba(20,184,166,0.1)] scale-105' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                       <ListVideo className="w-4 h-4 mb-0.5" />
                       Lists
                    </button>
                    <button onClick={() => setActiveTab('setup')} className={`flex-1 min-w-[60px] flex flex-col items-center gap-1 py-1 rounded-xl text-[10px] font-bold tracking-wide uppercase transition-all duration-300 ${activeTab === 'setup' ? 'bg-primary/10 text-primary shadow-[0_0_15px_rgba(20,184,166,0.1)] scale-105' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                       <Settings className="w-4 h-4 mb-0.5" />
                       Setup
                    </button>
                  </>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
                  {/* Mobile Mobile Channels */}
                  {activeTab === 'channels' && (
                    <div className="flex flex-col h-full">
                      {playlists.length > 1 && (
                        <div className="p-2.5 shrink-0 pb-0">
                          <div className="relative group shadow-sm">
                    <select
                      value={activeLivePlaylist?.id || ''}
                      onChange={(e) => {
                        const updated = playlists.map(p => ({ ...p, active: p.id === e.target.value }));
                        setPlaylists(updated);
                        savePlaylists(updated);
                      }}
                      className="w-full bg-[#1a1a1a] hover:bg-[#252525] border border-white/10 group-hover:border-white/20 rounded-xl py-2 pl-3 pr-8 text-sm font-semibold focus:outline-none focus:border-primary/50 appearance-none cursor-pointer text-slate-200 transition-all"
                    >
                      {playlists.map(p => <option className="glass-card text-slate-200" key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/70 pointer-events-none group-hover:text-primary transition-colors" />
                  </div>
                        </div>
                      )}
                      <div className="p-2.5 shrink-0 flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                          <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:border-primary/50" />
                        </div>
                        <div className="relative w-1/3 group shrink-0 shadow-sm">
                          <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="w-full bg-[#1a1a1a] hover:bg-[#252525] border border-white/10 group-hover:border-white/20 rounded-lg py-1.5 pl-3 pr-7 text-xs font-semibold focus:outline-none focus:border-primary/50 appearance-none transition-all text-slate-300">
                            <option className="glass-card text-slate-200" value="">All Groups</option>
                            {groups.map(g => <option className="glass-card text-slate-200" key={g} value={g}>{g}</option>)}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary/70 pointer-events-none group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto px-2 pb-6 space-y-1">
                        <AnimatePresence mode="wait">
                          {loading ? (
                             <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-8 text-center text-sm text-slate-500 flex flex-col items-center justify-center gap-4">
                                <div className="relative flex items-center justify-center">
                                  <div className="absolute inset-0 border-[2px] border-white/5 rounded-full w-8 h-8 blur-[1px]"></div>
                                  <div className="animate-spin w-8 h-8 border-[2px] border-primary border-t-transparent border-l-transparent rounded-full shadow-[0_0_10px_rgba(20,184,166,0.3)]" />
                                </div>
                                <span className="text-[10px] tracking-widest uppercase font-semibold text-primary animate-pulse">Loading</span>
                             </motion.div>
                          ) : filteredChannels.length === 0 ? (
                             <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-8 text-center text-sm text-slate-500">No channels found</motion.div>
                          ) : (
                            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                              {filteredChannels.slice(0, 200).map(ch => (
                              <ChannelItem
                                key={ch.uid}
                                channel={ch}
                                isActive={activeChannel?.uid === ch.uid}
                                onPlay={handlePlay}
                                customLogo={customLogos[ch.name] === 'none' ? undefined : customLogos[ch.name]}
                                isAdmin={isAdmin}
                                onUpdateLogo={handleUpdateLogo}
                                isMobile={true}
                              />
                            ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                        {filteredChannels.length > 200 && <div className="text-center text-xs text-slate-500 p-2">Search to see more...</div>}
                      </div>
                    </div>
                  )}

                  

                  {/* Mobile Lists... */}
                  {activeTab === 'lists' && (
                     <div className="p-4 space-y-6 overflow-y-auto">
                       <div className="space-y-3">
                         <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2">Saved Playlists</h3>
                         {playlists.map((pl) => (
                            editingPlaylistId === pl.id ? (
                              <div key={pl.id} className="p-4 rounded-xl border glass-card border-primary/50 shadow-[0_0_15px_rgba(20,184,166,0.1)] flex flex-col gap-3">
                                <input type="text" value={editPlName} onChange={(e) => setEditPlName(e.target.value)} placeholder="Playlist Name" className="w-full glass-button border border-white/10 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-primary text-white" />
                                <input type="url" value={editPlUrl} onChange={(e) => setEditPlUrl(e.target.value)} placeholder="M3U URL" className="w-full glass-button border border-white/10 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-primary text-white" />
                                <div className="relative group">
                                  <button onClick={() => setEditingPlaylistId(null)} className="px-4 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-colors">Cancel</button>
                                  <button onClick={() => {
                                    const updated = playlists.map(p => p.id === pl.id ? { ...p, name: editPlName, url: editPlUrl} : p);
                                    setPlaylists(updated);
                                    savePlaylists(updated);
                                    if (isRouteAdmin && isAdmin) publishConfigToFirebase(updated);
                                    setEditingPlaylistId(null);
                                  }} className="px-4 py-2 rounded-lg text-xs font-bold bg-primary hover:bg-primary text-white transition-colors">Save</button>
                                </div>
                              </div>
                            ) : (
                            <div key={pl.id} className={`p-4 rounded-xl border transition-all ${pl.active ? 'glass-button border-primary/50 shadow-[0_0_15px_rgba(20,184,166,0.1)]' : 'glass-card border-white/5'}`}>
                             <div className="font-bold text-sm mb-1 break-words">{pl.name} {pl.isDefault && <span className="text-[10px] text-primary ml-2 tracking-wide">DEFAULT</span>}</div>
                             <div className="text-xs text-slate-500 truncate mb-4">{pl.url}</div>
                             <div className="flex gap-2">
                               {(!pl.isDefault) && (
                                 <div className="flex gap-2">
                                   <button 
                                     onClick={() => {
                                       setEditPlName(pl.name);
                                       setEditPlUrl(pl.url);
                                       
                                       setEditingPlaylistId(pl.id);
                                     }}
                                     className="px-4 py-2 rounded-lg text-xs font-bold border border-primary/30 text-primary bg-primary/10 hover:bg-primary/20 transition-colors flex items-center justify-center shrink-0"
                                   >
                                     <Edit className="w-4 h-4" />
                                   </button>
                                   <button 
                                     onClick={() => {
                                       const updated = playlists.filter(p => p.id !== pl.id);
                                       setPlaylists(updated);
                                       savePlaylists(updated);
                                        if (isRouteAdmin && isAdmin) publishConfigToFirebase(updated);
                                      }}
                                      className="px-4 py-2 rounded-lg text-xs font-bold border border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors flex items-center justify-center shrink-0"
                                   >
                                     <Trash2 className="w-4 h-4" />
                                   </button>
                                 </div>
                               )}
                             </div>
                           </div>
                            )
                         ))}
                       </div>
                     </div>
                  )}
                  
                  {activeTab === 'dev' && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 sm:p-5 flex flex-col gap-6">
                      <div className="p-5 sm:p-6 bg-black/60 glass-card rounded-3xl border border-primary/20 shadow-[0_0_30px_rgba(20,184,166,0.1)] flex flex-col gap-6 relative overflow-hidden">
                        {/* Inner background glow */}
                        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

                        {/* Profile row */}
                        <div className="flex items-center gap-4 sm:gap-5 relative z-10">
                          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-xl font-black shadow-[0_0_20px_rgba(20,184,166,0.4)] overflow-hidden border-2 border-primary bg-teal-900/50 shrink-0">
                            <img src={devPhoto} alt="Developer" className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <h2 className="font-black text-lg sm:text-xl tracking-wide text-slate-50 uppercase drop-shadow-[0_2px_10px_rgba(20,184,166,0.5)] whitespace-pre-line">{devName.replace(/\\n/g, '\n')}</h2>
                            <div className="text-[10px] sm:text-xs text-primary font-bold tracking-widest uppercase mt-1.5 flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(45,212,191,1)]" /> DEVELOPER
                            </div>
                          </div>
                        </div>

                        {/* Features grid */}
                        <div className="grid grid-cols-4 gap-2 sm:gap-3 relative z-10">
                          <div className="flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-2 sm:p-3 glass-button/40 rounded-xl border border-white/10/50 hover:border-primary/30 transition-colors">
                            <Code2 className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
                            <span className="text-[9px] sm:text-[10px] font-medium text-slate-300 text-center leading-tight">Clean<br/>Code</span>
                          </div>
                          <div className="flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-2 sm:p-3 glass-button/40 rounded-xl border border-white/10/50 hover:border-primary/30 transition-colors">
                            <Rocket className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                            <span className="text-[9px] sm:text-[10px] font-medium text-slate-300 text-center leading-tight">Fast<br/>Performance</span>
                          </div>
                          <div className="flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-2 sm:p-3 glass-button/40 rounded-xl border border-white/10/50 hover:border-primary/30 transition-colors">
                            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
                            <span className="text-[9px] sm:text-[10px] font-medium text-slate-300 text-center leading-tight">Secure</span>
                          </div>
                          <div className="flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-2 sm:p-3 glass-button/40 rounded-xl border border-white/10/50 hover:border-primary/30 transition-colors">
                            <Lightbulb className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
                            <span className="text-[9px] sm:text-[10px] font-medium text-slate-300 text-center leading-tight">Creative<br/>Solution</span>
                          </div>
                        </div>

                        {/* Quote */}
                        <div className="relative p-3 sm:p-4 rounded-xl border border-white/10/50 bg-gradient-to-r from-primary/10 to-transparent flex items-center justify-between overflow-hidden group">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_10px_rgba(45,212,191,0.8)]" />
                          <div className="flex gap-2 sm:gap-3 relative z-10 pl-2 max-w-[70%]">
                            <Quote className="w-4 h-4 sm:w-5 sm:h-5 text-primary shrink-0 opacity-80" />
                            <p className="text-xs sm:text-sm italic text-slate-200 font-serif leading-relaxed">
                              "Dream big, write code,<br/>never give up."
                            </p>
                          </div>
                          <Code className="w-12 h-12 sm:w-16 sm:h-16 text-primary/30 -rotate-12 absolute -right-2 top-1/2 -translate-y-1/2 group-hover:scale-110 transition-transform duration-500 group-hover:text-primary/40" />
                        </div>
                      </div>

                      <div className="space-y-3 sm:space-y-4">
                        <div className="flex items-center gap-2 mb-1 sm:mb-2 ml-1">
                          <h3 className="text-xs sm:text-sm font-bold text-primary uppercase tracking-[0.2em] drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]">CONTACT</h3>
                        </div>
                        
                        <a href={devFbUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-3 sm:p-4 bg-black/60 glass-card border border-white/10 hover:border-primary/50 hover:bg-white/10/80 rounded-2xl transition-all group shadow-lg">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#1877F2] rounded-xl flex items-center justify-center shrink-0 shadow-[0_4px_15px_rgba(24,119,242,0.4)] group-hover:scale-105 transition-transform"><span className="font-bold text-xl sm:text-2xl text-white">f</span></div>
                          <div className="flex-1">
                            <div className="font-bold text-sm sm:text-base group-hover:text-teal-300 transition-colors text-slate-100">Facebook</div>
                            <div className="text-[10px] sm:text-xs text-slate-400">{devFbHandle}</div>
                          </div>
                          <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 group-hover:text-primary" />
                        </a>
                        
                        <a href={devTgUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-3 sm:p-4 bg-black/60 glass-card border border-white/10 hover:border-primary/50 hover:bg-white/10/80 rounded-2xl transition-all group shadow-lg">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#229ED9] rounded-xl flex items-center justify-center shrink-0 shadow-[0_4px_15px_rgba(34,158,217,0.4)] group-hover:scale-105 transition-transform"><span className="font-bold italic text-lg sm:text-xl text-white">TG</span></div>
                          <div className="flex-1">
                            <div className="font-bold text-sm sm:text-base group-hover:text-teal-300 transition-colors text-slate-100">Telegram</div>
                            <div className="text-[10px] sm:text-xs text-slate-400">{devTgHandle}</div>
                          </div>
                          <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 group-hover:text-primary" />
                        </a>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'setup' && (
                    <div className="p-4 flex flex-col gap-6">
                      <div className="flex items-center gap-3 mb-2 border-b border-white/5 pb-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                          <Settings className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h2 className="font-bold text-white text-lg">Server Configuration</h2>
                          <p className="text-xs text-slate-400">Publish Notice, Playlists to Firebase</p>
                        </div>
                      </div>
                      
                      <div className="space-y-4">

                        {backendError && (
                          <div className="p-4 bg-gradient-to-r from-red-500/10 to-transparent border-l-4 border-red-500 text-red-400 text-sm font-medium rounded-r-xl shadow-sm flex items-center gap-3">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <span>{backendError}</span>
                          </div>
                        )}
                        {backendSuccess && (
                          <div className="p-4 bg-gradient-to-r from-primary/10 to-transparent border-l-4 border-primary text-primary text-sm font-medium rounded-r-xl shadow-sm flex items-center gap-3">
                            <ShieldCheck className="w-5 h-5 shrink-0" />
                            <span>{backendSuccess}</span>
                          </div>
                        )}

                        <div className="border-t border-white/5 my-4 pt-4 space-y-4">
                          <h3 className="text-xs font-bold text-primary uppercase tracking-widest">Developer Profile</h3>
                          <div className="space-y-4">
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1">Image URL</label>
                              <input type="text" value={devConfig?.photo || ''} onChange={e => setDevConfig({...devConfig, photo: e.target.value})} placeholder="https://api.dicebear.com/..." className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-primary/50 text-slate-200" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1">Developer Name</label>
                              <input type="text" value={devConfig?.name || ''} onChange={e => setDevConfig({...devConfig, name: e.target.value})} placeholder="FARABI AHMED\nSHAKIL" className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-primary/50 text-slate-200" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1">Facebook Handle</label>
                              <input type="text" value={devConfig?.facebookHandle || ''} onChange={e => setDevConfig({...devConfig, facebookHandle: e.target.value})} placeholder="farabiahmedshakil11" className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-primary/50 text-slate-200" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1">Facebook URL</label>
                              <input type="text" value={devConfig?.facebookUrl || ''} onChange={e => setDevConfig({...devConfig, facebookUrl: e.target.value})} placeholder="https://www.facebook.com/..." className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-primary/50 text-slate-200" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1">Telegram Handle</label>
                              <input type="text" value={devConfig?.telegramHandle || ''} onChange={e => setDevConfig({...devConfig, telegramHandle: e.target.value})} placeholder="@farabiSH" className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-primary/50 text-slate-200" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-slate-400 mb-1">Telegram URL</label>
                              <input type="text" value={devConfig?.telegramUrl || ''} onChange={e => setDevConfig({...devConfig, telegramUrl: e.target.value})} placeholder="https://t.me/..." className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-xs focus:outline-none focus:border-primary/50 text-slate-200" />
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3 pt-2">
                           <button 
                             onClick={() => publishConfigToFirebase()} 
                             disabled={backendSyncing}
                             className="w-full py-3 bg-primary hover:bg-primary active:bg-teal-700 text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                           >
                             {backendSyncing && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                             Publish Config to Firebase
                           </button>
                        </div>
                        
                        <div className="border-t border-white/5 my-2 pt-4">
                          <div className="flex items-center justify-between mb-1.5 ml-1">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Or Paste JSON Directly</label>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => {
                                  const data = {
                                    app_notice: appNotice,
                                    devConfig: devConfig,
                                    playlists: playlists.map(p => ({
                                      name: p.name,
                                      url: p.url,
                                      type: 'live'
                                    }))
                                  };
                                  setCustomJsonInput(JSON.stringify(data, null, 2));
                                }}
                                className="text-[10px] bg-primary hover:bg-primary text-white px-2 py-1 rounded"
                              >
                                Show Current JSON
                              </button>
                              <button 
                                onClick={() => {
                                  setCustomJsonInput(`{\n  "app_notice": "Your notice...",\n  "playlists": [\n    {\n      "name": "Live TV",\n      "url": "https://.../playlist.m3u",\n      "type": "live"\n    }\n  ]\n}`);
                                }}
                                className="text-[10px] bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded"
                              >
                                Load Example
                              </button>
                            </div>
                          </div>
                          <textarea 
                            id="mobile-json-paste-area"
                            value={customJsonInput}
                            onChange={(e) => setCustomJsonInput(e.target.value)}
                            className="w-full h-40 glass-button/80 border border-white/10/50 rounded-xl py-3 px-4 focus:outline-none focus:border-primary transition-colors text-white font-mono text-[10px] sm:text-xs placeholder:text-slate-600 resize-none"
                            placeholder="Paste your JSON configuration block here..."
                          ></textarea>
                          <button 
                            onClick={() => {
                              try {
                                const val = customJsonInput;
                                let data;
                                try {
                                  data = JSON.parse(val);
                                } catch (parseErr) {
                                  // Try to fix unescaped newlines in strings
                                  let fixedVal = '';
                                  let inString = false;
                                  let escapeNext = false;
                                  for (let i = 0; i < val.length; i++) {
                                    const c = val[i];
                                    if (escapeNext) {
                                      fixedVal += c;
                                      escapeNext = false;
                                      continue;
                                    }
                                    if (c === '\\') {
                                      escapeNext = true;
                                      fixedVal += c;
                                      continue;
                                    }
                                    if (c === '"') {
                                      inString = !inString;
                                      fixedVal += c;
                                      continue;
                                    }
                                    if (inString && (c === '\n' || c === '\r')) {
                                      fixedVal += (c === '\n' ? '\\n' : ''); // drop CR
                                      continue;
                                    }
                                    fixedVal += c;
                                  }
                                  data = JSON.parse(fixedVal);
                                }
                                
                                if (data.app_notice) {
                                  setAppNotice(data.app_notice);
                                  localStorage.setItem('app_notice', data.app_notice);
                                }
                                
                                
                                if (data.playlists && Array.isArray(data.playlists)) {
                                  const currentPls = getPlaylists().filter(p => !p.id.startsWith('remote_'));
                                  const newPls = data.playlists.map((pl: any, i: number) => ({
                                    id: `remote_${Date.now()}_${i}`,
                                    name: pl.name || 'Remote Playlist',
                                    url: pl.url,
                                    active: false,
                                    type: pl.type || 'live'
                                  }));
                                  const newUrls = new Set(newPls.map((p: any) => p.url));
                                  const currentPlsDeduped = currentPls.filter(p => !newUrls.has(p.url));
                                  const combined = [...currentPlsDeduped, ...newPls];
                                  savePlaylists(combined);
                                  setPlaylists(getPlaylists());
                                }

                                localStorage.setItem('custom_json_config', JSON.stringify(data, null, 2));
                                localStorage.removeItem('backend_api_url');
                                
                                handleFirebaseData(data);
                                setActiveTab('channels');
                                alert("Configuration applied successfully!");
                              } catch (e: any) {
                                alert("Invalid JSON. Please ensure it is formatted correctly. Error: " + e.message);
                              }
                            }}
                            className="w-full mt-3 py-3 bg-primary hover:bg-primary active:bg-teal-700 text-white font-bold rounded-xl shadow-lg transition-all"
                          >
                            Apply Pasted JSON
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            </div>

          </div>


      </main>

          {/* Add Playlist Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="glass-card border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl relative">
            <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-black mb-6">Add New Playlist</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Name (optional)</label>
                <input type="text" value={newPlName} onChange={(e) => setNewPlName(e.target.value)} placeholder="My IPTV List" className="w-full glass-button border border-white/10 rounded-xl py-2.5 px-4 focus:outline-none focus:border-primary transition-colors text-white" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">M3U/M3U8 URL</label>
                <input type="url" value={newPlUrl} onChange={(e) => setNewPlUrl(e.target.value)} placeholder="https://..." className="w-full glass-button border border-white/10 rounded-xl py-2.5 px-4 focus:outline-none focus:border-primary transition-colors text-white" />
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button onClick={() => setShowAddModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-colors">Cancel</button>
                <button onClick={addPlaylist} disabled={!newPlUrl} className="px-5 py-2.5 rounded-xl font-bold bg-primary hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-lg shadow-primary/20 transition-all">Add Playlist</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Direct Play Modal */}
      {showDirectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="glass-card border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl relative">
            <button onClick={() => setShowDirectModal(false)} className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20">
                <PlayCircle className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Direct Video Link</h2>
                <p className="text-xs font-semibold text-slate-400 tracking-wide uppercase mt-0.5">Play Any Stream Instantly</p>
              </div>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              setShowDirectModal(false);
              playDirectLink();
            }} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Stream URL</label>
                <input type="url" value={directUrl} onChange={(e) => setDirectUrl(e.target.value)} placeholder="https://... or ftp://..." required className="w-full glass-button/80 border border-white/10/50 rounded-xl py-3 px-4 focus:outline-none focus:border-amber-500 transition-colors text-white font-mono text-sm placeholder:text-slate-600" />
              </div>
              <div className="pt-4 flex justify-end gap-3 items-center">
                <button type="button" onClick={() => setShowDirectModal(false)} className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-colors">Cancel</button>
                <button type="submit" disabled={!directUrl} className="px-8 py-3 rounded-xl font-bold bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-[0_0_20px_rgba(217,119,6,0.3)] transition-all flex border-amber-500/20 items-center justify-center gap-2">
                  <PlayCircle className="w-5 h-5" /> Play Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


