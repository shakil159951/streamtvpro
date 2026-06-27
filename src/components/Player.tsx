import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import mpegts from 'mpegts.js';
import * as dashjs from 'dashjs';

if (mpegts && mpegts.LoggingControl) {
  mpegts.LoggingControl.enableAll = false;
}

import { Channel } from '../types';
import { 
  Play, Pause, Maximize, Minimize, Settings, AlertCircle, MonitorPlay, PictureInPicture,
  Volume2, VolumeX, RotateCcw, RotateCw, Subtitles, Music, ExternalLink
} from 'lucide-react';

interface PlayerProps {
  channel: Channel | null;
}

export default function Player({ channel }: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const mpegtsRef = useRef<any>(null);
  const dashRef = useRef<dashjs.MediaPlayerClass | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [liveDelay, setLiveDelay] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(() => {
      const saved = localStorage.getItem('player_volume');
      return saved ? parseFloat(saved) : 1;
  });
  const [isMuted, setIsMuted] = useState(() => {
      return localStorage.getItem('player_muted') === 'true';
  });
  
  const [qualityMode, setQualityMode] = useState<number | 'auto'>('auto');
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  
  const [levels, setLevels] = useState<any[]>([]);
  
  // Subtitles & Audio
  const [subtitleTracks, setSubtitleTracks] = useState<{id: number, label: string}[]>([]);
  const [activeSubtitleTrack, setActiveSubtitleTrack] = useState<number>(-1);
  const [showSubtitleMenu, setShowSubtitleMenu] = useState(false);

  const [audioTracks, setAudioTracks] = useState<{id: number, label: string}[]>([]);
  const [activeAudioTrack, setActiveAudioTrack] = useState<number>(-1);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  
  const overlayTimer = useRef<NodeJS.Timeout | null>(null);
  const hasResumed = useRef(false);

  useEffect(() => {
    if (!channel || !videoRef.current) return;
    const video = videoRef.current;
    
    setLoading(true);
    setError('');
    setIsPlaying(false);
    setLevels([]);
    setQualityMode('auto');
    setShowQualityMenu(false);
    setSubtitleTracks([]);
    setActiveSubtitleTrack(-1);
    setShowSubtitleMenu(false);
    setAudioTracks([]);
    setActiveAudioTrack(-1);
    setShowAudioMenu(false);
    hasResumed.current = false;
    
    if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
    }
    if (mpegtsRef.current) {
        mpegtsRef.current.destroy();
        mpegtsRef.current = null;
    }
    if (dashRef.current) {
        dashRef.current.destroy();
        dashRef.current = null;
    }
    
    const cleanUrl = channel.url.split('?')[0].split('#')[0];
    const ext = (cleanUrl.split('.').pop() || '').toLowerCase();
    const directExts = ['mp4', 'mkv', 'webm', 'mov', 'm4v', 'ogg', 'ogv', 'avi', 'wmv', 'flv', 'mp3', 'aac', 'flac', 'wav', 'm4a'];
    const isM3u8Ext = ext === 'm3u8' || channel.url.includes('.m3u8');
    const isDashExt = ext === 'mpd' || channel.url.includes('.mpd');
    const isTsExt = ext === 'ts' || (channel.url.includes('.ts') && !isM3u8Ext && !isDashExt);
    const isDirectExt = directExts.includes(ext);
    
    const PROXIES = [
        '',
        window.location.origin + '/api/proxy?url=',
        'https://corsproxy.io/?',
        'https://api.cors.lol/?url=',
        'https://thingproxy.freeboard.io/fetch/',
        'https://api.codetabs.com/v1/proxy?quest='
    ];
    const maxProxyIndex = PROXIES.length - 1;
    const getProxiedUrl = (url: string, proxyIdx: number): string => {
        if (proxyIdx === 0) return url;
        const p = PROXIES[proxyIdx];
        if (p.includes('/api/proxy?url=')) {
            let resUrl = p + encodeURIComponent(url);
            if (channel.referer) {
                resUrl += `&referer=${encodeURIComponent(channel.referer)}`;
            }
            if (channel.userAgent) {
                resUrl += `&useragent=${encodeURIComponent(channel.userAgent)}`;
            }
            return resUrl;
        }
        if (p.includes('thingproxy') || p.includes('codetabs')) {
            return p + url;
        }
        return p + encodeURIComponent(url);
    };

    let isDestroyed = false;
    const isMixedContent = window.location.protocol === 'https:' && channel.url.startsWith('http://');

    const tryNativeFirst = (nIdx: number) => {
        if (isDestroyed) return;
        const video = videoRef.current;
        if (!video) return;

        let handled = false;

        const handleError = () => {
            if (handled) return;
            handled = true;
            video.removeEventListener('error', handleError);
            video.removeEventListener('loadeddata', handleLoaded);
            if (nIdx < maxProxyIndex) {
                 tryNativeFirst(nIdx + 1);
            } else {
                 // Native failed on all proxies, fallback to Dash/Hls/MpegTS
                 if (isTsExt && mpegts.getFeatureList().mseLivePlayback) {
                     initMpegts(0);
                 } else if (isDashExt) {
                     initDash(0);
                 } else if (isM3u8Ext) {
                     initHls(0);
                 } else if (ext === 'flv' && mpegts.getFeatureList().mseLivePlayback) {
                     initMpegts(0);
                 } else if (isDirectExt) {
                     setError('Video format not supported by browser (e.g., MKV), or stream is offline. Please try a different proxy or use an external player.');
                     setLoading(false);
                 } else {
                     initHls(0); // last resort
                 }
            }
        };

        const handleLoaded = () => {
            if (handled) return;
            handled = true;
            video.removeEventListener('error', handleError);
            video.removeEventListener('loadeddata', handleLoaded);
            setLoading(false);
        };

        video.addEventListener('error', handleError);
        video.addEventListener('loadeddata', handleLoaded);
        video.src = getProxiedUrl(channel.url, nIdx);
        video.play().catch((e) => {
            if (e.name !== 'NotAllowedError' && e.name !== 'AbortError') {
                handleError();
            }
        });
    };

    const initDash = (proxyIdx: number) => {
        if (isDestroyed) return;
        if (dashRef.current) {
            dashRef.current.destroy();
            dashRef.current = null;
        }

        const dashPlayer = dashjs.MediaPlayer().create();
        dashRef.current = dashPlayer;
        
        dashPlayer.on(dashjs.MediaPlayer.events.ERROR, (e: any) => {
            if (proxyIdx < maxProxyIndex) {
                 initDash(proxyIdx + 1);
            } else {
                 setError('DASH Error: Stream playback failed. Retrying in 5s...');
                 setTimeout(() => {
                     if (dashRef.current === dashPlayer) {
                         setError('');
                         setLoading(true);
                         initDash(0);
                     }
                 }, 5000);
            }
        });
        dashPlayer.on(dashjs.MediaPlayer.events.PLAYBACK_PLAYING, () => {
             setLoading(false);
        });
        
        dashPlayer.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
             try {
                 const audioT = dashPlayer.getTracksFor('audio');
                 if (audioT && audioT.length > 0) {
                     setAudioTracks(audioT.map((t: any, i: number) => ({ id: i, label: t.lang || t.roles?.[0] || `Track ${i+1}` })));
                     const currAudio = dashPlayer.getCurrentTrackFor('audio');
                     setActiveAudioTrack(currAudio ? audioT.findIndex((t: any) => t === currAudio) : 0);
                 }
                 const textT = dashPlayer.getTracksFor('text');
                 if (textT && textT.length > 0) {
                     setSubtitleTracks(textT.map((t: any, i: number) => ({ id: i, label: t.lang || t.roles?.[0] || `Track ${i+1}` })));
                 }
             } catch(e) {}
        });

        try {
            dashPlayer.initialize(videoRef.current as HTMLMediaElement, getProxiedUrl(channel.url, proxyIdx), true);
        } catch(e: any) {
            setError('Stream initialization failed: ' + (e.message || 'Invalid DASH format'));
            setLoading(false);
        }
    };

    const initMpegts = (proxyIdx: number) => {
        if (isDestroyed) return;
        if (mpegtsRef.current) {
            mpegtsRef.current.destroy();
        }
        const srcUrl = getProxiedUrl(channel.url, proxyIdx);
        let parsedUrl = srcUrl;
        try {
            parsedUrl = new URL(srcUrl, window.location.href).href;
        } catch(e) {}
        
        try {
            const player = mpegts.createPlayer({
                type: 'mpegts',
                isLive: true,
                url: parsedUrl
            });
            mpegtsRef.current = player;
            if (videoRef.current) {
                player.attachMediaElement(videoRef.current);
                player.load();
                const playPromise = player.play() as any;
                if (playPromise !== undefined && typeof playPromise.catch === 'function') {
                    playPromise.catch(() => {});
                }
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
                    const isIp = /http:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(channel.url);
                    if (isIp && window.location.protocol === 'https:') {
                        setError('Connection failed. For BDIX / local IPs, please allow "Insecure Content" in your browser Site Settings. Cloud proxies cannot reach them.');
                        setLoading(false);
                    } else {
                        setError('MPEG-TS Error: ' + errorType + ' ' + errorDetail + '. Retrying in 5s...');
                        setTimeout(() => {
                            if (mpegtsRef.current === player) {
                                setError('');
                                setLoading(true);
                                initMpegts(0);
                            }
                        }, 5000);
                    }
                }
            });
            player.on(mpegts.Events.MEDIA_INFO, () => {
                setLoading(false);
            });
        } catch(e: any) {
            setError('Stream initialization failed: ' + (e.message || 'Invalid format'));
            setLoading(false);
        }
    };

    const initHls = (proxyIdx: number) => {
        if (isDestroyed) return;
        if (hlsRef.current) {
            hlsRef.current.destroy();
        }

        if (!Hls.isSupported()) {
            setError('Stream format unsupported or blocked.');
            setLoading(false);
            return;
        }

        const hls = new Hls({ 
            enableWorker: true, 
            lowLatencyMode: false, 
            backBufferLength: 90,
            xhrSetup: (xhr, url) => {
                if (proxyIdx > 0) {
                    xhr.open('GET', getProxiedUrl(url, proxyIdx), true);
                }
            }
        });
        
        hlsRef.current = hls;
        hls.loadSource(channel.url); 
        if (videoRef.current) hls.attachMedia(videoRef.current);
        
        hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
            setLevels(data.levels);
            if (videoRef.current) videoRef.current.play().catch(() => {});
            setLoading(false);
        });
        
        hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, (_, data) => {
            if (data.subtitleTracks && data.subtitleTracks.length > 0) {
               setSubtitleTracks(data.subtitleTracks.map(t => ({ id: t.id, label: t.name || t.lang || `Track ${t.id}` })));
               setActiveSubtitleTrack(-1);
            }
        });

        hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, (_, data) => {
            if (data.audioTracks && data.audioTracks.length > 0) {
               setAudioTracks(data.audioTracks.map(t => ({ id: t.id, label: t.name || t.lang || `Track ${t.id}` })));
               setActiveAudioTrack(hls.audioTrack);
            }
        });
        
        hls.on(Hls.Events.ERROR, (_, data) => {
            if (data.fatal) {
                if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                    const response = data.response;
                    if (response && (response.code === 403 || response.code === 401 || response.code === 404)) {
                        hls.destroy();
                        setError(`Stream access denied or not found (${response.code}). Retrying in 5s...`);
                        setTimeout(() => {
                            if (hlsRef.current === hls) {
                                setError('');
                                setLoading(true);
                                initHls(0);
                            }
                        }, 5000);
                        return;
                    }
                    if (proxyIdx < maxProxyIndex) {
                        initHls(proxyIdx + 1);
                    } else {
                        const isIp = /http:\/\/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(channel.url);
                        if (isIp && window.location.protocol === 'https:') {
                             setError('Connection failed. For BDIX or local IP addresses, you must allow "Insecure Content" in your browser\'s Site Settings for this page, as Cloud proxies cannot reach your local network.');
                             setLoading(false);
                        } else {
                             setError('Stream blocked by CORS or network timeout. Retrying in 5s...');
                             setTimeout(() => {
                                 if (hlsRef.current === hls) {
                                     setError('');
                                     setLoading(true);
                                     initHls(0);
                                 }
                             }, 5000);
                        }
                    }
                } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                    hls.recoverMediaError();
                } else {
                    hls.destroy();
                    setError('Playback error. Stream format unsupported.');
                    setLoading(false);
                }
            }
        });
    };

    tryNativeFirst(0);
    
    return () => {
        isDestroyed = true;
        if (overlayTimer.current) clearTimeout(overlayTimer.current);
        if (hlsRef.current) {
            hlsRef.current.destroy();
            hlsRef.current = null;
        }
        if (mpegtsRef.current) {
            mpegtsRef.current.destroy();
            mpegtsRef.current = null;
        }
        if (dashRef.current) {
            dashRef.current.destroy();
            dashRef.current = null;
        }
    };
  }, [channel]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const onPlay = () => { setIsPlaying(true); setLoading(false); setError(''); };
    const onPause = () => setIsPlaying(false);
    const onWaiting = () => setLoading(true);
    
    const onFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      const screenAny = window.screen as any;
      if (isFull && screenAny && screenAny.orientation && screenAny.orientation.lock) {
        try {
          screenAny.orientation.lock('landscape').catch(() => {});
        } catch (e) {}
      } else if (!isFull && screenAny && screenAny.orientation && screenAny.orientation.unlock) {
        try {
          screenAny.orientation.unlock();
        } catch (e) {}
      }
    };

    const onTimeUpdate = () => {
      let delay: number | null = null;
      if (hlsRef.current && typeof hlsRef.current.latency === 'number') {
          delay = hlsRef.current.latency;
      } else if (video.seekable && video.seekable.length > 0) {
          const end = video.seekable.end(video.seekable.length - 1);
          if (end > 0) {
              delay = end - video.currentTime;
          }
      }
      
      setCurrentTime(video.currentTime);
      setDuration(video.duration || 0);

      // Assume stream is live if duration is infinite or extremely long, or if delay is small compared to typical duration
      if (delay !== null && delay >= 0 && (video.duration === Infinity || video.duration > 3600)) {
          setLiveDelay(delay);
      } else if (delay !== null && delay >= 0 && hlsRef.current) {
          setLiveDelay(delay);
      } else {
          setLiveDelay(null);
      }

      // Resume & Save Progress for VODs
      if (video.duration && video.duration < Infinity && channel) {
          if (!hasResumed.current && video.currentTime > 0) {
             hasResumed.current = true;
             const saved = localStorage.getItem(`progress_${channel.uid}`);
             if (saved) {
                const time = parseFloat(saved);
                if (time > 0 && time < video.duration - 15) {
                   video.currentTime = time;
                }
             }
          } else if (hasResumed.current && video.currentTime > 15) {
             localStorage.setItem(`progress_${channel.uid}`, video.currentTime.toString());
          }
      }
    };

    const onDurationChange = () => {
        setDuration(video.duration || 0);
    };

    video.addEventListener('playing', onPlay);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    
    return () => {
        video.removeEventListener('playing', onPlay);
        video.removeEventListener('waiting', onWaiting);
        video.removeEventListener('pause', onPause);
        video.removeEventListener('timeupdate', onTimeUpdate);
        video.removeEventListener('durationchange', onDurationChange);
        document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, [channel]);

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
  
  const seekToLive = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (hlsRef.current && typeof hlsRef.current.liveSyncPosition === 'number') {
          videoRef.current!.currentTime = hlsRef.current.liveSyncPosition;
      } else if (videoRef.current && videoRef.current.seekable.length > 0) {
          videoRef.current.currentTime = videoRef.current.seekable.end(videoRef.current.seekable.length - 1);
      }
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

  const formatTime = (seconds: number) => {
      if (!seconds || isNaN(seconds) || seconds === Infinity) return "0:00";
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      const time = Number(e.target.value);
      if (videoRef.current) {
          videoRef.current.currentTime = time;
          setCurrentTime(time);
      }
  };

  const selectQuality = (idx: number) => {
      if (!hlsRef.current) return;
      hlsRef.current.currentLevel = idx;
      setQualityMode(idx === -1 ? 'auto' : idx);
      setShowQualityMenu(false);
  };

  const selectSubtitle = (idx: number) => {
      if (hlsRef.current) {
          hlsRef.current.subtitleTrack = idx;
      } else if (dashRef.current) {
          dashRef.current.setTextTrack(idx);
      }
      setActiveSubtitleTrack(idx);
      setShowSubtitleMenu(false);
  };

  const selectAudio = (idx: number) => {
      if (hlsRef.current) {
          hlsRef.current.audioTrack = idx;
      } else if (dashRef.current) {
          const tracks = dashRef.current.getTracksFor('audio');
          if (tracks && tracks[idx]) dashRef.current.setCurrentTrack(tracks[idx]);
      }
      setActiveAudioTrack(idx);
      setShowAudioMenu(false);
  };

  useEffect(() => {
      if (videoRef.current) {
          videoRef.current.volume = volume;
          videoRef.current.muted = isMuted;
      }
  }, [channel]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const vol = parseFloat(e.target.value);
      setVolume(vol);
      localStorage.setItem('player_volume', vol.toString());
      if (videoRef.current) {
          videoRef.current.volume = vol;
          videoRef.current.muted = vol === 0;
          setIsMuted(vol === 0);
          localStorage.setItem('player_muted', (vol === 0).toString());
      }
  };

  const toggleMute = () => {
      if (!videoRef.current) return;
      const newMuted = !isMuted;
      videoRef.current.muted = newMuted;
      setIsMuted(newMuted);
      localStorage.setItem('player_muted', newMuted.toString());
      if (!newMuted && volume === 0) {
          setVolume(1);
          localStorage.setItem('player_volume', '1');
          videoRef.current.volume = 1;
      }
  };

  const skipForward = () => {
      if (videoRef.current) {
          videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10);
      }
  };

  const skipBackward = () => {
      if (videoRef.current) {
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
      }
  };

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

          switch (e.key) {
              case 'ArrowRight':
                  skipForward();
                  break;
              case 'ArrowLeft':
                  skipBackward();
                  break;
              case 'ArrowUp':
                  e.preventDefault();
                  if (videoRef.current) {
                      const newVol = Math.min(1, volume + 0.1);
                      setVolume(newVol);
                      localStorage.setItem('player_volume', newVol.toString());
                      videoRef.current.volume = newVol;
                      if (newVol > 0 && isMuted) {
                          setIsMuted(false);
                          videoRef.current.muted = false;
                          localStorage.setItem('player_muted', 'false');
                      }
                  }
                  break;
              case 'ArrowDown':
                  e.preventDefault();
                  if (videoRef.current) {
                      const newVol = Math.max(0, volume - 0.1);
                      setVolume(newVol);
                      localStorage.setItem('player_volume', newVol.toString());
                      videoRef.current.volume = newVol;
                      if (newVol === 0) {
                          setIsMuted(true);
                          videoRef.current.muted = true;
                          localStorage.setItem('player_muted', 'true');
                      }
                  }
                  break;
              case ' ':
                  e.preventDefault();
                  togglePlay();
                  break;
              case 'm':
              case 'M':
                  toggleMute();
                  break;
              case 'f':
              case 'F':
                  toggleFullscreen();
                  break;
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMuted, volume]);

  return (
    <div 
        ref={containerRef} 
        className={`relative flex flex-col w-full h-full bg-transparent overflow-hidden group select-none ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}
        onMouseMove={handleInteraction}
        onMouseLeave={() => { if(isPlaying && !showQualityMenu) setShowOverlay(false); }}
        onTouchEnd={() => { setShowOverlay(true); handleInteraction(); }}
        onClick={() => { if(!showOverlay) handleInteraction(); else setShowQualityMenu(false); }}
    >
        <video 
            ref={videoRef} 
            className="w-full h-full object-contain"
            autoPlay 
            playsInline
            onClick={togglePlay}
        />
        
        {!channel && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-transparent z-0">
                <img 
                  src="https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80" 
                  alt="Background Placeholder" 
                  className="absolute inset-0 w-full h-full object-cover opacity-20"
                />
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-20 h-20 bg-primary-light text-primary rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md border border-primary/20 shadow-[0_0_30px_rgba(0,229,195,0.3)]">
                    <MonitorPlay className="w-10 h-10" />
                  </div>
                  <h3 className="text-3xl font-black text-white mb-2 tracking-wide uppercase">Broadcast Ready</h3>
                  <p className="text-primary font-medium tracking-widest text-sm uppercase">Select a channel to begin</p>
                </div>
            </div>
        )}
        
        {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md z-10 pointer-events-none transition-all duration-500">
                <div className="relative flex items-center justify-center">
                   <div className="absolute inset-0 border-2 border-white/10 rounded-full w-12 h-12"></div>
                   <div className="animate-spin w-12 h-12 border-2 border-primary border-t-transparent border-l-transparent rounded-full shadow-[0_0_15px_rgba(20,184,166,0.3)]" />
                </div>
                <h3 className="mt-6 text-primary font-semibold tracking-[0.25em] uppercase text-[10px] animate-pulse">Connecting</h3>
            </div>
        )}
        
        {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xl z-10 transition-all duration-500">
                <div className="w-16 h-16 bg-red-500/5 border border-red-500/10 text-red-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 tracking-wide">Playback Interrupted</h3>
                <p className="text-slate-400 mb-6 px-4 text-center max-w-sm text-sm leading-relaxed">{error}</p>
                <div className="flex flex-wrap items-center justify-center gap-3 px-4">
                  <a href={`vlc://${channel?.url || ''}`} className="flex items-center gap-2 px-4 py-2.5 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 rounded-xl transition-colors border border-orange-500/30 font-semibold text-sm shadow-lg shadow-orange-500/5">
                    <MonitorPlay className="w-4 h-4" /> Open in VLC
                  </a>
                  <a href={`intent:${channel?.url || ''}#Intent;package=com.mxtech.videoplayer.ad;end`} className="flex items-center gap-2 px-4 py-2.5 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded-xl transition-colors border border-blue-500/30 font-semibold text-sm shadow-lg shadow-blue-500/5 hidden sm:flex">
                    <MonitorPlay className="w-4 h-4" /> MX Player
                  </a>
                  <a href={channel?.url || '#'} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2.5 bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white rounded-xl transition-colors border border-slate-600 font-semibold text-sm">
                    <ExternalLink className="w-4 h-4" /> Open Link
                  </a>
                </div>
            </div>
        )}

        {channel && (
        <div className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-300 pointer-events-none z-20 ${showOverlay || showQualityMenu ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex justify-between items-start p-3 sm:p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-auto">
                <div className="flex items-center gap-3 bg-black/60 glass-card backdrop-blur-md px-3.5 py-1.5 sm:py-2 rounded-xl border border-slate-700/50 shadow-lg max-w-[70%]">
                    {liveDelay !== null && liveDelay > 5 ? (
                        <button onClick={seekToLive} className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded text-[10px] font-bold text-slate-300 transition-colors">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                            -{Math.round(liveDelay)}s
                        </button>
                    ) : (
                        <div className="flex items-center gap-1.5 px-1 py-0.5" title="Live">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                            <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider hidden sm:block">Live</span>
                        </div>
                    )}
                    <span className="font-semibold text-xs sm:text-sm tracking-wide text-white truncate border-l border-slate-700 pl-3">{channel.name}</span>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={togglePiP} className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full text-white transition-colors backdrop-blur-sm bg-black/20" title="Picture in Picture">
                        <PictureInPicture className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                </div>
            </div>
            
            <div className="flex-1 flex items-center justify-center pointer-events-none">
              {!loading && !error && (
                <button 
                  onClick={togglePlay} 
                  className={`pointer-events-auto w-16 h-16 sm:w-24 sm:h-24 rounded-full bg-black/30 backdrop-blur-xl border border-white/10 text-white flex items-center justify-center transition-all duration-500 hover:scale-110 hover:border-primary/50 hover:text-primary hover:bg-black/50 shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:shadow-[0_0_40px_rgba(20,184,166,0.3)] ${showOverlay ? 'scale-100 opacity-100' : 'scale-50 opacity-0 pointer-events-none'}`}
                >
                    {isPlaying ? <Pause className="w-8 h-8 sm:w-10 sm:h-10 fill-current" /> : <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-current ml-1.5" />}
                </button>
              )}
            </div>
            
            <div className="p-4 sm:p-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent pointer-events-auto flex flex-col relative w-full items-center justify-end pb-6">
                {showQualityMenu && levels.length > 1 && (
                    <div className="absolute bottom-full mb-4 right-4 py-1.5 bg-black/80 glass-card backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl max-h-56 overflow-y-auto min-w-[140px] z-50 overflow-hidden pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 mb-1">Quality</div>
                        <button onClick={() => selectQuality(-1)} className={`w-full text-left px-5 py-2.5 text-xs font-bold tracking-wide transition-colors ${qualityMode === 'auto' ? 'text-primary bg-primary/10' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>Auto</button>
                        {levels.map((lvl, idx) => (
                            <button key={idx} onClick={() => selectQuality(idx)} className={`w-full text-left px-5 py-2.5 text-xs font-bold tracking-wide transition-colors ${qualityMode === idx ? 'text-primary bg-primary/10' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
                                {lvl.height ? `${lvl.height}p` : `${Math.round((lvl.bitrate || 0) / 1000)}kbps`}
                            </button>
                        ))}
                    </div>
                )}
                
                {duration > 0 && duration !== Infinity && (
                    <div className="flex items-center gap-3 w-full max-w-4xl px-4 sm:px-6 mb-3 sm:mb-4">
                        <span className="text-xs font-medium text-slate-300 min-w-[40px] text-right">{formatTime(currentTime)}</span>
                        <div className="flex-1 relative flex items-center group/slider h-2 cursor-pointer">
                            <input 
                                type="range" 
                                min="0" 
                                max={duration} 
                                step="0.1"
                                value={currentTime} 
                                onChange={handleSeek}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                                <div 
                                    className="h-full bg-primary rounded-full relative"
                                    style={{ width: `${(currentTime / duration) * 100}%` }}
                                />
                            </div>
                            <div 
                                className="absolute h-3 w-3 sm:h-4 sm:w-4 bg-white rounded-full shadow transition-transform scale-0 group-hover/slider:scale-100 -ml-1.5 sm:-ml-2 pointer-events-none"
                                style={{ left: `${(currentTime / duration) * 100}%` }}
                            />
                        </div>
                        <span className="text-xs font-medium text-slate-300 min-w-[40px]">{formatTime(duration)}</span>
                    </div>
                )}
                
                <div className="flex items-center w-full justify-between px-4 sm:px-6 select-none max-w-4xl">
                    <div className="flex items-center gap-4">
                        {duration > 0 && duration !== Infinity && (
                            <>
                                <button onClick={togglePlay} className="text-slate-300 hover:text-white transition-colors focus:outline-none shrink-0" title={isPlaying ? "Pause" : "Play"}>
                                    {isPlaying ? <Pause className="w-5 h-5 sm:w-6 sm:h-6 fill-current" /> : <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />}
                                </button>
                                <button onClick={skipBackward} className="text-slate-300 hover:text-white transition-colors focus:outline-none shrink-0" title="Skip Backward 10s">
                                    <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                                <button onClick={skipForward} className="text-slate-300 hover:text-white transition-colors focus:outline-none shrink-0" title="Skip Forward 10s">
                                    <RotateCw className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                            </>
                        )}
                        <div className="flex items-center gap-2 group/volume relative">
                            <button onClick={toggleMute} className="text-slate-300 hover:text-white transition-colors focus:outline-none shrink-0" title={isMuted ? "Unmute" : "Mute"}>
                                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5 sm:w-6 sm:h-6" /> : <Volume2 className="w-5 h-5 sm:w-6 sm:h-6" />}
                            </button>
                            <input 
                                type="range" 
                                min="0" 
                                max="1" 
                                step="0.05"
                                value={isMuted ? 0 : volume} 
                                onChange={handleVolumeChange}
                                className="w-0 opacity-0 group-hover/volume:w-16 group-hover/volume:opacity-100 sm:w-16 sm:opacity-100 transition-all duration-300 cursor-pointer h-1.5 focus:outline-none accent-primary"
                            />
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 sm:gap-4 shrink-0 transition-opacity duration-300">
                        {subtitleTracks.length > 0 && (
                            <div className="relative">
                                <button onClick={(e) => { e.stopPropagation(); setShowSubtitleMenu(!showSubtitleMenu); setShowQualityMenu(false); setShowAudioMenu(false); }} className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full shrink-0 transition-colors flex items-center justify-center focus:outline-none ${activeSubtitleTrack !== -1 ? 'text-primary bg-primary/20' : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white'}`} title="Subtitles">
                                    <Subtitles className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                                {showSubtitleMenu && (
                                    <div className="absolute bottom-full mb-4 right-0 py-1.5 bg-black/80 glass-card backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl max-h-56 overflow-y-auto min-w-[140px] z-50 overflow-hidden pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                                        <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 mb-1">Subtitles</div>
                                        <button onClick={() => selectSubtitle(-1)} className={`w-full text-left px-5 py-2.5 text-xs font-bold tracking-wide transition-colors ${activeSubtitleTrack === -1 ? 'text-primary bg-primary/10' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>Off</button>
                                        {subtitleTracks.map((t) => (
                                            <button key={t.id} onClick={() => selectSubtitle(t.id)} className={`w-full text-left px-5 py-2.5 text-xs font-bold tracking-wide transition-colors ${activeSubtitleTrack === t.id ? 'text-primary bg-primary/10' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {audioTracks.length > 1 && (
                            <div className="relative">
                                <button onClick={(e) => { e.stopPropagation(); setShowAudioMenu(!showAudioMenu); setShowQualityMenu(false); setShowSubtitleMenu(false); }} className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full shrink-0 transition-colors flex items-center justify-center focus:outline-none ${activeAudioTrack !== -1 ? 'text-primary bg-primary/20' : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white'}`} title="Audio Track">
                                    <Music className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                                {showAudioMenu && (
                                    <div className="absolute bottom-full mb-4 right-0 py-1.5 bg-black/80 glass-card backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl max-h-56 overflow-y-auto min-w-[140px] z-50 overflow-hidden pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                                        <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 mb-1">Audio Track</div>
                                        {audioTracks.map((t) => (
                                            <button key={t.id} onClick={() => selectAudio(t.id)} className={`w-full text-left px-5 py-2.5 text-xs font-bold tracking-wide transition-colors ${activeAudioTrack === t.id ? 'text-primary bg-primary/10' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
                                                {t.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {levels.length > 1 && (
                            <div className="relative">
                                <button onClick={(e) => { e.stopPropagation(); setShowQualityMenu(!showQualityMenu); setShowSubtitleMenu(false); setShowAudioMenu(false); }} className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full shrink-0 transition-colors flex items-center justify-center focus:outline-none ${qualityMode !== 'auto' ? 'text-primary bg-primary/20' : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white'}`} title="Quality Settings">
                                    <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
                                </button>
                                {showQualityMenu && (
                                    <div className="absolute bottom-full mb-4 right-0 py-1.5 bg-black/80 glass-card backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl max-h-56 overflow-y-auto min-w-[140px] z-50 overflow-hidden pointer-events-auto" onClick={(e) => e.stopPropagation()}>
                                        <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 mb-1">Quality</div>
                                        <button onClick={() => selectQuality(-1)} className={`w-full text-left px-5 py-2.5 text-xs font-bold tracking-wide transition-colors ${qualityMode === 'auto' ? 'text-primary bg-primary/10' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>Auto</button>
                                        {levels.map((lvl, idx) => (
                                            <button key={idx} onClick={() => selectQuality(idx)} className={`w-full text-left px-5 py-2.5 text-xs font-bold tracking-wide transition-colors ${qualityMode === idx ? 'text-primary bg-primary/10' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
                                                {lvl.height ? `${lvl.height}p` : `${Math.round((lvl.bitrate || 0) / 1000)}kbps`}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        
                        <button onClick={toggleFullscreen} className="text-slate-300 hover:text-white transition-colors focus:outline-none" title="Fullscreen">
                            {isFullscreen ? <Minimize className="w-5 h-5 sm:w-6 sm:h-6" /> : <Maximize className="w-5 h-5 sm:w-6 sm:h-6" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
        )}
    </div>
  );
}
