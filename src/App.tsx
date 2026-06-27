import React, { useState, useEffect, useMemo } from 'react';
import Player from './components/Player';
import { Channel, Playlist } from './types';
import { getPlaylists, savePlaylists } from './lib/storage';
import { parseM3U } from './lib/m3u';
import { XtreamApi, XtreamVod, XtreamSeries } from './lib/xtream';
import { subscribeToConfig, updateConfig } from './lib/firebase';
import { 
  Tv, Code, ListVideo, Search, Plus, PlayCircle, RefreshCw, 
  Trash2, X, MonitorPlay, ExternalLink, Activity, Film, Clapperboard, FolderOpen, Settings, Edit, ChevronDown, Rocket, ShieldCheck, Lightbulb, Quote, Code2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const APP_NOTICE = "Welcome to STREAM TV PRO. Enjoy the best premium broadcast experience. High-definition sports channels and premium content updated daily. ⚡";

export default function App() {
  const isRouteAdmin = window.location.pathname.includes('/admin') || window.location.search.includes('admin=true') || window.location.hash.includes('admin');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoginInput, setAdminLoginInput] = useState('');

  const [playlists, setPlaylists] = useState<Playlist[]>(() => getPlaylists());
  const [channels, setChannels] = useState<Channel[]>([]);
  const [m3uVodChannels, setM3uVodChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('');
  const [activeTab, setActiveTab] = useState<'channels' | 'vod' | 'lists' | 'dev' | 'setup'>('channels');
  const [vodType, setVodType] = useState<'movies' | 'series'>('movies');
  const [loading, setLoading] = useState(true);
  const [loadingVod, setLoadingVodM3u] = useState(false);
  const [error, setError] = useState('');
  const [vodError, setVodError] = useState('');

  // UI State
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const [showNotice, setShowNotice] = useState(true);
  const [appNotice, setAppNotice] = useState(() => localStorage.getItem('app_notice') || APP_NOTICE);
  
  // Backend Sync
  const [backendSyncing, setBackendSyncing] = useState(false);
  const [backendError, setBackendError] = useState('');
  const [backendSuccess, setBackendSuccess] = useState('');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDirectModal, setShowDirectModal] = useState(false);
  const [showXtreamModal, setShowXtreamModal] = useState(false);
  const [newPlName, setNewPlName] = useState('');
  const [newPlUrl, setNewPlUrl] = useState('');
  const [newPlType, setNewPlType] = useState<'live' | 'vod'>('live');
  
  // Edit Playlist Modal/Inline State
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);
  const [editPlName, setEditPlName] = useState('');
  const [editPlUrl, setEditPlUrl] = useState('');
  const [editPlType, setEditPlType] = useState<'live' | 'vod'>('live');
  
  // Xtream Config & Data
  const [xtreamUrl, setXtreamUrl] = useState(() => localStorage.getItem('xtream_url') || '');
  const [xtreamUser, setXtreamUser] = useState(() => localStorage.getItem('xtream_user') || '');
  const [xtreamPass, setXtreamPass] = useState(() => localStorage.getItem('xtream_pass') || '');
  const [xtreamConfigured, setXtreamConfigured] = useState(() => !!localStorage.getItem('xtream_url'));
  
  const [movies, setMovies] = useState<XtreamVod[]>([]);
  const [seriesList, setSeriesList] = useState<XtreamSeries[]>([]);
  const [vodCategories, setVodCategories] = useState<{category_id: string, category_name: string}[]>([]);
  const [seriesCategories, setSeriesCategories] = useState<{category_id: string, category_name: string}[]>([]);
  const [vodCategoryFilter, setVodCategoryFilter] = useState('');
  const [isLoadingVod, setIsLoadingVod] = useState(false);
  const [xtreamError, setXtreamError] = useState('');
  
  const [customJsonInput, setCustomJsonInput] = useState(() => localStorage.getItem('custom_json_config') || '');

  // Direct Link
  const [directName, setDirectName] = useState('');
  const [directUrl, setDirectUrl] = useState('');

  const activeLivePlaylist = useMemo(() => playlists.find(p => p.active && p.type !== 'vod') || playlists.find(p => p.type !== 'vod'), [playlists]);
  const activeVodPlaylist = useMemo(() => {
    const active = playlists.find(p => p.active && p.type === 'vod');
    if (active) return active;
    if (!xtreamConfigured) return playlists.find(p => p.type === 'vod');
    return undefined;
  }, [playlists, xtreamConfigured]);
  const activePlaylist = activeTab === 'vod' ? activeVodPlaylist : activeLivePlaylist;

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

  useEffect(() => {
    if (activeVodPlaylist) {
      loadPlaylist(activeVodPlaylist, setM3uVodChannels, setLoadingVodM3u, setVodError);
    }
  }, [activeVodPlaylist?.url]);

  const loadPlaylist = async (pl: Playlist, setChs: any, setLdg: any, setErr: any) => {
    setLdg(true);
    setErr('');
    setChs([]);
    setActiveChannel(null);
    try {
      const fetchOpts = { cache: 'no-store' as RequestCache };
      let resp;
      try {
        resp = await fetch(pl.url, fetchOpts);
        if (!resp.ok) throw new Error('Not ok');
      } catch (e) {
        resp = await fetch(`/api/proxy?url=${encodeURIComponent(pl.url)}`, fetchOpts);
        if (!resp.ok) throw new Error('Network error');
      }
      const text = await resp.text();
      const chs = parseM3U(text);
      if (chs.length === 0) throw new Error('No channels found');
      setChs(chs);
    } catch (err: any) {
      setErr(err.message || 'Failed to load playlist');
    } finally {
      setLdg(false);
    }
  };

  const displayChannels = activeTab === 'vod' ? m3uVodChannels : channels;

  const filteredChannels = useMemo(() => {
    return displayChannels.filter(c => {
      const matchQ = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.group.toLowerCase().includes(search.toLowerCase());
      const matchG = !groupFilter || c.group === groupFilter;
      return matchQ && matchG;
    });
  }, [displayChannels, search, groupFilter]);

  const filteredMovies = useMemo(() => {
    return movies.filter(m => {
      const matchQ = (m.name || '').toLowerCase().includes(search.toLowerCase());
      const matchC = !vodCategoryFilter || m.category_id === vodCategoryFilter;
      return matchQ && matchC;
    });
  }, [movies, search, vodCategoryFilter]);

  const filteredSeries = useMemo(() => {
    return seriesList.filter(s => {
      const matchQ = (s.name || '').toLowerCase().includes(search.toLowerCase());
      const matchC = !vodCategoryFilter || s.category_id === vodCategoryFilter;
      return matchQ && matchC;
    });
  }, [seriesList, search, vodCategoryFilter]);

  const groups = useMemo(() => {
    return Array.from(new Set(displayChannels.map(c => c.group))).sort();
  }, [displayChannels]);

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
    const newPl: Playlist = { id: `custom_${Date.now()}`, name, url: newPlUrl.trim(), active: true, type: newPlType };
    const updated = playlists.map(p => ({ ...p, active: p.type === newPlType ? false : p.active }));
    updated.push(newPl);
    setPlaylists(updated);
    savePlaylists(updated);
    publishConfigToFirebase(updated);
    setShowAddModal(false);
    setNewPlName('');
    setNewPlUrl('');
    setNewPlType('live');
    setActiveTab(newPlType === 'vod' ? 'vod' : 'channels');
  };

  const handleFirebaseData = (data: any) => {
    if (data.app_notice) {
      setAppNotice(data.app_notice);
      localStorage.setItem('app_notice', data.app_notice);
    }
    
    if (data.xtream) {
      setXtreamUrl(data.xtream.url || '');
      setXtreamUser(data.xtream.username || '');
      setXtreamPass(data.xtream.password || '');
      setXtreamConfigured(true);
      localStorage.setItem('xtream_url', data.xtream.url || '');
      localStorage.setItem('xtream_user', data.xtream.username || '');
      localStorage.setItem('xtream_pass', data.xtream.password || '');
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
        const live = combined.find(p => p.type === 'live' || p.type !== 'vod');
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
        xtream: {
          url: xtreamUrl || '',
          username: xtreamUser || '',
          password: xtreamPass || ''
        },
        playlists: plsToPublish.map(p => ({
          name: p.name || '',
          url: p.url || '',
          type: p.type || 'live'
        }))
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
  }, [activeTab, vodType]);

  useEffect(() => {
    if (xtreamConfigured && xtreamUrl && xtreamUser && xtreamPass && activeTab === 'vod') {
      if (vodType === 'movies' && movies.length > 0) return;
      if (vodType === 'series' && seriesList.length > 0) return;
      handleFetchXtreamData();
    }
  }, [xtreamConfigured, activeTab, vodType]);

  const handleFetchXtreamData = async () => {
    setIsLoadingVod(true);
    setXtreamError('');
    try {
      const api = new XtreamApi(xtreamUrl, xtreamUser, xtreamPass);
      if (vodType === 'movies' && movies.length === 0) {
        try {
           const cats = await api.getVodCategories();
           setVodCategories(cats);
        } catch(e) {}
        const allMovies = await api.getVodStreams();
        setMovies(allMovies); 
      }
      if (vodType === 'series' && seriesList.length === 0) {
        try {
           const cats = await api.getSeriesCategories();
           setSeriesCategories(cats);
        } catch(e) {}
        const allSeries = await api.getSeries();
        setSeriesList(allSeries);
      }
    } catch (e: any) {
      setXtreamError(e.message || 'Failed to fetch Xtream data.');
    } finally {
      setIsLoadingVod(false);
    }
  };

  const saveXtreamConfig = () => {
    if (xtreamUrl.toLowerCase().includes('.m3u')) {
      alert("It looks like you entered an M3U playlist URL into the Xtream Codes config. Xtream API URLs do not end in .m3u.\n\nPlease add M3U VODs in the Playlists tab instead.");
      return;
    }
    localStorage.setItem('xtream_url', xtreamUrl);
    localStorage.setItem('xtream_user', xtreamUser);
    localStorage.setItem('xtream_pass', xtreamPass);
    setXtreamConfigured(true);
    setShowXtreamModal(false);
    publishConfigToFirebase();
    setMovies([]);
    setSeriesList([]);
    if (activeTab === 'vod') {
        handleFetchXtreamData();
    }
  };

  const clearXtreamConfig = async () => {
    localStorage.removeItem('xtream_url');
    localStorage.removeItem('xtream_user');
    localStorage.removeItem('xtream_pass');
    setXtreamUrl('');
    setXtreamUser('');
    setXtreamPass('');
    setXtreamConfigured(false);
    setMovies([]);
    setSeriesList([]);
    try {
      const data = JSON.parse(JSON.stringify({
        app_notice: appNotice || '',
        xtream: {
          url: '',
          username: '',
          password: ''
        },
        playlists: playlists.map(p => ({
          name: p.name || '',
          url: p.url || '',
          type: p.type || 'live'
        }))
      }));
      await updateConfig(data);
      localStorage.setItem('custom_json_config', JSON.stringify(data, null, 2));
      setCustomJsonInput(JSON.stringify(data, null, 2));
    } catch(err) {}
  };

  const playMovie = (movie: XtreamVod) => {
    const api = new XtreamApi(xtreamUrl, xtreamUser, xtreamPass);
    const url = api.getVodStreamUrl(movie.stream_id, movie.container_extension || 'mp4');
    handlePlay({ uid: `movie_${movie.stream_id}`, name: movie.name, group: 'Movies', url, logo: movie.stream_icon });
  };

  const playSeries = (series: XtreamSeries) => {
    setIsLoadingVod(true);
    setXtreamError('');
    const api = new XtreamApi(xtreamUrl, xtreamUser, xtreamPass);
    api.getSeriesInfo(series.series_id).then(info => {
       setIsLoadingVod(false);
       const episodes = info.episodes;
       if (!episodes) throw new Error("No episodes data");
       const firstSeason = Object.keys(episodes)[0];
       if (!firstSeason || !episodes[firstSeason] || !episodes[firstSeason][0]) throw new Error("No episodes found");
       const firstEp = episodes[firstSeason][0];
       
       const url = api.getSeriesStreamUrl(firstEp.id, firstEp.container_extension || 'mp4');
       handlePlay({ uid: `ep_${firstEp.id}`, name: `${series.name} - S${firstSeason} E${firstEp.episode_num}`, group: 'Series', url, logo: series.cover });
    }).catch(e => {
       setIsLoadingVod(false);
       setXtreamError('Could not load episode: ' + e.message);
    });
  }

  const renderVodTab = () => {
    const vodPlaylists = playlists.filter(p => p.type === 'vod');
    const hasMultipleSources = vodPlaylists.length > 0 && xtreamConfigured;
    
    const sourceSelector = (hasMultipleSources || vodPlaylists.length > 1) ? (
      <div className="p-3 shrink-0 flex flex-col gap-2">
        <div className="relative group shadow-sm">
          <select
            value={activeVodPlaylist?.id || 'xtream'}
            onChange={(e) => {
              const val = e.target.value;
              const updated = playlists.map(p => ({ ...p, active: p.type === 'vod' ? p.id === val : p.active }));
              setPlaylists(updated);
              savePlaylists(updated);
            }}
            className="w-full bg-[#1a1a1a] hover:bg-[#252525] border border-white/10 group-hover:border-white/20 rounded-xl py-2 pl-3 pr-8 text-sm font-semibold focus:outline-none focus:border-teal-500/50 appearance-none cursor-pointer text-slate-200 transition-all"
          >
            {xtreamConfigured && <option className="bg-slate-900 text-slate-200" value="xtream">Xtream API (Movies & Series)</option>}
            {vodPlaylists.map(p => <option className="bg-slate-900 text-slate-200" key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-500/70 pointer-events-none group-hover:text-teal-400 transition-colors" />
        </div>
      </div>
    ) : null;

    if (activePlaylist?.type === 'vod') {
      return (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {sourceSelector}
          <div className="md:hidden p-2.5 shrink-0 bg-[#0a0a0a]">
              <div className="relative w-full">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input type="text" placeholder="Search VOD..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:border-teal-500/50" />
              </div>
          </div>
          <AnimatePresence mode="wait">
            {loadingVod ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 h-full">
                <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mb-4" />
                <p className="text-sm">Loading M3U VOD Library...</p>
              </motion.div>
            ) : (
              <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-max h-full">
                 {filteredChannels.slice(0, 150).map(movie => (
                    <button key={movie.uid} onClick={() => handlePlay(movie)} className="flex flex-col items-start gap-2 group text-left">
                       <div className="w-full aspect-[2/3] bg-slate-900 rounded-xl overflow-hidden border border-slate-800 relative group-hover:border-teal-500/50 transition-colors shadow-sm shrink-0 flex items-center justify-center">
                         {movie.logo ? (
                           <img src={movie.logo} alt={movie.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x450?text=No+Cover'; }} />
                         ) : (
                           <Film className="w-8 h-8 text-slate-700" />
                         )}
                       </div>
                       <div className="w-full px-1">
                         <h3 className="font-bold text-xs text-slate-200 group-hover:text-teal-400 transition-colors line-clamp-2 leading-tight">{movie.name}</h3>
                         <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">{movie.group}</p>
                       </div>
                    </button>
                 ))}
                 {filteredChannels.length === 0 && (
                   <div className="col-span-full text-center text-slate-500 py-8 text-sm">No VOD found.</div>
                 )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }
    
    if (vodPlaylists.length > 0) {
      return (
        <div className="flex-1 flex flex-col p-8 items-center justify-center text-center overflow-y-auto">
          <Film className="w-12 h-12 text-teal-500/50 mb-4" />
          <h2 className="text-lg font-bold text-white mb-6">M3U VOD Playlists</h2>
          <div className="flex flex-col gap-3 w-full max-w-md">
            {vodPlaylists.map(pl => (
              <button 
                key={pl.id}
                onClick={() => {
                  const updated = playlists.map(p => ({ ...p, active: p.type === pl.type ? p.id === pl.id : p.active }));
                  savePlaylists(updated);
                  setPlaylists(updated);
                }}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-teal-500/50 text-white font-bold py-4 px-4 rounded-xl transition-all flex items-center justify-between"
              >
                <div className="flex flex-col items-start overflow-hidden flex-1 mr-3">
                  <span className="text-sm truncate w-full text-left">{pl.name}</span>
                </div>
                <span className="text-xs bg-teal-500/20 text-teal-400 px-3 py-1.5 rounded-lg">Load VOD</span>
              </button>
            ))}
          </div>
          
          <div className="mt-12 text-slate-500 text-xs text-center border-t border-slate-800 pt-6 max-w-md w-full">
            <p>If you intended to use an Xtream Codes API instead of M3U, you can configure it below.</p>
            {isRouteAdmin && isAdmin && (
              <button onClick={() => setShowXtreamModal(true)} className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg transition-colors text-xs">
                Setup Xtream VOD
              </button>
            )}
          </div>
        </div>
      );
    }

    if (!xtreamConfigured) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 h-full overflow-y-auto">
          <Film className="w-12 h-12 text-teal-500/50 mb-4" />
          <h2 className="text-lg font-bold text-white mb-2">VOD (Movies & Series)</h2>
          <p className="text-sm max-w-sm mb-6">Movies and Series are not currently set up. Please contact the administrator or check backend synchronization.</p>
          {isRouteAdmin && isAdmin && (
            <div className="flex flex-col gap-3">
              <button onClick={() => setShowXtreamModal(true)} className="px-6 py-2.5 bg-teal-500 hover:bg-teal-400 text-teal-950 font-bold rounded-xl transition-colors text-sm shadow-[0_0_15px_rgba(20,184,166,0.3)]">
                Setup Xtream API
              </button>
              <button onClick={() => { setShowAddModal(true); setNewPlType('vod'); }} className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors text-sm border border-slate-700">
                Add M3U VOD Playlist
              </button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {sourceSelector}
        <div className="flex bg-[#0a0a0a] border-b border-white/5 p-2 gap-2 shrink-0">
          <button 
            onClick={() => { setVodType('movies'); setVodCategoryFilter(''); }} 
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-300 ${vodType === 'movies' ? 'bg-teal-500/10 text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.1)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
          >
            Movies
          </button>
          <button 
            onClick={() => { setVodType('series'); setVodCategoryFilter(''); }} 
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-300 ${vodType === 'series' ? 'bg-teal-500/10 text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.1)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
          >
            Series
          </button>
        </div>
        
        <div className="p-2.5 shrink-0 bg-[#0a0a0a] flex items-center gap-2 border-b border-white/5">
            <div className="relative flex-1 md:hidden">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input type="text" placeholder="Search VOD..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:border-teal-500/50 text-white placeholder-slate-500" />
            </div>
            {(vodType === 'movies' ? vodCategories : seriesCategories).length > 0 && (
                <div className="relative group shadow-sm flex-1 md:w-auto">
                    <select 
                        value={vodCategoryFilter} 
                        onChange={(e) => setVodCategoryFilter(e.target.value)}
                        className="w-full bg-[#1a1a1a] hover:bg-[#252525] border border-white/10 group-hover:border-white/20 rounded-xl py-1.5 pl-3 pr-7 text-xs font-semibold focus:outline-none focus:border-teal-500/50 appearance-none transition-all text-slate-300 cursor-pointer"
                    >
                        <option className="bg-slate-900 text-slate-200" value="">All Categories</option>
                        {(vodType === 'movies' ? vodCategories : seriesCategories).map(c => (
                            <option key={c.category_id} value={c.category_id} className="bg-slate-900">{c.category_name}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-teal-500/70 pointer-events-none group-hover:text-teal-400 transition-colors" />
                </div>
            )}
        </div>

        <AnimatePresence mode="wait">
          {isLoadingVod && ((vodType === 'movies' && movies.length === 0) || (vodType === 'series' && seriesList.length === 0)) ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 h-full">
              <div className="animate-spin w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full mb-4" />
              <p className="text-sm">Loading {vodType === 'movies' ? 'Movie Library' : 'TV Series'}...</p>
            </motion.div>
          ) : xtreamError ? (
             <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6 mt-4 flex flex-col items-center">
               <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm break-words mb-4">{xtreamError}</div>
               {isRouteAdmin && isAdmin && (
                 <button onClick={clearXtreamConfig} className="px-4 py-2 font-bold text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition-colors">
                   Clear Xtream Config
                 </button>
               )}
             </motion.div>
          ) : (
            <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-max h-full">
               {vodType === 'movies' ? (
                  filteredMovies.slice(0, 500).map(movie => (
                    <button key={movie.stream_id} onClick={() => playMovie(movie)} className="flex flex-col items-start gap-2 group text-left">
                       <div className="w-full aspect-[2/3] bg-slate-900 rounded-xl overflow-hidden border border-slate-800 relative group-hover:border-teal-500/50 transition-colors shadow-sm shrink-0">
                          {movie.stream_icon ? <img src={movie.stream_icon} alt="" className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-slate-700">No Image</div>}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors flex items-center justify-center">
                            <PlayCircle className="w-12 h-12 text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity scale-75 group-hover:scale-100 duration-300" />
                          </div>
                       </div>
                       <div className="min-w-0 w-full shrink-0">
                         <div className="text-sm font-bold text-slate-200 group-hover:text-teal-400 truncate w-full">{movie.name}</div>
                         <div className="text-[10px] text-slate-500 font-medium truncate">Added: {movie.added ? new Date(parseInt(movie.added) * 1000).toLocaleDateString() : 'N/A'}</div>
                       </div>
                    </button>
                  ))
               ) : (
                  filteredSeries.slice(0, 500).map(series => (
                    <button key={series.series_id} onClick={() => playSeries(series)} className="flex flex-col items-start gap-2 group text-left">
                       <div className="w-full aspect-[2/3] bg-slate-900 rounded-xl overflow-hidden border border-slate-800 relative group-hover:border-teal-500/50 transition-colors shadow-sm shrink-0">
                          {series.cover ? <img src={series.cover} alt="" className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center text-slate-700">No Image</div>}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors flex items-center justify-center">
                            <PlayCircle className="w-12 h-12 text-teal-400 opacity-0 group-hover:opacity-100 transition-opacity scale-75 group-hover:scale-100 duration-300" />
                          </div>
                       </div>
                       <div className="min-w-0 w-full shrink-0">
                         <div className="text-sm font-bold text-slate-200 group-hover:text-teal-400 truncate w-full">{series.name}</div>
                         <div className="text-[10px] text-slate-500 font-medium truncate">Rating: {series.rating || 'N/A'}</div>
                       </div>
                    </button>
                  ))
               )}
               {vodType === 'movies' && filteredMovies.length > 500 && <div className="col-span-full text-center text-xs text-slate-500 py-4 w-full break-words">Search to see all movies...</div>}
               {vodType === 'series' && filteredSeries.length > 500 && <div className="col-span-full text-center text-xs text-slate-500 py-4 w-full break-words">Search to see all series...</div>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  if (isRouteAdmin && !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl w-full max-w-sm shadow-2xl">
          <div className="w-16 h-16 bg-teal-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Settings className="w-8 h-8 text-teal-500" />
          </div>
          <h1 className="text-xl font-bold text-center text-white mb-6">Admin Authentication</h1>
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
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500"
              autoFocus
            />
            <button type="submit" className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl py-3 shadow-lg shadow-teal-500/20 transition-all">
              Login
            </button>
            <button type="button" onClick={() => window.location.href = '/'} className="w-full text-slate-400 hover:text-white text-sm py-2">
              Return to App
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-[#0a0a0a] text-slate-200 overflow-hidden font-sans">
      {/* Header */}
      <header className="flex-shrink-0 h-16 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-3">
          <button onClick={() => setLeftDrawerOpen(true)} className="hidden md:flex lg:hidden p-2 -ml-2 text-slate-400 hover:text-white rounded-full transition-colors">
            <ListVideo className="w-5 h-5" />
          </button>
          <div className="hidden sm:flex w-9 h-9 bg-teal-500/10 rounded-lg items-center justify-center border border-teal-500/20 shrink-0">
            <Tv className="w-5 h-5 text-teal-400" />
          </div>
          <h1 className="flex items-center gap-1.5 text-lg font-bold tracking-widest text-white whitespace-nowrap select-none">
            <span>STREAM <span className="text-teal-400">TV</span></span>
            <span className="text-[10px] bg-gradient-to-r from-teal-400 to-emerald-400 text-slate-950 px-1.5 py-0.5 rounded font-black tracking-tight">PRO</span>
          </h1>
        </div>
        
        <div className="hidden md:flex flex-1 max-w-md mx-6 relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-teal-400 transition-colors" />
          <input 
            type="text" 
            placeholder={activeTab === 'vod' ? `Search ${vodType}...` : "Search channels..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 focus:outline-none focus:border-teal-500/50 focus:bg-white/10 text-sm transition-all"
          />
        </div>
        
        <div className="flex items-center gap-2">
          {activeChannel && (
            <div className="hidden lg:flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg mr-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-bold text-red-500 tracking-widest uppercase">Live</span>
            </div>
          )}
          {isRouteAdmin && isAdmin && (
            <button onClick={() => setShowAddModal(true)} className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg transition-all" title="Add Playlist">
              <Plus className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => setShowDirectModal(true)} className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg transition-all" title="Direct Play">
            <FolderOpen className="w-4 h-4" />
          </button>
          <button onClick={() => {
            if (activeTab === 'vod' && activeVodPlaylist) {
              loadPlaylist(activeVodPlaylist, setM3uVodChannels, setLoadingVodM3u, setVodError);
            } else if (activeLivePlaylist) {
              loadPlaylist(activeLivePlaylist, setChannels, setLoading, setError);
            }
          }} className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white rounded-lg transition-all" title="Reload">
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
              {appNotice}
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

        {/* Left Sidebar / Drawer */}
        <aside className={`
          flex flex-col w-72 lg:w-80 bg-[#0a0a0a] border-r border-white/5 shrink-0
          fixed lg:relative inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out shadow-[10px_0_30px_rgba(0,0,0,0.5)]
          ${leftDrawerOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          hidden md:flex lg:flex
        `}>
          <div className="flex p-2 gap-1 bg-transparent border-b border-white/5 shrink-0 overflow-x-auto no-scrollbar">
            <button onClick={() => setActiveTab('channels')} className={`flex-1 min-w-[70px] flex flex-col items-center gap-1.5 p-2 rounded-xl text-[10px] sm:text-xs font-semibold transition-all duration-300 ${activeTab === 'channels' ? 'bg-teal-500/10 text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.1)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
              <MonitorPlay className="w-4 h-4" /> Live TV
            </button>
            <button onClick={() => setActiveTab('vod')} className={`flex-1 min-w-[70px] flex flex-col items-center gap-1.5 p-2 rounded-xl text-[10px] sm:text-xs font-semibold transition-all duration-300 ${activeTab === 'vod' ? 'bg-teal-500/10 text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.1)]' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
              <Film className="w-4 h-4" /> VOD
            </button>
            <button onClick={() => setActiveTab('dev')} className={`flex-1 min-w-[70px] flex flex-col items-center gap-1.5 p-2 rounded-lg text-[10px] sm:text-xs font-semibold transition-colors ${activeTab === 'dev' ? 'bg-white/10 text-teal-400' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
              <Code className="w-4 h-4" /> Dev
            </button>
            {isRouteAdmin && isAdmin && (
              <>
                <button onClick={() => setActiveTab('lists')} className={`flex-1 min-w-[70px] flex flex-col items-center gap-1.5 p-2 rounded-lg text-[10px] sm:text-xs font-semibold transition-colors ${activeTab === 'lists' ? 'bg-white/10 text-teal-400' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                  <ListVideo className="w-4 h-4" /> Playlists
                </button>
                <button onClick={() => setActiveTab('setup')} className={`flex-1 min-w-[70px] flex flex-col items-center gap-1.5 p-2 rounded-lg text-[10px] sm:text-xs font-semibold transition-colors ${activeTab === 'setup' ? 'bg-white/10 text-teal-400' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                  <Settings className="w-4 h-4" /> Setup
                </button>
              </>
            )}
          </div>

          <div className="flex-1 overflow-y-auto overflow-x-hidden flex flex-col">
            {activeTab === 'channels' && (
              <div className="flex flex-col h-full">
                <div className="p-3 shrink-0 flex flex-col gap-2">
                  {playlists.filter(p => p.type !== 'vod').length > 1 && (
                    <div className="relative group shadow-sm">
                    <select
                      value={activeLivePlaylist?.id || ''}
                      onChange={(e) => {
                        const updated = playlists.map(p => ({ ...p, active: p.type !== 'vod' ? p.id === e.target.value : p.active }));
                        setPlaylists(updated);
                        savePlaylists(updated);
                      }}
                      className="w-full bg-[#1a1a1a] hover:bg-[#252525] border border-white/10 group-hover:border-white/20 rounded-xl py-2 pl-3 pr-8 text-sm font-semibold focus:outline-none focus:border-teal-500/50 appearance-none cursor-pointer text-slate-200 transition-all"
                    >
                      {playlists.filter(p => p.type !== 'vod').map(p => <option className="bg-slate-900 text-slate-200" key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-500/70 pointer-events-none group-hover:text-teal-400 transition-colors" />
                  </div>
                  )}
                  <div className="relative group shadow-sm">
                    <select 
                      value={groupFilter} 
                      onChange={(e) => setGroupFilter(e.target.value)}
                      className="w-full bg-[#1a1a1a] hover:bg-[#252525] border border-white/10 group-hover:border-white/20 rounded-xl py-2 pl-3 pr-8 text-sm font-semibold focus:outline-none focus:border-teal-500/50 appearance-none cursor-pointer transition-all text-slate-200"
                    >
                      <option className="bg-slate-900 text-slate-200" value="">All Groups ({channels.length})</option>
                      {groups.map(g => <option className="bg-slate-900 text-slate-200" key={g} value={g}>{g}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-500/70 pointer-events-none group-hover:text-teal-400 transition-colors" />
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
                  <AnimatePresence mode="wait">
                    {loading ? (
                       <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 text-center text-sm text-slate-500 flex flex-col items-center gap-3">
                         <div className="animate-spin w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full" />
                         Loading channels...
                       </motion.div>
                    ) : filteredChannels.length === 0 ? (
                       <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 text-center text-sm text-slate-500">No channels found</motion.div>
                    ) : (
                      <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        {filteredChannels.slice(0, 200).map(ch => {
                          const isActive = activeChannel?.uid === ch.uid;
                          return (
                            <button 
                              key={ch.uid}
                              onClick={() => handlePlay(ch)}
                              className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all border relative overflow-hidden group ${isActive ? 'bg-white/10 border-teal-500/20 shadow-sm' : 'border-transparent hover:bg-white/5'}`}
                            >
                              {isActive && <div className="absolute inset-y-0 left-0 w-1 bg-teal-400" />}
                              <div className={`w-10 h-10 rounded-lg bg-black flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden border transition-colors ${isActive ? 'border-teal-400/50 text-teal-400' : 'border-white/10 text-slate-400 group-hover:border-white/20'}`}>
                                {ch.logo ? <img src={ch.logo} alt="" className="w-full h-full object-cover" /> : ch.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <div className={`truncate text-[13px] font-semibold transition-colors ${isActive ? 'text-teal-400' : 'text-slate-200 group-hover:text-white'}`}>{ch.name}</div>
                                <div className="truncate text-[10px] uppercase tracking-widest text-slate-500 mt-0.5 font-medium">{ch.group}</div>
                              </div>
                            </button>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {filteredChannels.length > 200 && <div className="text-center text-xs text-slate-500 p-2">Search to see more...</div>}
                </div>
              </div>
            )}

            {activeTab === 'vod' && renderVodTab()}

            {activeTab === 'lists' && (
              <div className="p-4 space-y-6">
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-3">Saved Playlists</h3>
                  {playlists.map((pl) => (
                    editingPlaylistId === pl.id ? (
                      <div key={pl.id} className="p-4 rounded-xl border bg-slate-900 border-teal-500/50 shadow-[0_0_15px_rgba(20,184,166,0.1)] flex flex-col gap-3">
                        <input type="text" value={editPlName} onChange={(e) => setEditPlName(e.target.value)} placeholder="Playlist Name" className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-teal-500 text-white" />
                        <input type="url" value={editPlUrl} onChange={(e) => setEditPlUrl(e.target.value)} placeholder="M3U URL" className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-teal-500 text-white" />
                        <div className="relative group">
                                <select value={editPlType} onChange={(e) => setEditPlType(e.target.value as 'live' | 'vod')} className="w-full bg-[#1a1a1a] hover:bg-[#252525] border border-slate-700 group-hover:border-slate-500 rounded-lg py-2 px-3 pr-8 text-sm focus:outline-none focus:border-teal-500 text-white appearance-none cursor-pointer transition-all">
                                  <option className="bg-slate-900 text-slate-200" value="live">Live TV</option>
                                  <option className="bg-slate-900 text-slate-200" value="vod">VOD (Movies/Series)</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-500/70 pointer-events-none group-hover:text-teal-400 transition-colors" />
                              </div>
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
                    <div key={pl.id} className={`p-4 rounded-xl border transition-all ${pl.active ? 'bg-slate-800 border-teal-500/50 shadow-[0_0_15px_rgba(20,184,166,0.1)]' : 'bg-slate-900 border-slate-800 hover:border-slate-700'}`}>
                      <div className="font-bold text-sm mb-1 break-words">{pl.name} {pl.isDefault && <span className="text-[10px] text-teal-400 ml-2 tracking-wide">DEFAULT</span>}{pl.type === 'vod' && <span className="text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded ml-2 tracking-wide font-bold">VOD</span>}</div>
                      <div className="text-xs text-slate-500 truncate mb-4">{pl.url}</div>
                      <div className="flex gap-2">
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                setEditPlName(pl.name);
                                setEditPlUrl(pl.url);
                                setEditPlType(pl.type || 'live');
                                setEditingPlaylistId(pl.id);
                              }}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold border border-teal-500/30 text-teal-400 hover:bg-teal-500/10 transition-colors"
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
                <div className="p-5 sm:p-6 bg-slate-900/60 rounded-3xl border border-teal-500/20 shadow-[0_0_30px_rgba(20,184,166,0.1)] flex flex-col gap-6 relative overflow-hidden">
                  {/* Inner background glow */}
                  <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-teal-500/10 to-transparent pointer-events-none" />

                  {/* Profile row */}
                  <div className="flex items-center gap-4 sm:gap-5 relative z-10">
                    <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-xl font-black shadow-[0_0_20px_rgba(20,184,166,0.4)] overflow-hidden border-2 border-teal-400 bg-teal-900/50 shrink-0">
                      <img src="https://api.dicebear.com/7.x/lorelei/svg?seed=Farabi&backgroundColor=0d9488" alt="Developer" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <h2 className="font-black text-lg sm:text-xl tracking-wide text-slate-50 uppercase drop-shadow-[0_2px_10px_rgba(20,184,166,0.5)]">FARABI AHMED<br/>SHAKIL</h2>
                      <div className="text-[10px] sm:text-xs text-teal-400 font-bold tracking-widest uppercase mt-1.5 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,1)]" /> DEVELOPER
                      </div>
                    </div>
                  </div>

                  {/* Features grid */}
                  <div className="grid grid-cols-4 gap-2 sm:gap-3 relative z-10">
                    <div className="flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-2 sm:p-3 bg-slate-800/40 rounded-xl border border-slate-700/50 hover:border-teal-500/30 transition-colors">
                      <Code2 className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
                      <span className="text-[9px] sm:text-[10px] font-medium text-slate-300 text-center leading-tight">Clean<br/>Code</span>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-2 sm:p-3 bg-slate-800/40 rounded-xl border border-slate-700/50 hover:border-teal-500/30 transition-colors">
                      <Rocket className="w-5 h-5 sm:w-6 sm:h-6 text-teal-400" />
                      <span className="text-[9px] sm:text-[10px] font-medium text-slate-300 text-center leading-tight">Fast<br/>Performance</span>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-2 sm:p-3 bg-slate-800/40 rounded-xl border border-slate-700/50 hover:border-teal-500/30 transition-colors">
                      <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
                      <span className="text-[9px] sm:text-[10px] font-medium text-slate-300 text-center leading-tight">Secure</span>
                    </div>
                    <div className="flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-2 sm:p-3 bg-slate-800/40 rounded-xl border border-slate-700/50 hover:border-teal-500/30 transition-colors">
                      <Lightbulb className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
                      <span className="text-[9px] sm:text-[10px] font-medium text-slate-300 text-center leading-tight">Creative<br/>Solution</span>
                    </div>
                  </div>

                  {/* Quote */}
                  <div className="relative p-3 sm:p-4 rounded-xl border border-slate-700/50 bg-gradient-to-r from-teal-500/10 to-transparent flex items-center justify-between overflow-hidden group">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.8)]" />
                    <div className="flex gap-2 sm:gap-3 relative z-10 pl-2 max-w-[70%]">
                      <Quote className="w-4 h-4 sm:w-5 sm:h-5 text-teal-400 shrink-0 opacity-80" />
                      <p className="text-xs sm:text-sm italic text-slate-200 font-serif leading-relaxed">
                        "Dream big, write code,<br/>never give up."
                      </p>
                    </div>
                    <Code className="w-12 h-12 sm:w-16 sm:h-16 text-teal-500/30 -rotate-12 absolute -right-2 top-1/2 -translate-y-1/2 group-hover:scale-110 transition-transform duration-500 group-hover:text-teal-400/40" />
                  </div>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-center gap-2 mb-1 sm:mb-2 ml-1">
                    <h3 className="text-xs sm:text-sm font-bold text-teal-400 uppercase tracking-[0.2em] drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]">CONTACT</h3>
                  </div>
                  
                  <a href="https://www.facebook.com/farabiahmedshakil11" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-3 sm:p-4 bg-slate-900/60 border border-slate-700/80 hover:border-teal-500/50 hover:bg-slate-800/80 rounded-2xl transition-all group shadow-lg">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#1877F2] rounded-xl flex items-center justify-center shrink-0 shadow-[0_4px_15px_rgba(24,119,242,0.4)] group-hover:scale-105 transition-transform"><span className="font-bold text-xl sm:text-2xl text-white">f</span></div>
                    <div className="flex-1">
                      <div className="font-bold text-sm sm:text-base group-hover:text-teal-300 transition-colors text-slate-100">Facebook</div>
                      <div className="text-[10px] sm:text-xs text-slate-400">farabiahmedshakil11</div>
                    </div>
                    <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 group-hover:text-teal-400" />
                  </a>
                  
                  <a href="https://t.me/farabiSH" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-3 sm:p-4 bg-slate-900/60 border border-slate-700/80 hover:border-teal-500/50 hover:bg-slate-800/80 rounded-2xl transition-all group shadow-lg">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#229ED9] rounded-xl flex items-center justify-center shrink-0 shadow-[0_4px_15px_rgba(34,158,217,0.4)] group-hover:scale-105 transition-transform"><span className="font-bold italic text-lg sm:text-xl text-white">TG</span></div>
                    <div className="flex-1">
                      <div className="font-bold text-sm sm:text-base group-hover:text-teal-300 transition-colors text-slate-100">Telegram</div>
                      <div className="text-[10px] sm:text-xs text-slate-400">@farabiSH</div>
                    </div>
                    <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 group-hover:text-teal-400" />
                  </a>
                </div>
              </motion.div>
            )}

            {activeTab === 'setup' && (
              <div className="p-4 flex flex-col gap-6">
                <div className="flex items-center gap-3 mb-2 border-b border-slate-800 pb-4">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center shrink-0">
                    <Settings className="w-5 h-5 text-teal-400" />
                  </div>
                  <div>
                    <h2 className="font-bold text-white text-lg">Server Configuration</h2>
                    <p className="text-xs text-slate-400">Publish Notice, Playlists & Xtream to Firebase</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {backendError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
                      {backendError}
                    </div>
                  )}
                  {backendSuccess && (
                    <div className="p-3 bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs rounded-xl">
                      {backendSuccess}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                     <button 
                       onClick={() => publishConfigToFirebase()} 
                       disabled={backendSyncing}
                       className="flex-1 py-3 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-bold rounded-xl shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                     >
                       {backendSyncing && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                       Publish Config to Firebase
                     </button>
                  </div>
                  
                  <div className="border-t border-slate-800 my-2 pt-4">
                    <div className="flex items-center justify-between mb-1.5 ml-1">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Or Paste JSON Directly</label>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            const data = {
                              app_notice: appNotice,
                              xtream: {
                                url: xtreamUrl,
                                username: xtreamUser,
                                password: xtreamPass
                              },
                              playlists: playlists.map(p => ({
                                name: p.name,
                                url: p.url,
                                type: p.type
                              }))
                            };
                            setCustomJsonInput(JSON.stringify(data, null, 2));
                          }}
                          className="text-[10px] bg-teal-600 hover:bg-teal-500 text-white px-2 py-1 rounded"
                        >
                          Show Current JSON
                        </button>
                        <button 
                          onClick={() => {
                            setCustomJsonInput(`{\n  "app_notice": "Your notice...",\n  "xtream": {\n    "url": "http://...",\n    "username": "...",\n    "password": "..."\n  },\n  "playlists": [\n    {\n      "name": "Live TV",\n      "url": "https://.../playlist.m3u",\n      "type": "live"\n    }\n  ]\n}`);
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
                      className="w-full h-40 bg-slate-800/80 border border-slate-700/50 rounded-xl py-3 px-4 focus:outline-none focus:border-teal-500 transition-colors text-white font-mono text-[10px] sm:text-xs placeholder:text-slate-600 resize-none"
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
                          
                          if (data.xtream) {
                            setXtreamUrl(data.xtream.url || '');
                            setXtreamUser(data.xtream.username || '');
                            setXtreamPass(data.xtream.password || '');
                            setXtreamConfigured(true);
                            localStorage.setItem('xtream_url', data.xtream.url || '');
                            localStorage.setItem('xtream_user', data.xtream.username || '');
                            localStorage.setItem('xtream_pass', data.xtream.password || '');
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
                          
                          setActiveTab('channels');
                          alert("Configuration applied and published successfully!");
                        } catch (e: any) {
                          alert("Invalid JSON. Please ensure it is formatted correctly. Error: " + e.message);
                        }
                      }}
                      className="w-full mt-3 py-3 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-bold rounded-xl shadow-lg transition-all"
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
        <div className="flex-1 flex flex-col min-w-0 bg-black overflow-hidden relative z-10">
          <div className="w-full shrink-0 aspect-video md:aspect-auto md:flex-1 relative shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-20">
            <div className="absolute inset-0">
              <Player channel={activeChannel} />
            </div>
          </div>
          
          {/* Mobile panel takes up the rest of the height on phones */}
          <div className="md:hidden flex-1 flex flex-col bg-black/80 backdrop-blur-xl border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] min-h-0 z-30">
              <div className="flex p-1.5 gap-1 bg-transparent border-b border-white/5 shadow-sm shrink-0 overflow-x-auto no-scrollbar">
                <button onClick={() => setActiveTab('channels')} className={`flex-1 min-w-[70px] flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-bold tracking-wide uppercase transition-all duration-300 ${activeTab === 'channels' ? 'bg-teal-500/10 text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.1)] scale-105' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                   <MonitorPlay className="w-4 h-4 mb-0.5" />
                   TV
                </button>
                <button onClick={() => setActiveTab('vod')} className={`flex-1 min-w-[70px] flex flex-col items-center gap-1 py-2 rounded-xl text-[10px] font-bold tracking-wide uppercase transition-all duration-300 ${activeTab === 'vod' ? 'bg-teal-500/10 text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.1)] scale-105' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                   <Film className="w-4 h-4 mb-0.5" />
                   VOD
                </button>
                <button onClick={() => setActiveTab('dev')} className={`flex-1 min-w-[60px] flex flex-col items-center gap-1 py-1 rounded-xl text-[10px] font-bold tracking-wide uppercase transition-all duration-300 ${activeTab === 'dev' ? 'bg-teal-500/10 text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.1)] scale-105' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                   <Code className="w-4 h-4 mb-0.5" />
                   Dev
                </button>
                {isRouteAdmin && isAdmin && (
                  <>
                    <button onClick={() => setActiveTab('lists')} className={`flex-1 min-w-[60px] flex flex-col items-center gap-1 py-1 rounded-xl text-[10px] font-bold tracking-wide uppercase transition-all duration-300 ${activeTab === 'lists' ? 'bg-teal-500/10 text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.1)] scale-105' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                       <ListVideo className="w-4 h-4 mb-0.5" />
                       Lists
                    </button>
                    <button onClick={() => setActiveTab('setup')} className={`flex-1 min-w-[60px] flex flex-col items-center gap-1 py-1 rounded-xl text-[10px] font-bold tracking-wide uppercase transition-all duration-300 ${activeTab === 'setup' ? 'bg-teal-500/10 text-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.1)] scale-105' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
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
                      {playlists.filter(p => p.type !== 'vod').length > 1 && (
                        <div className="p-2.5 shrink-0 pb-0">
                          <div className="relative group shadow-sm">
                    <select
                      value={activeLivePlaylist?.id || ''}
                      onChange={(e) => {
                        const updated = playlists.map(p => ({ ...p, active: p.type !== 'vod' ? p.id === e.target.value : p.active }));
                        setPlaylists(updated);
                        savePlaylists(updated);
                      }}
                      className="w-full bg-[#1a1a1a] hover:bg-[#252525] border border-white/10 group-hover:border-white/20 rounded-xl py-2 pl-3 pr-8 text-sm font-semibold focus:outline-none focus:border-teal-500/50 appearance-none cursor-pointer text-slate-200 transition-all"
                    >
                      {playlists.filter(p => p.type !== 'vod').map(p => <option className="bg-slate-900 text-slate-200" key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-500/70 pointer-events-none group-hover:text-teal-400 transition-colors" />
                  </div>
                        </div>
                      )}
                      <div className="p-2.5 shrink-0 flex gap-2">
                        <div className="relative flex-1">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                          <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:border-teal-500/50" />
                        </div>
                        <div className="relative w-1/3 group shrink-0 shadow-sm">
                          <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="w-full bg-[#1a1a1a] hover:bg-[#252525] border border-white/10 group-hover:border-white/20 rounded-lg py-1.5 pl-3 pr-7 text-xs font-semibold focus:outline-none focus:border-teal-500/50 appearance-none transition-all text-slate-300">
                            <option className="bg-slate-900 text-slate-200" value="">All Groups</option>
                            {groups.map(g => <option className="bg-slate-900 text-slate-200" key={g} value={g}>{g}</option>)}
                          </select>
                          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-teal-500/70 pointer-events-none group-hover:text-teal-400 transition-colors" />
                        </div>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto px-2 pb-6 space-y-1">
                        <AnimatePresence mode="wait">
                          {loading ? (
                             <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-8 text-center text-sm text-slate-500 flex flex-col items-center gap-2"><div className="animate-spin w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full" />Loading...</motion.div>
                          ) : filteredChannels.length === 0 ? (
                             <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-8 text-center text-sm text-slate-500">No channels found</motion.div>
                          ) : (
                            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                              {filteredChannels.slice(0, 200).map(ch => {
                                const isActive = activeChannel?.uid === ch.uid;
                                return (
                                  <button key={ch.uid} onClick={() => handlePlay(ch)} className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all border relative overflow-hidden group ${isActive ? 'bg-white/10 border-teal-500/20 shadow-sm' : 'border-transparent hover:bg-white/5'}`}>
                                    {isActive && <div className="absolute inset-y-0 left-0 w-1 bg-teal-400 shadow-sm" />}
                                    <div className={`w-10 h-10 rounded-lg border shadow-sm bg-black flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden transition-colors ${isActive ? 'border-teal-400/50 text-teal-400' : 'border-white/10 text-slate-400 group-hover:border-white/20'}`}>
                                      {ch.logo ? <img src={ch.logo} alt="" className="w-full h-full object-cover" /> : ch.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0 text-left">
                                      <div className={`truncate text-sm font-semibold transition-colors ${isActive ? 'text-teal-400' : 'text-slate-200 group-hover:text-white'}`}>{ch.name}</div>
                                      <div className="truncate text-[10px] uppercase tracking-widest text-slate-500 mt-0.5 font-medium leading-tight">{ch.group}</div>
                                    </div>
                                  </button>
                                );
                              })}
                            </motion.div>
                          )}
                        </AnimatePresence>
                        {filteredChannels.length > 200 && <div className="text-center text-xs text-slate-500 p-2">Search to see more...</div>}
                      </div>
                    </div>
                  )}

                  {activeTab === 'vod' && renderVodTab()}

                  {/* Mobile Lists... */}
                  {activeTab === 'lists' && (
                     <div className="p-4 space-y-6 overflow-y-auto">
                       <div className="space-y-3">
                         <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2">Saved Playlists</h3>
                         {playlists.map((pl) => (
                            editingPlaylistId === pl.id ? (
                              <div key={pl.id} className="p-4 rounded-xl border bg-slate-900 border-teal-500/50 shadow-[0_0_15px_rgba(20,184,166,0.1)] flex flex-col gap-3">
                                <input type="text" value={editPlName} onChange={(e) => setEditPlName(e.target.value)} placeholder="Playlist Name" className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-teal-500 text-white" />
                                <input type="url" value={editPlUrl} onChange={(e) => setEditPlUrl(e.target.value)} placeholder="M3U URL" className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-teal-500 text-white" />
                                <div className="relative group">
                                <select value={editPlType} onChange={(e) => setEditPlType(e.target.value as 'live' | 'vod')} className="w-full bg-[#1a1a1a] hover:bg-[#252525] border border-slate-700 group-hover:border-slate-500 rounded-lg py-2 px-3 pr-8 text-sm focus:outline-none focus:border-teal-500 text-white appearance-none cursor-pointer transition-all">
                                  <option className="bg-slate-900 text-slate-200" value="live">Live TV</option>
                                  <option className="bg-slate-900 text-slate-200" value="vod">VOD (Movies/Series)</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-500/70 pointer-events-none group-hover:text-teal-400 transition-colors" />
                              </div>
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
                            <div key={pl.id} className={`p-4 rounded-xl border transition-all ${pl.active ? 'bg-slate-800 border-teal-500/50 shadow-[0_0_15px_rgba(20,184,166,0.1)]' : 'bg-slate-900 border-slate-800'}`}>
                             <div className="font-bold text-sm mb-1 break-words">{pl.name} {pl.isDefault && <span className="text-[10px] text-teal-400 ml-2 tracking-wide">DEFAULT</span>}{pl.type === 'vod' && <span className="text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded ml-2 tracking-wide font-bold">VOD</span>}</div>
                             <div className="text-xs text-slate-500 truncate mb-4">{pl.url}</div>
                             <div className="flex gap-2">
                               {(!pl.isDefault) && (
                                 <div className="flex gap-2">
                                   <button 
                                     onClick={() => {
                                       setEditPlName(pl.name);
                                       setEditPlUrl(pl.url);
                                       setEditPlType(pl.type || 'live');
                                       setEditingPlaylistId(pl.id);
                                     }}
                                     className="px-4 py-2 rounded-lg text-xs font-bold border border-teal-500/30 text-teal-400 bg-teal-500/10 hover:bg-teal-500/20 transition-colors flex items-center justify-center shrink-0"
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
                      <div className="p-5 sm:p-6 bg-slate-900/60 rounded-3xl border border-teal-500/20 shadow-[0_0_30px_rgba(20,184,166,0.1)] flex flex-col gap-6 relative overflow-hidden">
                        {/* Inner background glow */}
                        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-teal-500/10 to-transparent pointer-events-none" />

                        {/* Profile row */}
                        <div className="flex items-center gap-4 sm:gap-5 relative z-10">
                          <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-xl font-black shadow-[0_0_20px_rgba(20,184,166,0.4)] overflow-hidden border-2 border-teal-400 bg-teal-900/50 shrink-0">
                            <img src="https://api.dicebear.com/7.x/lorelei/svg?seed=Farabi&backgroundColor=0d9488" alt="Developer" className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <h2 className="font-black text-lg sm:text-xl tracking-wide text-slate-50 uppercase drop-shadow-[0_2px_10px_rgba(20,184,166,0.5)]">FARABI AHMED<br/>SHAKIL</h2>
                            <div className="text-[10px] sm:text-xs text-teal-400 font-bold tracking-widest uppercase mt-1.5 flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,1)]" /> DEVELOPER
                            </div>
                          </div>
                        </div>

                        {/* Features grid */}
                        <div className="grid grid-cols-4 gap-2 sm:gap-3 relative z-10">
                          <div className="flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-2 sm:p-3 bg-slate-800/40 rounded-xl border border-slate-700/50 hover:border-teal-500/30 transition-colors">
                            <Code2 className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
                            <span className="text-[9px] sm:text-[10px] font-medium text-slate-300 text-center leading-tight">Clean<br/>Code</span>
                          </div>
                          <div className="flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-2 sm:p-3 bg-slate-800/40 rounded-xl border border-slate-700/50 hover:border-teal-500/30 transition-colors">
                            <Rocket className="w-5 h-5 sm:w-6 sm:h-6 text-teal-400" />
                            <span className="text-[9px] sm:text-[10px] font-medium text-slate-300 text-center leading-tight">Fast<br/>Performance</span>
                          </div>
                          <div className="flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-2 sm:p-3 bg-slate-800/40 rounded-xl border border-slate-700/50 hover:border-teal-500/30 transition-colors">
                            <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400" />
                            <span className="text-[9px] sm:text-[10px] font-medium text-slate-300 text-center leading-tight">Secure</span>
                          </div>
                          <div className="flex flex-col items-center justify-center gap-1.5 sm:gap-2 p-2 sm:p-3 bg-slate-800/40 rounded-xl border border-slate-700/50 hover:border-teal-500/30 transition-colors">
                            <Lightbulb className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
                            <span className="text-[9px] sm:text-[10px] font-medium text-slate-300 text-center leading-tight">Creative<br/>Solution</span>
                          </div>
                        </div>

                        {/* Quote */}
                        <div className="relative p-3 sm:p-4 rounded-xl border border-slate-700/50 bg-gradient-to-r from-teal-500/10 to-transparent flex items-center justify-between overflow-hidden group">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal-400 shadow-[0_0_10px_rgba(45,212,191,0.8)]" />
                          <div className="flex gap-2 sm:gap-3 relative z-10 pl-2 max-w-[70%]">
                            <Quote className="w-4 h-4 sm:w-5 sm:h-5 text-teal-400 shrink-0 opacity-80" />
                            <p className="text-xs sm:text-sm italic text-slate-200 font-serif leading-relaxed">
                              "Dream big, write code,<br/>never give up."
                            </p>
                          </div>
                          <Code className="w-12 h-12 sm:w-16 sm:h-16 text-teal-500/30 -rotate-12 absolute -right-2 top-1/2 -translate-y-1/2 group-hover:scale-110 transition-transform duration-500 group-hover:text-teal-400/40" />
                        </div>
                      </div>

                      <div className="space-y-3 sm:space-y-4">
                        <div className="flex items-center gap-2 mb-1 sm:mb-2 ml-1">
                          <h3 className="text-xs sm:text-sm font-bold text-teal-400 uppercase tracking-[0.2em] drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]">CONTACT</h3>
                        </div>
                        
                        <a href="https://www.facebook.com/farabiahmedshakil11" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-3 sm:p-4 bg-slate-900/60 border border-slate-700/80 hover:border-teal-500/50 hover:bg-slate-800/80 rounded-2xl transition-all group shadow-lg">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#1877F2] rounded-xl flex items-center justify-center shrink-0 shadow-[0_4px_15px_rgba(24,119,242,0.4)] group-hover:scale-105 transition-transform"><span className="font-bold text-xl sm:text-2xl text-white">f</span></div>
                          <div className="flex-1">
                            <div className="font-bold text-sm sm:text-base group-hover:text-teal-300 transition-colors text-slate-100">Facebook</div>
                            <div className="text-[10px] sm:text-xs text-slate-400">farabiahmedshakil11</div>
                          </div>
                          <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 group-hover:text-teal-400" />
                        </a>
                        
                        <a href="https://t.me/farabiSH" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-3 sm:p-4 bg-slate-900/60 border border-slate-700/80 hover:border-teal-500/50 hover:bg-slate-800/80 rounded-2xl transition-all group shadow-lg">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#229ED9] rounded-xl flex items-center justify-center shrink-0 shadow-[0_4px_15px_rgba(34,158,217,0.4)] group-hover:scale-105 transition-transform"><span className="font-bold italic text-lg sm:text-xl text-white">TG</span></div>
                          <div className="flex-1">
                            <div className="font-bold text-sm sm:text-base group-hover:text-teal-300 transition-colors text-slate-100">Telegram</div>
                            <div className="text-[10px] sm:text-xs text-slate-400">@farabiSH</div>
                          </div>
                          <ExternalLink className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 group-hover:text-teal-400" />
                        </a>
                      </div>
                    </motion.div>
                  )}

                  {activeTab === 'setup' && (
                    <div className="p-4 flex flex-col gap-6">
                      <div className="flex items-center gap-3 mb-2 border-b border-slate-800 pb-4">
                        <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center shrink-0">
                          <Settings className="w-5 h-5 text-teal-400" />
                        </div>
                        <div>
                          <h2 className="font-bold text-white text-lg">Server Configuration</h2>
                          <p className="text-xs text-slate-400">Publish Notice, Playlists & Xtream to Firebase</p>
                        </div>
                      </div>
                      
                      <div className="space-y-4">

                        {backendError && (
                          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
                            {backendError}
                          </div>
                        )}
                        {backendSuccess && (
                          <div className="p-3 bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs rounded-xl">
                            {backendSuccess}
                          </div>
                        )}

                        <div className="flex flex-col gap-3 pt-2">
                           <button 
                             onClick={() => publishConfigToFirebase()} 
                             disabled={backendSyncing}
                             className="w-full py-3 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-bold rounded-xl shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                           >
                             {backendSyncing && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                             Publish Config to Firebase
                           </button>
                        </div>
                        
                        <div className="border-t border-slate-800 my-2 pt-4">
                          <div className="flex items-center justify-between mb-1.5 ml-1">
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Or Paste JSON Directly</label>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => {
                                  const data = {
                                    app_notice: appNotice,
                                    xtream: {
                                      url: xtreamUrl,
                                      username: xtreamUser,
                                      password: xtreamPass
                                    },
                                    playlists: playlists.map(p => ({
                                      name: p.name,
                                      url: p.url,
                                      type: p.type
                                    }))
                                  };
                                  setCustomJsonInput(JSON.stringify(data, null, 2));
                                }}
                                className="text-[10px] bg-teal-600 hover:bg-teal-500 text-white px-2 py-1 rounded"
                              >
                                Show Current JSON
                              </button>
                              <button 
                                onClick={() => {
                                  setCustomJsonInput(`{\n  "app_notice": "Your notice...",\n  "xtream": {\n    "url": "http://...",\n    "username": "...",\n    "password": "..."\n  },\n  "playlists": [\n    {\n      "name": "Live TV",\n      "url": "https://.../playlist.m3u",\n      "type": "live"\n    }\n  ]\n}`);
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
                            className="w-full h-40 bg-slate-800/80 border border-slate-700/50 rounded-xl py-3 px-4 focus:outline-none focus:border-teal-500 transition-colors text-white font-mono text-[10px] sm:text-xs placeholder:text-slate-600 resize-none"
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
                                
                                if (data.xtream) {
                                  setXtreamUrl(data.xtream.url || '');
                                  setXtreamUser(data.xtream.username || '');
                                  setXtreamPass(data.xtream.password || '');
                                  setXtreamConfigured(true);
                                  localStorage.setItem('xtream_url', data.xtream.url || '');
                                  localStorage.setItem('xtream_user', data.xtream.username || '');
                                  localStorage.setItem('xtream_pass', data.xtream.password || '');
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
                                
                                setActiveTab('channels');
                                alert("Configuration applied successfully!");
                              } catch (e: any) {
                                alert("Invalid JSON. Please ensure it is formatted correctly. Error: " + e.message);
                              }
                            }}
                            className="w-full mt-3 py-3 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-bold rounded-xl shadow-lg transition-all"
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
          <div className="bg-slate-900 border border-slate-700/80 p-6 rounded-2xl w-full max-w-md shadow-2xl relative">
            <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-black mb-6">Add New Playlist</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Name (optional)</label>
                <input type="text" value={newPlName} onChange={(e) => setNewPlName(e.target.value)} placeholder="My IPTV List" className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 focus:outline-none focus:border-teal-500 transition-colors text-white" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">M3U/M3U8 URL</label>
                <input type="url" value={newPlUrl} onChange={(e) => setNewPlUrl(e.target.value)} placeholder="https://..." className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 px-4 focus:outline-none focus:border-teal-500 transition-colors text-white" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Playlist Type</label>
                <div className="relative group">
                  <select value={newPlType} onChange={(e) => setNewPlType(e.target.value as 'live'|'vod')} className="w-full bg-[#1a1a1a] hover:bg-[#252525] border border-slate-700 group-hover:border-slate-500 rounded-xl py-2.5 px-4 pr-10 focus:outline-none focus:border-teal-500 transition-all text-white appearance-none cursor-pointer">
                    <option className="bg-slate-900 text-slate-200" value="live">Live TV Channels</option>
                    <option className="bg-slate-900 text-slate-200" value="vod">VOD (Movies & Series)</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-500/70 pointer-events-none group-hover:text-teal-400 transition-colors" />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-3">
                <button onClick={() => setShowAddModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">Cancel</button>
                <button onClick={addPlaylist} disabled={!newPlUrl} className="px-5 py-2.5 rounded-xl font-bold bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-lg shadow-teal-500/20 transition-all">Add Playlist</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Xtream Credentials Modal */}
      {showXtreamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl w-full max-w-lg shadow-2xl relative">
            <button onClick={() => setShowXtreamModal(false)} className="absolute top-6 right-6 p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
              <X className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-teal-500/20 flex items-center justify-center">
                <Film className="w-7 h-7 text-teal-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white leading-tight">Xtream Codes Config</h2>
                <div className="text-sm font-medium text-slate-400">Unlock VOD Library & Series</div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Server URL</label>
                <input type="url" value={xtreamUrl} onChange={(e) => setXtreamUrl(e.target.value)} placeholder="http://example.com:8080" className="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl py-3 px-4 focus:outline-none focus:border-teal-500 transition-colors text-white font-mono text-sm placeholder:text-slate-600" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Username</label>
                  <input type="text" value={xtreamUser} onChange={(e) => setXtreamUser(e.target.value)} placeholder="Username" className="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl py-3 px-4 focus:outline-none focus:border-teal-500 transition-colors text-white font-mono text-sm placeholder:text-slate-600" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Password</label>
                  <input type="password" value={xtreamPass} onChange={(e) => setXtreamPass(e.target.value)} placeholder="Password" className="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl py-3 px-4 focus:outline-none focus:border-teal-500 transition-colors text-white font-mono text-sm placeholder:text-slate-600" />
                </div>
              </div>
              
              <div className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-xl mt-4">
                <p className="text-xs text-teal-400/90 font-medium leading-relaxed">
                  Note: Providing credentials enables the Movies and TV Series library tabs. Data remains stored completely locally in your browser.
                </p>
              </div>

              <div className="pt-4 flex flex-wrap justify-end gap-3 items-center">
                {xtreamConfigured && (
                   <button onClick={clearXtreamConfig} className="mr-auto px-4 py-2 font-bold text-red-400 hover:text-red-300 transition-colors text-sm border border-red-500/30 rounded-lg hover:bg-red-500/10">
                      Clear Data
                   </button>
                )}
                <button onClick={() => setShowXtreamModal(false)} className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">Cancel</button>
                <button onClick={saveXtreamConfig} disabled={!xtreamUrl || !xtreamUser || !xtreamPass} className="px-8 py-3 rounded-xl font-bold bg-teal-600 hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-[0_0_20px_rgba(13,148,136,0.3)] transition-all">Save Config</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Direct Play Modal */}
      {showDirectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700/80 p-6 rounded-2xl w-full max-w-md shadow-2xl relative">
            <button onClick={() => setShowDirectModal(false)} className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
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
                <input type="url" value={directUrl} onChange={(e) => setDirectUrl(e.target.value)} placeholder="https://... or ftp://..." required className="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl py-3 px-4 focus:outline-none focus:border-amber-500 transition-colors text-white font-mono text-sm placeholder:text-slate-600" />
              </div>

              <div className="pt-4 flex justify-end gap-3 items-center">
                <button type="button" onClick={() => setShowDirectModal(false)} className="px-6 py-3 rounded-xl font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">Cancel</button>
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
