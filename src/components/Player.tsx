import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import mpegts from 'mpegts.js';

if (mpegts && mpegts.LoggingControl) {
  mpegts.LoggingControl.enableAll = false;
}

import { Channel } from '../types';
import { 
  Play, Pause, Volume2, VolumeX, Maximize, Minimize, 
  Settings, PictureInPicture, MonitorPlay, SkipBack, SkipForward, AlertCircle, Maximize2 
} from 'lucide-react';

interface PlayerProps {
  channel: Channel | null;
  onNext: () => void;
  onPrev: () => void;
}

export default function Player({ channel, onNext, onPrev }: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const mpegtsRef = useRef<any>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [qualityMode, setQualityMode] = useState<number | 'auto'>('auto');
  const [levels, setLevels] = useState<any[]>([]);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [fillFit, setFillFit] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState('LIVE');
  const [totalTime, setTotalTime] = useState('∞');
  const overlayTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!channel || !videoRef.current) return;
    const video = videoRef.current;
    
    setLoading(true);
    setError('');
    setIsPlaying(false);
    setLevels([]);
    setQualityMode('auto');
    setShowQualityMenu(false);
    
    if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
    }
    if (mpegtsRef.current) {
        mpegtsRef.current.destroy();
        mpegtsRef.current = null;
    }
    
    const cleanUrl = channel.url.split('?')[0].split('#')[0];
    const ext = (cleanUrl.split('.').pop() || '').toLowerCase();
    const directExts = ['mp4', 'mkv', 'webm', 'mov', 'm4v', 'ogg', 'ogv', 'avi', 'wmv', 'flv'];
    const isM3u8Ext = ext === 'm3u8' || channel.url.includes('.m3u8');
    const isTsExt = ext === 'ts' || (channel.url.includes('.ts') && !isM3u8Ext);
    
    const PROXIES = [
        '',
        'https://corsproxy.io/?',
        'https://api.cors.lol/?url=',
        'https://thingproxy.freeboard.io/fetch/',
        'https://api.codetabs.com/v1/proxy?quest='
    ];
    const maxProxyIndex = PROXIES.length - 1;
    const getProxiedUrl = (url: string, proxyIdx: number): string => {
        if (proxyIdx === 0) return url;
        const p = PROXIES[proxyIdx];
        if (p.includes('thingproxy') || p.includes('codetabs')) {
            return p + url;
        }
        return p + encodeURIComponent(url);
    };

    let isDestroyed = false;
    const isMixedContent = window.location.protocol === 'https:' && channel.url.startsWith('http://');

    // Use native player for direct video file extensions
    if (directExts.includes(ext) || (!isM3u8Ext && !isTsExt && ext !== '')) {
        const tryNative = (proxyIdx: number) => {
            if (isDestroyed) return;
            const handleError = () => {
                video.removeEventListener('error', handleError);
                if (proxyIdx < maxProxyIndex) {
                    tryNative(proxyIdx + 1);
                } else {
                    setError('Playback error. Stream format unsupported or blocked.');
                    setLoading(false);
                }
            };
            video.addEventListener('error', handleError);
            video.src = getProxiedUrl(channel.url, proxyIdx);
            video.play().catch((e) => {
                if (e.name !== 'NotAllowedError' && e.name !== 'AbortError') {
                    handleError();
                }
            });
            video.onloadeddata = () => {
                video.removeEventListener('error', handleError);
                setLoading(false);
            };
        };
        tryNative(isMixedContent ? 1 : 0);
        return;
    }

    if (isTsExt && mpegts.getFeatureList().mseLivePlayback) {
        const initMpegts = (proxyIdx: number) => {
            if (isDestroyed) return;
            if (mpegtsRef.current) {
                mpegtsRef.current.destroy();
            }
            const srcUrl = getProxiedUrl(channel.url, proxyIdx);
            const player = mpegts.createPlayer({
                type: 'mpegts',
                isLive: true,
                url: srcUrl
            });
            mpegtsRef.current = player;
            player.attachMediaElement(video);
            player.load();
            const playPromise = player.play() as any;
            if (playPromise !== undefined && typeof playPromise.catch === 'function') {
                playPromise.catch(() => {});
            }
            
            player.on(mpegts.Events.ERROR, (errorType: any, errorDetail: any, info: any) => {
                if (errorDetail === 'HttpStatusCodeInvalid' && info && (info.code === 403 || info.code === 401 || info.code === 404)) {
                    setError('MPEG-TS Error: Stream access denied or not found (' + info.code + ')');
                    setLoading(false);
                    return;
                }
                if (proxyIdx < maxProxyIndex) {
                    initMpegts(proxyIdx + 1);
                } else {
                    setError('MPEG-TS Error: ' + errorType + ' ' + errorDetail);
                    setLoading(false);
                }
            });
            player.on(mpegts.Events.MEDIA_INFO, () => {
                setLoading(false);
            });
        };
        initMpegts(isMixedContent ? 1 : 0);
        return;
    }

    const initHls = (proxyIdx: number) => {
        if (isDestroyed) return;
        if (hlsRef.current) {
            hlsRef.current.destroy();
        }

        if (Hls.isSupported()) {
            const hls = new Hls({ 
                enableWorker: true, 
                lowLatencyMode: true, 
                backBufferLength: 90,
                xhrSetup: (xhr, url) => {
                    if (proxyIdx > 0) {
                        xhr.open('GET', getProxiedUrl(url, proxyIdx), true);
                    }
                }
            });
            
            hlsRef.current = hls;
            hls.loadSource(channel.url); 
            hls.attachMedia(video);
            
            hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
                setLevels(data.levels);
                video.play().catch(() => {});
                setLoading(false);
            });
            
            hls.on(Hls.Events.ERROR, (_, data) => {
                if (data.fatal) {
                    if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                        const response = data.response;
                        if (response && (response.code === 403 || response.code === 401 || response.code === 404)) {
                            hls.destroy();
                            setError(`Stream access denied or not found (${response.code}).`);
                            setLoading(false);
                            return;
                        }
                        if (proxyIdx < maxProxyIndex) {
                            initHls(proxyIdx + 1);
                        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                            hls.destroy();
                            const tryNativeFallback = (nIdx: number) => {
                                if (isDestroyed) return;
                                video.src = getProxiedUrl(channel.url, nIdx);
                                video.play().catch(() => {
                                    if (nIdx < maxProxyIndex) tryNativeFallback(nIdx + 1);
                                    else {
                                        setError('Stream blocked by CORS and proxy failed.');
                                        setLoading(false);
                                    }
                                });
                            };
                            tryNativeFallback(isMixedContent ? 1 : 0);
                        } else {
                            setError('Stream blocked by CORS and proxy failed.');
                            setLoading(false);
                        }
                    } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                        hls.recoverMediaError();
                    } else {
                        hls.destroy();
                        const tryNativeFallback = (nIdx: number) => {
                            if (isDestroyed) return;
                            video.src = getProxiedUrl(channel.url, nIdx);
                            video.play().catch(() => {
                                if (nIdx < maxProxyIndex) tryNativeFallback(nIdx + 1);
                                else {
                                    setError('Playback error. Stream format unsupported.');
                                    setLoading(false);
                                }
                            });
                        };
                        tryNativeFallback(isMixedContent ? 1 : 0);
                    }
                }
            });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            const tryNativePlay = (nIdx: number) => {
                if (isDestroyed) return;
                video.src = getProxiedUrl(channel.url, nIdx);
                video.play().catch(() => {
                    if (nIdx < maxProxyIndex) tryNativePlay(nIdx + 1);
                    else {
                        setError('Playback error. Stream format unsupported.');
                        setLoading(false);
                    }
                });
            };
            tryNativePlay(isMixedContent ? 1 : 0);
            setLoading(false);
        } else {
            setError('HLS not supported in this browser.');
            setLoading(false);
        }
    };

    initHls(isMixedContent ? 1 : 0);
    
    return () => {
        isDestroyed = true;
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }
        if (mpegtsRef.current) {
            mpegtsRef.current.destroy();
            mpegtsRef.current = null;
        }
    };
  }, [channel]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const onPlay = () => { setIsPlaying(true); setLoading(false); setError(''); };
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setLoading(true);
    const onTimeUpdate = () => {
      if (video.duration && !isNaN(video.duration) && video.duration !== Infinity) {
        setProgress((video.currentTime / video.duration) * 100);
        setCurrentTime(formatTime(video.currentTime));
        setTotalTime(formatTime(video.duration));
      } else {
        setProgress(100);
        setCurrentTime('LIVE');
        setTotalTime('∞');
      }
    };
    
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);

    video.addEventListener('playing', onPlay);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTimeUpdate);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    
    return () => {
        video.removeEventListener('playing', onPlay);
        video.removeEventListener('waiting', onWaiting);
        video.removeEventListener('pause', onPause);
        video.removeEventListener('timeupdate', onTimeUpdate);
        document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, []);

  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2,'0')}`;
  };

  const handleInteraction = () => {
    setShowOverlay(true);
    if (overlayTimer.current) clearTimeout(overlayTimer.current);
    overlayTimer.current = setTimeout(() => {
        if (isPlaying) setShowOverlay(false);
    }, 3000);
  };
  
  const togglePlay = () => {
      if (videoRef.current?.paused) videoRef.current.play().catch(()=>{});
      else videoRef.current?.pause();
  };
  
  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      setVolume(val);
      if (videoRef.current) {
          videoRef.current.volume = val;
          videoRef.current.muted = val === 0;
          setIsMuted(val === 0);
      }
  };

  const toggleMute = () => {
      if (!videoRef.current) return;
      const newMuted = !isMuted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
      if (newMuted) setVolume(0);
      else setVolume(0.8);
  };

  const toggleFullscreen = () => {
      if (!document.fullscreenElement) {
          containerRef.current?.requestFullscreen().catch(()=>{});
      } else {
          document.exitFullscreen().catch(()=>{});
      }
  };

  const togglePiP = async () => {
      if (!videoRef.current) return;
      try {
          if (document.pictureInPictureElement) await document.exitPictureInPicture();
          else await videoRef.current.requestPictureInPicture();
      } catch (e) {
          console.error(e);
      }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!videoRef.current || videoRef.current.duration === Infinity) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      videoRef.current.currentTime = pct * videoRef.current.duration;
  };

  const selectQuality = (idx: number) => {
      if (!hlsRef.current) return;
      hlsRef.current.currentLevel = idx;
      setQualityMode(idx === -1 ? 'auto' : idx);
      setShowQualityMenu(false);
  };

  return (
    <div 
        ref={containerRef} 
        className={`relative flex flex-col w-full h-full bg-black overflow-hidden group select-none ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}
        onMouseMove={handleInteraction}
        onMouseLeave={() => isPlaying && setShowOverlay(false)}
        onTouchEnd={() => { setShowOverlay(true); handleInteraction(); }}
        onClick={() => { if(!showOverlay) handleInteraction(); }}
    >
        <video 
            ref={videoRef} 
            className={`w-full h-full ${fillFit ? 'object-cover' : 'object-contain'}`}
            autoPlay 
            playsInline
            onClick={togglePlay}
        />
        
        {!channel && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 z-0">
                <img 
                  src="https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80" 
                  alt="Background Placeholder" 
                  className="absolute inset-0 w-full h-full object-cover opacity-20"
                />
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-20 h-20 bg-teal-500/10 text-teal-500 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md border border-teal-500/20 shadow-[0_0_30px_rgba(20,184,166,0.3)]">
                    <MonitorPlay className="w-10 h-10" />
                  </div>
                  <h3 className="text-3xl font-black text-white mb-2 tracking-wide uppercase">Broadcast Ready</h3>
                  <p className="text-teal-400 font-medium tracking-widest text-sm uppercase">Select a channel to begin</p>
                </div>
            </div>
        )}
        
        {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 z-10 pointer-events-none">
                <div className="animate-spin w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full mb-4 shadow-[0_0_15px_rgba(20,184,166,0.5)]" />
                <h3 className="text-lg font-bold text-white tracking-widest uppercase text-xs">Connecting Signal...</h3>
            </div>
        )}
        
        {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 z-10">
                <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Stream Unavailable</h3>
                <p className="text-slate-400 mb-6 px-4 text-center max-w-sm">{error}</p>
                <button onClick={() => window.location.reload()} className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold transition-colors uppercase tracking-widest text-xs shadow-[0_0_15px_rgba(20,184,166,0.2)]">
                  Retry Connection
                </button>
            </div>
        )}

        {channel && (
        <div className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-300 pointer-events-none z-20 ${showOverlay ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex justify-between items-start p-3 sm:p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-auto">
                <div className="flex items-center gap-3 bg-slate-900/60 backdrop-blur-md px-3.5 py-1.5 sm:py-2 rounded-xl border border-slate-700/50 shadow-lg max-w-[70%]">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                    <span className="font-semibold text-xs sm:text-sm tracking-wide text-white truncate">{channel.name}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="bg-teal-500/20 text-teal-400 border border-teal-500/30 px-2 py-0.5 sm:py-1 rounded text-[9px] sm:text-[10px] font-bold tracking-wider">
                      {hlsRef.current ? 'HLS' : mpegtsRef.current ? 'MPEG-TS' : 'NATIVE'}
                    </span>
                    <button onClick={togglePiP} className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full text-white transition-colors backdrop-blur-sm bg-black/20" title="Picture in Picture">
                        <PictureInPicture className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                </div>
            </div>
            
            <div className="flex-1 flex items-center justify-center pointer-events-auto">
                <button 
                  onClick={togglePlay} 
                  className={`w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white flex items-center justify-center transition-all hover:scale-105 hover:border-teal-400/50 hover:text-teal-400 hover:bg-black/60 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:shadow-[0_0_30px_rgba(20,184,166,0.3)] ${showOverlay ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}
                >
                    {isPlaying ? <Pause className="w-6 h-6 sm:w-8 sm:h-8 fill-current" /> : <Play className="w-6 h-6 sm:w-8 sm:h-8 fill-current ml-1" />}
                </button>
            </div>
            
            <div className="p-3 sm:p-6 bg-gradient-to-t from-slate-950 via-slate-900/80 to-transparent pointer-events-auto flex flex-col gap-2 sm:gap-4">
                <div className="cursor-pointer group/progress px-1" onClick={handleSeek}>
                    <div className="h-1.5 sm:h-2 bg-white/10 rounded-full overflow-hidden transition-all group-hover/progress:h-2.5 shadow-inner">
                        <div className="h-full bg-teal-500 rounded-full transition-all duration-300 ease-linear shadow-[0_0_10px_rgba(20,184,166,0.8)] relative" style={{ width: `${progress}%` }}>
                            <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/50" />
                        </div>
                    </div>
                    <div className="flex justify-between text-[9px] sm:text-[11px] text-white/50 font-bold tracking-wider mt-1.5 sm:mt-2 font-mono">
                        <span>{currentTime}</span>
                        <span>{totalTime}</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-1 sm:gap-2 text-slate-300 overflow-x-auto sm:overflow-visible custom-scrollbar pb-1 sm:pb-0">
                    <button onClick={onPrev} className="p-1.5 sm:p-2 shrink-0 hover:bg-white/10 hover:text-white rounded-full transition-colors flex items-center justify-center"><SkipBack className="w-4 h-4 sm:w-5 sm:h-5 fill-current" /></button>
                    <button onClick={togglePlay} className="p-1.5 sm:p-2 shrink-0 hover:bg-white/10 hover:text-white rounded-full transition-colors flex items-center justify-center">
                        {isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />}
                    </button>
                    <button onClick={onNext} className="p-1.5 sm:p-2 shrink-0 hover:bg-white/10 hover:text-white rounded-full transition-colors flex items-center justify-center"><SkipForward className="w-4 h-4 sm:w-5 sm:h-5 fill-current" /></button>
                    
                    <div className="flex items-center gap-1 sm:gap-2 ml-1 sm:ml-4 bg-white/5 px-2 py-1 rounded-full border border-white/5 shrink-0">
                        <button onClick={toggleMute} className="p-1.5 sm:p-2 hover:text-white transition-colors flex items-center justify-center">
                            {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
                        </button>
                        <input 
                            type="range" min="0" max="1" step="0.01" value={volume} onChange={handleVolume}
                            className="hidden sm:block w-16 sm:w-20 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-teal-400 [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(20,184,166,0.8)]"
                        />
                    </div>
                    
                    <div className="flex-1 min-w-[4px] sm:min-w-0" />
                    
                    {levels.length > 1 && (
                        <div className="relative shrink-0">
                            <button onClick={() => setShowQualityMenu(!showQualityMenu)} className="p-1.5 sm:p-2 hover:bg-white/10 hover:text-white rounded-full transition-colors flex items-center justify-center">
                                <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                            {showQualityMenu && (
                                <div className="absolute bottom-full right-0 mb-4 py-1.5 bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl max-h-56 overflow-y-auto min-w-[140px] z-50 overflow-hidden">
                                    <button 
                                      onClick={() => selectQuality(-1)}
                                      className={`w-full text-left px-5 py-2.5 text-xs font-bold tracking-wide transition-colors ${qualityMode === 'auto' ? 'text-teal-400 bg-teal-500/10' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
                                    >Auto</button>
                                    {levels.map((lvl, idx) => (
                                        <button 
                                          key={idx} 
                                          onClick={() => selectQuality(idx)}
                                          className={`w-full text-left px-5 py-2.5 text-xs font-bold tracking-wide transition-colors ${qualityMode === idx ? 'text-teal-400 bg-teal-500/10' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
                                        >
                                            {lvl.height ? `${lvl.height}p` : `${Math.round((lvl.bitrate || 0) / 1000)}kbps`}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    
                    <button onClick={() => setFillFit(!fillFit)} className={`p-1.5 sm:p-2 shrink-0 rounded-full flex items-center justify-center transition-colors ${fillFit ? 'text-teal-400 bg-teal-500/10' : 'hover:bg-white/10 hover:text-white'}`} title="Fill/Fit">
                        <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    
                    <button onClick={toggleFullscreen} className="p-1.5 sm:p-2 shrink-0 hover:bg-white/10 hover:text-white flex items-center justify-center rounded-full transition-colors" title="Fullscreen">
                        {isFullscreen ? <Minimize className="w-4 h-4 sm:w-5 sm:h-5" /> : <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </button>
                </div>
            </div>
        </div>
        )}
    </div>
  );
}
