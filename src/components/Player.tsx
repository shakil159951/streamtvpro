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
  Volume2, VolumeX, Subtitles, Music, ExternalLink
} from 'lucide-react';

interface PlayerProps {
  channel: Channel | null;
  isDevToolsOpen?: boolean;
}

export default function Player({ channel, isDevToolsOpen }: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const mpegtsRef = useRef<any>(null);
  const dashRef = useRef<dashjs.MediaPlayerClass | null>(null);
  const shakaRef = useRef<any>(null);
  const videojsRef = useRef<any>(null);
  const videojsContainerRef = useRef<HTMLDivElement>(null);
  const clapprRef = useRef<any>(null);
  const clapprContainerRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
  const [detectedExt, setDetectedExt] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);

  const [audioTracks, setAudioTracks] = useState<{id: number, label: string}[]>([]);
  const [activeAudioTrack, setActiveAudioTrack] = useState<number>(-1);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  
  const [engine, setEngine] = useState<'Auto' | 'Shaka' | 'Clappr' | 'dash.js' | 'Video.js'>('Auto');
  const [autoEngineIndex, setAutoEngineIndex] = useState(0);
  const [retryTick, setRetryTick] = useState(0);
  
  const autoEngines = ['Default', 'Shaka', 'Video.js', 'Clappr'];
  const activeEngine = engine === 'Auto' ? (autoEngines[autoEngineIndex] || 'Default') : engine;
  
  const overlayTimer = useRef<NodeJS.Timeout | null>(null);
  const hasResumed = useRef(false);

  useEffect(() => {
    setAutoEngineIndex(0);
    setPlaybackSpeed(1);
    setDetectedExt(null);
    
    if (channel) {
        const cleanUrl = channel.url.split('?')[0].split('#')[0];
        const currentExt = (cleanUrl.split('.').pop() || '').toLowerCase();
        // If no recognizable extension, try to probe headers
        if (!['mp4', 'mkv', 'webm', 'm3u8', 'mpd', 'ts', 'flv'].includes(currentExt)) {
             let active = true;
             fetch(channel.url, { method: 'HEAD' })
                .catch(() => fetch(`/api/proxy?url=${encodeURIComponent(channel.url)}`, { method: 'HEAD' }))
                .then(res => {
                    if (active && res && res.headers) {
                        const ct = res.headers.get('content-type') || '';
                        if (ct.includes('mpegurl') || ct.includes('m3u8')) setDetectedExt('m3u8');
                        else if (ct.includes('dash') || ct.includes('mpd')) setDetectedExt('mpd');
                        else if (ct.includes('mp4')) setDetectedExt('mp4');
                        else if (ct.includes('webm')) setDetectedExt('webm');
                        else if (ct.includes('matroska')) setDetectedExt('mkv');
                        else if (ct.includes('video/mp2t')) setDetectedExt('ts');
                    }
                }).catch(() => {});
             return () => { active = false; };
        }
    }
  }, [channel, engine]);


  useEffect(() => {
    if (isDevToolsOpen) {
      if (videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
      }
      if (clapprRef.current && clapprRef.current.pause) {
          clapprRef.current.pause();
      }
      if (videojsRef.current && videojsRef.current.pause) {
          videojsRef.current.pause();
      }
    } else if (isPlaying) {
      if (videoRef.current && videoRef.current.paused) {
          videoRef.current.play().catch(()=>{});
      }
      if (clapprRef.current && clapprRef.current.play) {
          clapprRef.current.play();
      }
      if (videojsRef.current && videojsRef.current.play) {
          videojsRef.current.play();
      }
    }
  }, [isDevToolsOpen, isPlaying]);

  useEffect(() => {
    if (!channel || !videoRef.current) return;
    const video = videoRef.current;
    
    setLoading(true);
    setError(prev => prev.includes('Auto-switching') ? prev : '');
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
    if (shakaRef.current) {
        shakaRef.current.destroy();
        shakaRef.current = null;
    }
    if (videojsRef.current) {
        videojsRef.current.dispose();
        videojsRef.current = null;
    }
    if (clapprRef.current) {
        clapprRef.current.destroy();
        clapprRef.current = null;
    }
    
    const cleanUrl = channel.url.split('?')[0].split('#')[0];
    const ext = detectedExt || (cleanUrl.split('.').pop() || '').toLowerCase();
    const directExts = ['mp4', 'mkv', 'webm', 'mov', 'm4v', 'ogg', 'ogv', 'avi', 'wmv', 'flv', 'mp3', 'aac', 'flac', 'wav', 'm4a'];
    const isM3u8Ext = ext === 'm3u8' || channel.url.includes('.m3u8');
    const isDashExt = ext === 'mpd' || channel.url.includes('.mpd');
    const isTsExt = ext === 'ts' || (channel.url.includes('.ts') && !isM3u8Ext && !isDashExt);
    const isDirectExt = directExts.includes(ext);
    
    // Check if the browser natively supports MKV/WebM
    const canPlayMkv = videoRef.current ? videoRef.current.canPlayType('video/x-matroska') !== '' || videoRef.current.canPlayType('video/mkv') !== '' : false;
    const canPlayWebm = videoRef.current ? videoRef.current.canPlayType('video/webm') !== '' : true;
    
    const PROXIES = [
        '',
        window.location.origin + '/api/proxy?url=',
        'https://corsproxy.io/?url=',
        'https://api.allorigins.win/raw?url='
    ];
    const maxProxyIndex = PROXIES.length - 1;
    const getProxiedUrl = (url: string, proxyIdx: number): string => {
        
        if (proxyIdx === 0) return url;
        const p = PROXIES[proxyIdx];
        if (p.includes('/api/proxy?url=')) {
            let resUrl = p + encodeURIComponent(url) + '&rewrite=1';
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
    let isHandlingFailure = false;
    const isMixedContent = window.location.protocol === 'https:' && channel.url.startsWith('http://');

    const handleEngineFailure = (msg: string) => {
        if (isDestroyed || isHandlingFailure) return;
        isHandlingFailure = true;
        if (engine === 'Auto' && autoEngineIndex < autoEngines.length - 1) {
            const nextEngine = autoEngines[autoEngineIndex + 1];
            setError(`Stream failed. Auto-switching to ${nextEngine} player...`);
            setLoading(true);
            if (!isDestroyed) setAutoEngineIndex(prev => prev + 1);
        } else {
            setError(msg);
            setLoading(false);
        }
    };

    const tryNativeFirst = (nIdx: number, isFallback = false) => {
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
                 tryNativeFirst(nIdx + 1, isFallback);
            } else {
                 if (isFallback) {
                     handleEngineFailure('Stream offline or unsupported format.');
                     return;
                 }
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
                     handleEngineFailure('Video format not supported by browser (e.g., MKV), or stream is offline.');
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
        dashPlayer.updateSettings({
            streaming: { 
                retryAttempts: { MPD: 2 },
                liveCatchup: {
                    enabled: true
                }
            }
        });
        dashRef.current = dashPlayer;
        
        dashPlayer.extend("RequestModifier", function () {
            return {
                modifyRequestHeader: function (xhr: any) {
                    return xhr;
                },
                modifyRequestURL: function (url: string) {
                    if (proxyIdx > 0 && !url.includes('/api/proxy')) {
                        return getProxiedUrl(url, proxyIdx);
                    }
                    return url;
                }
            };
        }, true);
        
        dashPlayer.on(dashjs.MediaPlayer.events.ERROR, (e: any) => {
            if (proxyIdx < maxProxyIndex) {
                 initDash(proxyIdx + 1);
            } else {
                 handleEngineFailure('DASH Error: Stream playback failed.');
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
            dashPlayer.initialize(videoRef.current as HTMLMediaElement, channel.url, true);
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
            }, {
                enableWorker: true,
                liveBufferLatencyChasing: true,
                liveBufferLatencyMaxLatency: 3,
                liveBufferLatencyMinRemain: 0.3
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
                        handleEngineFailure('Connection failed. For BDIX / local IPs, please allow "Insecure Content" in your browser Site Settings.');
                    } else {
                        handleEngineFailure('MPEG-TS Error: ' + errorType + ' ' + errorDetail);
                    }
                }
            });
            player.on(mpegts.Events.MEDIA_INFO, () => {
                setLoading(false);
            });
        } catch(e: any) {
            handleEngineFailure('Stream initialization failed: ' + (e.message || 'Invalid format'));
        }
    };

    const initHls = (proxyIdx: number) => {
        if (isDestroyed) return;
        if (hlsRef.current) {
            hlsRef.current.destroy();
        }

        if (!Hls.isSupported()) {
            handleEngineFailure('Stream format unsupported or blocked.');
            return;
        }

        const hls = new Hls({ 
            enableWorker: true, 
            lowLatencyMode: true, 
            backBufferLength: 90,
            liveSyncDurationCount: 3,
            liveMaxLatencyDurationCount: 10,
            manifestLoadingMaxRetry: 2,
            manifestLoadingRetryDelay: 1000,
            levelLoadingMaxRetry: 2,
            fragLoadingMaxRetry: 2
        });
        
        hlsRef.current = hls;
        hls.loadSource(getProxiedUrl(channel.url, proxyIdx)); 
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
                    if (proxyIdx < maxProxyIndex) {
                        initHls(proxyIdx + 1);
                    } else {
                        hls.destroy();
                        handleEngineFailure('HLS Error: Network error.');
                    }
                } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                    hls.recoverMediaError();
                } else {
                    hls.destroy();
                    handleEngineFailure('HLS Error: Media error.');
                }
            }
        });
    };

    const initShaka = async (proxyIdx: number) => {
        if (!videoRef.current) return;
        try {
            const shaka = (await import('shaka-player/dist/shaka-player.compiled')).default;
            if (shakaRef.current) {
                await shakaRef.current.destroy();
                shakaRef.current = null;
            }
            const player = new shaka.Player(videoRef.current);
            shakaRef.current = player;
            player.addEventListener('error', () => { 
                if (proxyIdx < maxProxyIndex) initShaka(proxyIdx + 1);
                else handleEngineFailure('Shaka Player Error'); 
            });
            await player.load(getProxiedUrl(channel.url, proxyIdx));
            setLoading(false);
            if (videoRef.current) videoRef.current.play().catch(()=>{});
        } catch (e) {
            if (proxyIdx < maxProxyIndex) initShaka(proxyIdx + 1);
            else handleEngineFailure('Shaka Player Error');
        }
    };

    const initVideoJs = async (proxyIdx: number) => {
        if (!videojsContainerRef.current) return;
        try {
            const videojs = (await import('video.js')).default;
            // @ts-ignore
            await import('video.js/dist/video-js.css');
            
            // Suppress VideoJS console errors
            if (videojs.log && videojs.log.level) {
                videojs.log.level('off');
            }
            
            if (videojsRef.current) {
                videojsRef.current.dispose();
                videojsRef.current = null;
            }
            
            // Re-create the video element since video.js dispose() destroys it
            videojsContainerRef.current.innerHTML = `
                <video class="video-js vjs-default-skin w-full h-full object-contain" playsinline></video>
            `;
            const videoEl = videojsContainerRef.current.querySelector('video') as HTMLVideoElement;
            
            const srcObj: any = { src: getProxiedUrl(channel.url, proxyIdx) };
            if (isDashExt) srcObj.type = 'application/dash+xml';
            else if (isM3u8Ext) srcObj.type = 'application/x-mpegURL';
            else if (ext === 'mp4') srcObj.type = 'video/mp4';
            else if (ext === 'webm') srcObj.type = 'video/webm';
            else if (ext === 'ogg') srcObj.type = 'video/ogg';

            const player = videojs(videoEl, {
                controls: true,
                autoplay: true,
                fluid: false,
                errorDisplay: false,
                sources: [srcObj]
            });
            videojsRef.current = player;
            player.on('error', () => { 
                const err = player.error();
                const errMsg = err ? `Video.js Error: ${err.message || 'CODE ' + err.code}` : 'Video.js Error';
                if (proxyIdx < maxProxyIndex) initVideoJs(proxyIdx + 1);
                else handleEngineFailure(errMsg); 
            });
            setLoading(false);
        } catch (e) {
            if (proxyIdx < maxProxyIndex) initVideoJs(proxyIdx + 1);
            else handleEngineFailure('Video.js Error');
        }
    };

    const initClappr = async (proxyIdx: number) => {
        if (!clapprContainerRef.current) return;
        try {
            const Clappr = (await import('@clappr/player')).default;
            const player = new Clappr.Player({
                source: getProxiedUrl(channel.url, proxyIdx),
                autoPlay: true,
                width: '100%',
                height: '100%',
                chromeless: false,
                parentId: clapprContainerRef.current
            });
            player.on(Clappr.Events.PLAYER_ERROR, () => { 
                if (proxyIdx < maxProxyIndex) initClappr(proxyIdx + 1);
                else handleEngineFailure('Clappr Error'); 
            });
            clapprRef.current = player;
            setLoading(false);
        } catch (e) {
            if (proxyIdx < maxProxyIndex) initClappr(proxyIdx + 1);
            else handleEngineFailure('Clappr Error');
        }
    };

    if (activeEngine === 'Shaka') {
        initShaka(0);
    } else if (activeEngine === 'Video.js') {
        initVideoJs(0);
    } else if (activeEngine === 'Clappr') {
        initClappr(0);
    } else if (isDashExt || activeEngine === 'dash.js') {
        initDash(0);
    } else if ((isTsExt || ext === 'flv') && mpegts.getFeatureList().mseLivePlayback) {
        initMpegts(0);
    } else if (!isDirectExt && Hls.isSupported()) {
        initHls(0);
    } else {
        tryNativeFirst(0);
    }
    
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
  }, [channel, engine, autoEngineIndex, retryTick]);

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
      setCurrentTime(video.currentTime);
      setDuration(video.duration || 0);

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

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

          switch (e.key) {
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
              case 'ArrowRight':
                  e.preventDefault();
                  skipForward();
                  break;
              case 'ArrowLeft':
                  e.preventDefault();
                  skipBackward();
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
        onContextMenu={(e) => { if (import.meta.env.VITE_ENABLE_ANTI_DEBUG !== 'false') e.preventDefault(); }}
        onMouseLeave={() => { if(isPlaying && !showQualityMenu) setShowOverlay(false); }}
        onTouchEnd={() => { setShowOverlay(true); handleInteraction(); }}
        onClick={(e) => { 
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const x = e.clientX - rect.left;
            if (e.detail === 2) {
                // Double click / tap
                if (x < rect.width / 3) skipBackward();
                else if (x > (rect.width * 2) / 3) skipForward();
                else toggleFullscreen();
            } else {
                if(!showOverlay) handleInteraction(); else { setShowQualityMenu(false); setShowSpeedMenu(false); setShowSubtitleMenu(false); setShowAudioMenu(false); }
            }
        }}
    >
        <style>{`
            .vjs-error-display { display: none !important; }
            .vjs-modal-dialog { display: none !important; }
        `}</style>
        <div 
            ref={videojsContainerRef} 
            className="w-full h-full absolute inset-0 z-0 [&_.video-js]:!w-full [&_.video-js]:!h-full [&_.vjs-error-display]:!hidden" 
            style={{ display: activeEngine === 'Video.js' && !isDevToolsOpen ? 'block' : 'none' }} 
        />
        <div 
            ref={clapprContainerRef} 
            className="w-full h-full absolute inset-0 z-0" 
            style={{ display: activeEngine === 'Clappr' && !isDevToolsOpen ? 'block' : 'none' }} 
        />
        <video 
            ref={videoRef} 
            className="w-full h-full object-contain relative z-10"
            style={{ display: (activeEngine === 'Clappr' || activeEngine === 'Video.js') ? 'none' : 'block' }}
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
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md z-30 pointer-events-none transition-all duration-500">
                <div className="relative flex items-center justify-center mb-6">
                   <div className="absolute inset-0 border-[3px] border-white/5 rounded-full w-16 h-16 blur-[1px]"></div>
                   <div className="animate-spin w-16 h-16 border-[3px] border-primary border-t-transparent border-l-transparent rounded-full shadow-[0_0_20px_rgba(20,184,166,0.4)]" />
                   <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_10px_rgba(20,184,166,0.8)]" />
                   </div>
                </div>
                <h3 className="text-white/80 font-medium tracking-[0.3em] uppercase text-xs animate-pulse">Initializing</h3>
            </div>
        )}
        
        
        {isDevToolsOpen && (
            <div className="absolute inset-0 flex items-center justify-center bg-black z-[9999] pointer-events-auto">
                <div className="text-center p-8">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">Security Alert</h3>
                    <p className="text-slate-400 text-sm">Developer Tools detected. Playback has been temporarily disabled.</p>
                </div>
            </div>
        )}

{error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/95 backdrop-blur-xl z-40 pointer-events-auto transition-all duration-500">
                <div className="bg-slate-900/60 border border-white/10 p-8 rounded-[2rem] max-w-md w-full text-center shadow-[0_0_80px_rgba(0,0,0,0.8)] transform scale-100 animate-in fade-in zoom-in duration-300 mx-4 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500/50 to-transparent"></div>
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20 relative">
                        <div className="absolute inset-0 rounded-full animate-ping bg-red-500/10" style={{ animationDuration: '3s' }}></div>
                        <AlertCircle className="w-10 h-10 text-red-400 relative z-10" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">{error.includes('Auto-switching') ? 'Switching Engine' : 'Playback Failed'}</h3>
                    <p className="text-slate-300 text-sm mb-6 leading-relaxed px-2 font-medium">{error.includes('Auto-switching') ? error : 'The stream is currently offline, unsupported, or geo-blocked.'}</p>
                    
                    {!error.includes('Auto-switching') && (
                        <>
                        <div className="border border-red-500/10 bg-red-500/5 rounded-2xl px-5 py-4 mb-8 shadow-inner text-left overflow-y-auto max-h-32 custom-scrollbar">
                            <p className="text-slate-400 text-xs font-mono break-words leading-relaxed">
                                {error}
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-2">
                            <button 
                                onClick={() => { 
                                    setError(''); 
                                    setLoading(true); 
                                    setAutoEngineIndex(0); 
                                    setRetryTick(t => t + 1); 
                                }}
                                className="w-full sm:w-auto px-8 py-3.5 bg-white text-black hover:bg-slate-200 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-black shadow-lg"
                            >
                                Try Again
                            </button>
                            <button 
                                onClick={() => setError('')}
                                className="w-full sm:w-auto px-8 py-3.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-sm font-semibold transition-colors border border-white/10"
                            >
                                Dismiss
                            </button>
                        </div>
                        </>
                    )}
                </div>
            </div>
        )}

        {channel && (
        <div className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-300 pointer-events-none z-20 ${showOverlay || showQualityMenu ? 'opacity-100' : 'opacity-0'}`}>
            <div className="flex justify-between items-start p-3 sm:p-4 bg-gradient-to-b from-black/80 to-transparent pointer-events-auto">
                <div className="flex items-center gap-3 bg-black/60 glass-card backdrop-blur-md px-3.5 py-1.5 sm:py-2 rounded-xl border border-slate-700/50 shadow-lg max-w-[70%]">
                    <span className="font-semibold text-xs sm:text-sm tracking-wide text-white truncate border-l border-slate-700 pl-3">{channel.name}</span>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center bg-slate-900/90 backdrop-blur-md rounded-full border border-slate-700 p-1 shadow-lg pointer-events-auto">
                        {['Auto', 'Video.js', 'Shaka', 'dash.js', 'Clappr'].map(eng => {
                            let btnClass = 'text-slate-400 hover:text-white';
                            if (engine === 'Auto') {
                                if (eng === 'Auto') {
                                    btnClass = activeEngine === 'Default' ? 'bg-[#52d869] text-black shadow-md' : 'border border-[#52d869] text-[#52d869] bg-[#52d869]/10';
                                } else if (activeEngine === eng) {
                                    btnClass = 'bg-[#52d869] text-black shadow-md';
                                }
                            } else if (engine === eng) {
                                btnClass = 'bg-[#52d869] text-black shadow-md';
                            }
                            
                            return (
                                <button
                                    key={eng}
                                    onClick={(e) => { e.stopPropagation(); setEngine(eng as any); }}
                                    className={`px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-xs font-medium rounded-full transition-all ${btnClass}`}
                                >
                                    {eng}
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex items-center gap-2">
                        <button aria-label="Picture in Picture" onClick={togglePiP} className="p-1.5 sm:p-2 hover:bg-white/10 rounded-full text-white transition-colors backdrop-blur-sm bg-black/20" title="Picture in Picture">
                            <PictureInPicture className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                    </div>
                </div>
            </div>
            
            {!(activeEngine === 'Clappr' || activeEngine === 'Video.js') && (
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
            )}
            
            {!(activeEngine === 'Clappr' || activeEngine === 'Video.js') && (
            <div className="p-4 sm:p-6 bg-gradient-to-t from-black/90 via-black/60 to-transparent pointer-events-auto flex flex-col relative w-full items-center justify-end pb-6">
                
                {/* Progress Bar */}
                {duration > 0 && duration < Infinity && (
                    <div className="w-full max-w-4xl mb-4 group/progress cursor-pointer relative" onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const pos = (e.clientX - rect.left) / rect.width;
                        if (videoRef.current) {
                            videoRef.current.currentTime = pos * duration;
                            setCurrentTime(pos * duration);
                        }
                    }}>
                        <div className="w-full h-1.5 sm:h-2 bg-white/20 rounded-full overflow-hidden transition-all group-hover/progress:h-2 sm:group-hover/progress:h-2.5">
                            <div className="h-full bg-primary relative" style={{ width: `${(currentTime / duration) * 100}%` }}>
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full scale-0 group-hover/progress:scale-100 transition-transform"></div>
                            </div>
                        </div>
                        <div className="flex justify-between text-[10px] sm:text-xs font-semibold text-slate-300 mt-2 font-mono tracking-wide">
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>
                )}
                
                <div className="flex items-center w-full justify-between px-4 sm:px-6 select-none max-w-4xl">
                    <div className="flex items-center gap-4">
                        <button aria-label="Play/Pause" onClick={togglePlay} className="text-slate-300 hover:text-white transition-colors focus:outline-none shrink-0" title={isPlaying ? "Pause" : "Play"}>
                            {isPlaying ? <Pause className="w-5 h-5 sm:w-6 sm:h-6 fill-current" /> : <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />}
                        </button>
                        <div className="flex items-center gap-2 group/volume relative">
                            <button aria-label="Mute/Unmute" onClick={toggleMute} className="text-slate-300 hover:text-white transition-colors focus:outline-none shrink-0" title={isMuted ? "Unmute" : "Mute"}>
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
                        {/* Playback Speed */}
                        {duration > 0 && duration < Infinity && (
                            <div className="relative">
                                <button onClick={(e) => { e.stopPropagation(); setShowSpeedMenu(!showSpeedMenu); setShowSubtitleMenu(false); setShowQualityMenu(false); setShowAudioMenu(false); }} className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full shrink-0 transition-colors flex items-center justify-center font-bold text-[10px] sm:text-xs ${playbackSpeed !== 1 ? 'text-primary bg-primary/20' : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white'}`} title="Playback Speed">
                                    {playbackSpeed}x
                                </button>
                                {showSpeedMenu && (
                                    <div className="absolute bottom-full right-0 mb-2 sm:mb-4 bg-slate-900/95 backdrop-blur-xl border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden min-w-[120px] sm:min-w-[140px] z-50 animate-in fade-in slide-in-from-bottom-2 duration-200 py-1.5 sm:py-2">
                                        <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 mb-1">Speed</div>
                                        {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(speed => (
                                            <button key={speed} onClick={() => { setPlaybackSpeed(speed); if(videoRef.current) videoRef.current.playbackRate = speed; setShowSpeedMenu(false); }} className={`w-full text-left px-5 py-2.5 text-xs font-bold tracking-wide transition-colors ${playbackSpeed === speed ? 'text-primary bg-primary/10' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>
                                                {speed === 1 ? 'Normal' : speed + 'x'}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
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
                        
                        <button aria-label="Toggle Fullscreen" onClick={toggleFullscreen} className="text-slate-300 hover:text-white transition-colors focus:outline-none" title="Fullscreen">
                            {isFullscreen ? <Minimize className="w-5 h-5 sm:w-6 sm:h-6" /> : <Maximize className="w-5 h-5 sm:w-6 sm:h-6" />}
                        </button>
                    </div>
                </div>
            </div>
            )}
        </div>
        )}
    </div>
  );
}
