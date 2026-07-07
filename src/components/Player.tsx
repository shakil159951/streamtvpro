import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import mpegts from 'mpegts.js';
import { Channel } from '../types';
import {
  Play, Pause, Maximize, Minimize, Settings, AlertCircle,
  MonitorPlay, PictureInPicture2, Volume2, VolumeX,
  Subtitles, Music, RefreshCw, SkipForward, SkipBack
} from 'lucide-react';

if (mpegts?.LoggingControl) mpegts.LoggingControl.enableAll = false;

interface PlayerProps {
  channel: Channel | null;
  isDevToolsOpen?: boolean;
}

type StreamType = 'hls' | 'mpegts' | 'dash' | 'direct' | 'unknown';

function detectStreamType(url: string): StreamType {
  const clean = url.split('?')[0].split('#')[0].toLowerCase();
  if (clean.endsWith('.m3u8') || clean.includes('.m3u8')) return 'hls';
  if (clean.endsWith('.ts') || clean.endsWith('.flv')) return 'mpegts';
  if (clean.endsWith('.mpd')) return 'dash';
  if (/\.(mp4|mkv|webm|mov|m4v|ogg|ogv|avi|mp3|aac|flac|wav|m4a)$/.test(clean)) return 'direct';
  return 'unknown';
}

export default function Player({ channel, isDevToolsOpen }: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const mpegtsRef = useRef<any>(null);
  const overlayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => parseFloat(localStorage.getItem('player_volume') || '1'));
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('player_muted') === 'true');
  const [retryTick, setRetryTick] = useState(0);

  // Quality
  const [levels, setLevels] = useState<any[]>([]);
  const [qualityMode, setQualityMode] = useState<number | 'auto'>('auto');
  const [showQualityMenu, setShowQualityMenu] = useState(false);

  // Subtitles & Audio
  const [subtitleTracks, setSubtitleTracks] = useState<{ id: number; label: string }[]>([]);
  const [activeSubtitle, setActiveSubtitle] = useState(-1);
  const [showSubtitles, setShowSubtitles] = useState(false);
  const [audioTracks, setAudioTracks] = useState<{ id: number; label: string }[]>([]);
  const [activeAudio, setActiveAudio] = useState(-1);
  const [showAudio, setShowAudio] = useState(false);

  // Speed
  const [speed, setSpeed] = useState(1);
  const [showSpeed, setShowSpeed] = useState(false);

  // Close menus helper
  const closeMenus = useCallback(() => {
    setShowQualityMenu(false);
    setShowSubtitles(false);
    setShowAudio(false);
    setShowSpeed(false);
  }, []);

  // Reset state when channel changes
  useEffect(() => {
    setSpeed(1);
    closeMenus();
  }, [channel, closeMenus]);

  // Main player initialization
  useEffect(() => {
    if (!channel || !videoRef.current) return;

    setLoading(true);
    setError('');
    setIsPlaying(false);
    setLevels([]);
    setQualityMode('auto');
    setSubtitleTracks([]);
    setActiveSubtitle(-1);
    setAudioTracks([]);
    setActiveAudio(-1);
    closeMenus();

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    if (mpegtsRef.current) { mpegtsRef.current.destroy(); mpegtsRef.current = null; }

    const streamType = detectStreamType(channel.url);
    let isDestroyed = false;
    const getUrl = () => channel.url;

    const initHls = (retryCount = 0) => {
      if (isDestroyed) return;
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      if (!Hls.isSupported()) { initNative(); return; }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 10,
        manifestLoadingMaxRetry: 3,
        manifestLoadingRetryDelay: 1000,
        manifestLoadingMaxRetryTimeout: 10000,
        levelLoadingMaxRetry: 3,
        levelLoadingRetryDelay: 1000,
        fragLoadingMaxRetry: 6,
        fragLoadingRetryDelay: 1000,
        fragLoadingMaxRetryTimeout: 30000,
        testBandwidth: true,
      });
      hlsRef.current = hls;
      hls.loadSource(getUrl());
      if (videoRef.current) hls.attachMedia(videoRef.current);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setLevels(data.levels);
        videoRef.current?.play().catch(() => {});
        setLoading(false);
        setError('');
      });

      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_, data) => {
        if (data.subtitleTracks?.length > 0) {
          setSubtitleTracks(data.subtitleTracks.map(t => ({ id: t.id, label: t.name || t.lang || `Track ${t.id}` })));
        }
      });

      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_, data) => {
        if (data.audioTracks?.length > 0) {
          setAudioTracks(data.audioTracks.map(t => ({ id: t.id, label: t.name || t.lang || `Track ${t.id}` })));
          setActiveAudio(hls.audioTrack);
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          if (retryCount < 2) { setTimeout(() => initHls(retryCount + 1), 1000 * (retryCount + 1)); return; }
          hls.destroy();
          if (streamType === 'unknown' || streamType === 'mpegts') initMpegts();
          else { setError('HLS Network Error'); setLoading(false); }
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          try { hls.recoverMediaError(); } catch { hls.destroy(); if (retryCount < 1) initHls(retryCount + 1); else { setError('HLS Media Error'); setLoading(false); } }
        } else {
          hls.destroy();
          setError('HLS Error');
          setLoading(false);
        }
      });
    };

    const initMpegts = (retryCount = 0) => {
      if (isDestroyed) return;
      if (mpegtsRef.current) { mpegtsRef.current.destroy(); mpegtsRef.current = null; }
      try {
        const player = mpegts.createPlayer(
          { type: 'mpegts', isLive: true, url: getUrl() },
          { enableWorker: true, liveBufferLatencyChasing: true, liveBufferLatencyMaxLatency: 3, liveBufferLatencyMinRemain: 0.3, autoCleanupSourceBuffer: true, autoCleanupMaxBackwardDuration: 30 }
        );
        mpegtsRef.current = player;
        if (videoRef.current) {
          player.attachMediaElement(videoRef.current);
          player.load();
          const pp = player.play() as any;
          if (pp?.catch) pp.catch(() => {});
        }
        player.on(mpegts.Events.ERROR, (_type: any, _detail: any, info: any) => {
          if (retryCount < 2) { setTimeout(() => initMpegts(retryCount + 1), 1000 * (retryCount + 1)); return; }
          const code = info?.code;
          setError(code === 403 || code === 401 || code === 404 ? `Access denied (${code})` : `MPEG-TS Error: ${_type}`);
          setLoading(false);
        });
        player.on(mpegts.Events.MEDIA_INFO, () => { setLoading(false); setError(''); });
      } catch {
        if (retryCount < 1) initMpegts(retryCount + 1);
        else { setError('Stream init failed'); setLoading(false); }
      }
    };

    const initNative = () => {
      if (isDestroyed || !videoRef.current) return;
      const v = videoRef.current;
      const onLoaded = () => { v.removeEventListener('error', onErr); setLoading(false); setError(''); };
      const onErr = () => {
        v.removeEventListener('loadeddata', onLoaded);
        if (streamType !== 'direct' && Hls.isSupported()) initHls();
        else { setError('Stream not supported'); setLoading(false); }
      };
      v.addEventListener('loadeddata', onLoaded, { once: true });
      v.addEventListener('error', onErr, { once: true });
      v.src = getUrl();
      v.play().catch(e => { if (e.name !== 'NotAllowedError' && e.name !== 'AbortError') onErr(); });
    };

    const initShaka = async () => {
      if (!videoRef.current || isDestroyed) return;
      try {
        const shaka = (await import('shaka-player/dist/shaka-player.compiled')).default;
        const player = new shaka.Player(videoRef.current);
        await player.load(getUrl());
        setLoading(false);
        setError('');
        videoRef.current.play().catch(() => {});
      } catch { setError('Shaka Error'); setLoading(false); }
    };

    // Auto-select engine based on stream type
    switch (streamType) {
      case 'hls': Hls.isSupported() ? initHls() : initNative(); break;
      case 'mpegts': mpegts.getFeatureList().mseLivePlayback ? initMpegts() : initNative(); break;
      case 'dash': initShaka(); break;
      case 'direct': initNative(); break;
      default: Hls.isSupported() ? initHls() : mpegts.getFeatureList().mseLivePlayback ? initMpegts() : initNative();
    }

    return () => {
      isDestroyed = true;
      if (overlayTimer.current) clearTimeout(overlayTimer.current);
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      if (mpegtsRef.current) { mpegtsRef.current.destroy(); mpegtsRef.current = null; }
    };
  }, [channel, retryTick, closeMenus]);

  // Video event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => { setIsPlaying(true); setLoading(false); setError(''); };
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setLoading(true);
    const onFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      const s = window.screen as any;
      if (document.fullscreenElement && s?.orientation?.lock) try { s.orientation.lock('landscape').catch(() => {}); } catch {}
      else if (!document.fullscreenElement && s?.orientation?.unlock) try { s.orientation.unlock(); } catch {}
    };
    const onTime = () => {
      setCurrentTime(video.currentTime);
      setDuration(video.duration || 0);
    };

    video.addEventListener('playing', onPlay);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTime);
    video.addEventListener('durationchange', () => setDuration(video.duration || 0));
    document.addEventListener('fullscreenchange', onFsChange);

    return () => {
      video.removeEventListener('playing', onPlay);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', onTime);
      document.removeEventListener('fullscreenchange', onFsChange);
    };
  }, [channel]);

  // DevTools pause handling
  useEffect(() => {
    if (isDevToolsOpen && videoRef.current && !videoRef.current.paused) videoRef.current.pause();
    else if (!isDevToolsOpen && isPlaying && videoRef.current?.paused) videoRef.current.play().catch(() => {});
  }, [isDevToolsOpen, isPlaying]);

  // Volume sync
  useEffect(() => {
    if (videoRef.current) { videoRef.current.volume = volume; videoRef.current.muted = isMuted; }
  }, [channel]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;
      const v = videoRef.current;
      switch (e.key) {
        case ' ': e.preventDefault(); togglePlay(); break;
        case 'ArrowUp': e.preventDefault(); if (v) { const nv = Math.min(1, volume + 0.1); setVolume(nv); v.volume = nv; if (nv > 0 && isMuted) setIsMuted(false); } break;
        case 'ArrowDown': e.preventDefault(); if (v) { const nv = Math.max(0, volume - 0.1); setVolume(nv); v.volume = nv; if (nv === 0) setIsMuted(true); } break;
        case 'ArrowRight': e.preventDefault(); if (v) v.currentTime = Math.min(v.duration, v.currentTime + 10); break;
        case 'ArrowLeft': e.preventDefault(); if (v) v.currentTime = Math.max(0, v.currentTime - 10); break;
        case 'm': case 'M': toggleMute(); break;
        case 'f': case 'F': toggleFullscreen(); break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isMuted, volume]);

  // Actions
  const handleInteraction = () => {
    setShowOverlay(true);
    closeMenus();
    if (overlayTimer.current) clearTimeout(overlayTimer.current);
    overlayTimer.current = setTimeout(() => { if (isPlaying) setShowOverlay(false); }, 3000);
  };

  const togglePlay = () => videoRef.current?.paused ? videoRef.current.play().catch(() => {}) : videoRef.current?.pause();
  const toggleFullscreen = () => !document.fullscreenElement ? containerRef.current?.requestFullscreen().catch(() => {}) : document.exitFullscreen().catch(() => {});
  const togglePiP = async () => {
    if (!videoRef.current) return;
    try { if (document.pictureInPictureElement) await document.exitPictureInPicture(); else await videoRef.current.requestPictureInPicture(); } catch {}
  };
  const toggleMute = () => {
    if (!videoRef.current) return;
    const m = !isMuted;
    videoRef.current.muted = m;
    setIsMuted(m);
    localStorage.setItem('player_muted', m.toString());
    if (!m && volume === 0) { setVolume(1); localStorage.setItem('player_volume', '1'); videoRef.current.volume = 1; }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    localStorage.setItem('player_volume', v.toString());
    if (videoRef.current) {
      videoRef.current.volume = v;
      videoRef.current.muted = v === 0;
      setIsMuted(v === 0);
      localStorage.setItem('player_muted', (v === 0).toString());
    }
  };

  const formatTime = (s: number) => {
    if (!s || isNaN(s) || s === Infinity) return '0:00';
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
    return h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}` : `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const selectQuality = (idx: number) => { if (hlsRef.current) hlsRef.current.currentLevel = idx; setQualityMode(idx === -1 ? 'auto' : idx); setShowQualityMenu(false); };
  const selectSubtitle = (idx: number) => { if (hlsRef.current) hlsRef.current.subtitleTrack = idx; setActiveSubtitle(idx); setShowSubtitles(false); };
  const selectAudio = (idx: number) => { if (hlsRef.current) hlsRef.current.audioTrack = idx; setActiveAudio(idx); setShowAudio(false); };
  const setPlaybackSpeed = (sp: number) => { setSpeed(sp); if (videoRef.current) videoRef.current.playbackRate = sp; setShowSpeed(false); };

  return (
    <div
      ref={containerRef}
      className={`relative flex flex-col w-full h-full bg-black overflow-hidden group select-none ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}
      onMouseMove={handleInteraction}
      onMouseLeave={() => { if (isPlaying && !showQualityMenu && !showSubtitles && !showAudio && !showSpeed) setShowOverlay(false); }}
      onTouchEnd={() => { setShowOverlay(true); handleInteraction(); }}
      onContextMenu={e => { if (import.meta.env.VITE_ENABLE_ANTI_DEBUG !== 'false') e.preventDefault(); }}
      onClick={e => {
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const x = e.clientX - r.left;
        if (e.detail === 2) {
          if (x < r.width / 3 && videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
          else if (x > (r.width * 2) / 3 && videoRef.current) videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10);
          else toggleFullscreen();
        } else {
          if (!showOverlay) handleInteraction();
          else closeMenus();
        }
      }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        autoPlay
        playsInline
        onClick={togglePlay}
      />

      {/* No Channel State */}
      {!channel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-black to-slate-900 z-0">
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-24 h-24 bg-gradient-to-br from-teal-500/20 to-cyan-500/20 rounded-3xl flex items-center justify-center mb-6 border border-teal-500/30 shadow-[0_0_60px_rgba(20,184,166,0.2)]">
              <MonitorPlay className="w-12 h-12 text-teal-400" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Stream TV Pro</h3>
            <p className="text-slate-400 text-sm">Select a channel to start watching</p>
          </div>
        </div>
      )}

      {/* DevTools Warning */}
      {isDevToolsOpen && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-[9999]">
          <div className="text-center p-8">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Security Alert</h3>
            <p className="text-slate-400 text-sm">Developer Tools detected.</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/95 backdrop-blur-xl z-40">
          <div className="bg-slate-900/80 border border-white/10 p-8 rounded-3xl max-w-md w-full text-center shadow-2xl mx-4">
            <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
              <AlertCircle className="w-10 h-10 text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Playback Failed</h3>
            <p className="text-slate-400 text-sm mb-4">Stream may be offline or geo-blocked.</p>
            <div className="bg-red-500/5 border border-red-500/10 rounded-xl px-4 py-3 mb-6">
              <p className="text-slate-400 text-xs font-mono break-words">{error}</p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => { setError(''); setLoading(true); setRetryTick(t => t + 1); }}
                className="px-6 py-3 bg-teal-500 hover:bg-teal-400 text-black rounded-xl text-sm font-bold transition-all flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Retry
              </button>
              <button onClick={() => setError('')} className="px-6 py-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-sm font-semibold border border-white/10">
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && !error && channel && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <div className="w-16 h-16 border-4 border-teal-500/30 border-t-teal-500 rounded-full animate-spin" />
        </div>
      )}

      {/* Player Controls Overlay */}
      {channel && (
        <div className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-300 pointer-events-none z-20 ${showOverlay ? 'opacity-100' : 'opacity-0'}`}>
          {/* Top Bar */}
          <div className="flex justify-between items-center p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-auto">
            <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 max-w-[70%]">
              <span className="font-semibold text-sm text-white truncate">{channel.name}</span>
            </div>
            <button onClick={togglePiP} className="p-2.5 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-white/10 border border-white/10">
              <PictureInPicture2 className="w-5 h-5" />
            </button>
          </div>

          {/* Center Play Button */}
          <div className="flex-1 flex items-center justify-center pointer-events-none">
            {!loading && !error && (
              <button
                onClick={togglePlay}
                className={`pointer-events-auto w-20 h-20 rounded-full bg-black/40 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transition-all hover:scale-110 ${showOverlay ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}
              >
                {isPlaying ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-1" />}
              </button>
            )}
          </div>

          {/* Bottom Controls */}
          <div className="p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent pointer-events-auto">
            {/* Progress Bar (for VOD) */}
            {duration > 0 && duration < Infinity && (
              <div
                className="w-full max-w-4xl mx-auto mb-4 cursor-pointer group/progress"
                onClick={e => {
                  const r = e.currentTarget.getBoundingClientRect();
                  if (videoRef.current) {
                    const t = ((e.clientX - r.left) / r.width) * duration;
                    videoRef.current.currentTime = t;
                    setCurrentTime(t);
                  }
                }}
              >
                <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden group-hover/progress:h-2.5 transition-all">
                  <div className="h-full bg-teal-500 transition-all" style={{ width: `${(currentTime / duration) * 100}%` }} />
                </div>
                <div className="flex justify-between text-xs font-mono text-slate-300 mt-2">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex items-center justify-between max-w-4xl mx-auto">
              <div className="flex items-center gap-4">
                {/* Play/Pause */}
                <button onClick={togglePlay} className="text-white hover:text-teal-400 transition-colors">
                  {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
                </button>

                {/* Skip Buttons */}
                <button onClick={() => { if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10); }} className="text-slate-300 hover:text-white">
                  <SkipBack className="w-5 h-5" />
                </button>
                <button onClick={() => { if (videoRef.current) videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10); }} className="text-slate-300 hover:text-white">
                  <SkipForward className="w-5 h-5" />
                </button>

                {/* Volume */}
                <div className="flex items-center gap-2 group/volume">
                  <button onClick={toggleMute} className="text-slate-300 hover:text-white">
                    {isMuted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-0 opacity-0 group-hover/volume:w-20 group-hover/volume:opacity-100 transition-all cursor-pointer h-1.5 accent-teal-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Speed */}
                {duration > 0 && duration < Infinity && (
                  <div className="relative">
                    <button
                      onClick={e => { e.stopPropagation(); setShowSpeed(!showSpeed); closeMenus(); setShowSpeed(!showSpeed); }}
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${speed !== 1 ? 'text-teal-400 bg-teal-400/20' : 'bg-white/10 text-slate-300'}`}
                    >
                      {speed}x
                    </button>
                    {showSpeed && (
                      <div className="absolute bottom-full right-0 mb-2 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl min-w-[100px] z-50 py-1" onClick={e => e.stopPropagation()}>
                        {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map(sp => (
                          <button key={sp} onClick={() => setPlaybackSpeed(sp)} className={`w-full text-left px-4 py-2 text-xs font-medium ${speed === sp ? 'text-teal-400 bg-teal-400/10' : 'text-slate-300 hover:bg-white/5'}`}>
                            {sp === 1 ? 'Normal' : sp + 'x'}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Subtitles */}
                {subtitleTracks.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={e => { e.stopPropagation(); closeMenus(); setShowSubtitles(!showSubtitles); }}
                      className={`w-9 h-9 rounded-full flex items-center justify-center ${activeSubtitle !== -1 ? 'text-teal-400 bg-teal-400/20' : 'bg-white/10 text-slate-300'}`}
                    >
                      <Subtitles className="w-5 h-5" />
                    </button>
                    {showSubtitles && (
                      <div className="absolute bottom-full right-0 mb-2 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-y-auto min-w-[120px] z-50 py-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => selectSubtitle(-1)} className={`w-full text-left px-4 py-2 text-xs font-medium ${activeSubtitle === -1 ? 'text-teal-400' : 'text-slate-300 hover:bg-white/5'}`}>Off</button>
                        {subtitleTracks.map(t => (
                          <button key={t.id} onClick={() => selectSubtitle(t.id)} className={`w-full text-left px-4 py-2 text-xs font-medium ${activeSubtitle === t.id ? 'text-teal-400' : 'text-slate-300 hover:bg-white/5'}`}>{t.label}</button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Audio Tracks */}
                {audioTracks.length > 1 && (
                  <div className="relative">
                    <button
                      onClick={e => { e.stopPropagation(); closeMenus(); setShowAudio(!showAudio); }}
                      className={`w-9 h-9 rounded-full flex items-center justify-center ${activeAudio !== -1 ? 'text-teal-400 bg-teal-400/20' : 'bg-white/10 text-slate-300'}`}
                    >
                      <Music className="w-5 h-5" />
                    </button>
                    {showAudio && (
                      <div className="absolute bottom-full right-0 mb-2 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-y-auto min-w-[120px] z-50 py-1" onClick={e => e.stopPropagation()}>
                        {audioTracks.map(t => (
                          <button key={t.id} onClick={() => selectAudio(t.id)} className={`w-full text-left px-4 py-2 text-xs font-medium ${activeAudio === t.id ? 'text-teal-400' : 'text-slate-300 hover:bg-white/5'}`}>{t.label}</button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Quality */}
                {levels.length > 1 && (
                  <div className="relative">
                    <button
                      onClick={e => { e.stopPropagation(); closeMenus(); setShowQualityMenu(!showQualityMenu); }}
                      className={`w-9 h-9 rounded-full flex items-center justify-center ${qualityMode !== 'auto' ? 'text-teal-400 bg-teal-400/20' : 'bg-white/10 text-slate-300'}`}
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                    {showQualityMenu && (
                      <div className="absolute bottom-full right-0 mb-2 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-y-auto min-w-[120px] z-50 py-1" onClick={e => e.stopPropagation()}>
                        <button onClick={() => selectQuality(-1)} className={`w-full text-left px-4 py-2 text-xs font-medium ${qualityMode === 'auto' ? 'text-teal-400' : 'text-slate-300 hover:bg-white/5'}`}>Auto</button>
                        {levels.map((l, i) => (
                          <button key={i} onClick={() => selectQuality(i)} className={`w-full text-left px-4 py-2 text-xs font-medium ${qualityMode === i ? 'text-teal-400' : 'text-slate-300 hover:bg-white/5'}`}>
                            {l.height ? `${l.height}p` : `${Math.round((l.bitrate || 0) / 1000)}kbps`}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Fullscreen */}
                <button onClick={toggleFullscreen} className="text-slate-300 hover:text-white">
                  {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
