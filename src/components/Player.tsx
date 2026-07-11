import React, { useEffect, useRef, useState } from 'react';
import { Channel } from '../types';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import Hls from 'hls.js';

interface PlayerProps {
  channel: Channel | null;
  onClose?: () => void;
  isDevToolsOpen?: boolean;
}

export default function Player({ channel, onClose, isDevToolsOpen }: PlayerProps) {
  const [engine, setEngine] = useState<'Hls.js' | 'Video.js' | 'Native'>('Hls.js');
  const [useProxy, setUseProxy] = useState(false);
  const [playError, setPlayError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const playerRef = useRef<any>(null); // holds videojs or hls.js instance
  const wrapperRef = useRef<HTMLDivElement>(null);
  const failedEngines = useRef<Set<string>>(new Set());
  const loadingTimeoutRef = useRef<any>(null);

  // Reset failed engines and error on channel change
  useEffect(() => {
    failedEngines.current.clear();
    setPlayError(null);
    setIsLoading(true);
  }, [channel?.url]);

  const handlePlayerError = (currentEngine: string, e: any) => {
    if (failedEngines.current.has(currentEngine)) return;
    
    if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    
    // Prevent auto-switching if the error is just an autoplay block by the browser
    if (e && e.name === 'NotAllowedError') {
      console.warn(`[${currentEngine}] Autoplay blocked by browser. Waiting for user interaction.`);
      setIsLoading(false);
      return;
    }
    if (e && e.name === 'AbortError') {
      console.warn(`[${currentEngine}] Play aborted.`);
      return;
    }

    console.warn(`[${currentEngine}] Play error:`, e);
    failedEngines.current.add(currentEngine);
    const order = ['Hls.js', 'Video.js', 'Native'];
    const nextEngine = order.find(eng => !failedEngines.current.has(eng));
    if (nextEngine) {
      console.log(`Auto-switching player engine to ${nextEngine}`);
      setIsLoading(true);
      setEngine(nextEngine as any);
    } else {
      setIsLoading(false);
      setPlayError("The media could not be loaded across all available player engines. The stream might be offline, unsupported, or blocked by CORS.");
    }
  };

  // Initialize and mount player when engine OR channel URL changes
  useEffect(() => {
    if (!wrapperRef.current) return;
    
    const streamUrl = channel ? (useProxy ? '/api/proxy?url=' + encodeURIComponent(channel.url) : channel.url) : '';

    // Clear wrapper
    wrapperRef.current.innerHTML = '';
    
    if (playError) {
       return; // Don't try to mount if all failed
    }

    setIsLoading(true);
    if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);

    // Create new video element
    const videoElement = document.createElement('video');
    videoElement.className = engine === 'Video.js' ? 'video-js vjs-default-skin vjs-big-play-centered' : 'w-full h-full object-contain bg-black';
    videoElement.controls = true;
    videoElement.playsInline = true;
    wrapperRef.current.appendChild(videoElement);

    const handlePlaying = () => {
      setIsLoading(false);
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
    };
    
    videoElement.addEventListener('playing', handlePlaying);
    videoElement.addEventListener('canplay', handlePlaying);
    videoElement.addEventListener('loadeddata', handlePlaying);
    videoElement.addEventListener('timeupdate', () => {
      if (!videoElement.paused) {
        handlePlaying();
      }
    });
    videoElement.addEventListener('waiting', () => {
      setIsLoading(true);
    });

    // 20 seconds timeout to switch engine if it gets stuck loading initially
    loadingTimeoutRef.current = setTimeout(() => {
       console.warn(`[${engine}] Timeout waiting for playback. Forcing error.`);
       handlePlayerError(engine, new Error('Playback timeout'));
    }, 20000);

    if (engine === 'Native') {
      playerRef.current = videoElement;
      
      videoElement.addEventListener('error', (e) => handlePlayerError('Native', e));

      if (channel) {
        videoElement.src = streamUrl;
        videoElement.play().catch(e => handlePlayerError('Native', e));
      }
    } else if (engine === 'Hls.js') {
      const isProbablyNotHls = channel ? channel.url.toLowerCase().match(/\.(mp4|webm|ogg)$/i) : false;
      
      if (Hls.isSupported() && !isProbablyNotHls) {
        const hls = new Hls({
          debug: false,
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90
        });
        playerRef.current = hls;
        hls.attachMedia(videoElement);
        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            handlePlayerError('Hls.js', data);
          } else if (isLoading && data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            handlePlayerError('Hls.js', new Error('Initial network error'));
          }
        });

        if (channel) {
          hls.loadSource(streamUrl);
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            videoElement.play().catch(e => handlePlayerError('Hls.js', e));
          });
        }
      } else if (videoElement.canPlayType('application/vnd.apple.mpegurl') || isProbablyNotHls) {
        // Fallback to native for Safari or if the file is likely a direct video file
        playerRef.current = videoElement;
        videoElement.addEventListener('error', (e) => handlePlayerError('Hls.js', e));
        if (channel) {
          videoElement.src = streamUrl;
          videoElement.addEventListener('loadedmetadata', () => {
            videoElement.play().catch(e => handlePlayerError('Hls.js', e));
          });
        }
      } else {
         // If HLS.js is not supported (e.g. no MSE) and Native is not supported, just trigger error to switch
         handlePlayerError('Hls.js', new Error('HLS not supported on this browser'));
      }
    } else {
      // Video.js
      videojs.log.level('off');
      const player = videojs(videoElement, {
        controls: true,
        autoplay: true,
        preload: 'auto',
        fluid: false,
        fill: true,
        responsive: true
      });
      playerRef.current = player;
      
      player.on('error', (e: any) => handlePlayerError('Video.js', e));
      player.on('playing', handlePlaying);
      player.on('canplay', handlePlaying);
      player.on('loadeddata', handlePlaying);
      player.on('timeupdate', () => {
        if (!player.paused()) {
          handlePlaying();
        }
      });
      player.on('waiting', () => setIsLoading(true));

      player.ready(() => {
        if (channel) {
          const url = channel.url.toLowerCase();
          let type: string | undefined = undefined;
          if (url.includes('.mp4')) type = 'video/mp4';
          else if (url.includes('.webm')) type = 'video/webm';
          else if (url.includes('.ogg')) type = 'video/ogg';
          else type = 'application/x-mpegURL'; // Default to HLS for unknown extensions like typical IPTV links
          
          if (type) {
             player.src({ src: streamUrl, type });
          } else {
             player.src({ src: streamUrl });
          }
          
          setTimeout(() => {
              const playPromise = player.play();
              if (playPromise !== undefined) {
                  playPromise.catch((e: any) => handlePlayerError('Video.js', e));
              }
          }, 100);
        }
      });
    }

    return () => {
      if (loadingTimeoutRef.current) clearTimeout(loadingTimeoutRef.current);
      if (engine === 'Native' || (engine === 'Hls.js' && !(playerRef.current instanceof Hls))) {
        if (playerRef.current && playerRef.current instanceof HTMLVideoElement) {
           playerRef.current.removeAttribute('src');
           playerRef.current.load();
        }
        if (wrapperRef.current) wrapperRef.current.innerHTML = '';
      } else if (engine === 'Hls.js') {
        if (playerRef.current instanceof Hls) {
          playerRef.current.destroy();
        }
        if (wrapperRef.current) wrapperRef.current.innerHTML = '';
      } else {
        if (playerRef.current && typeof playerRef.current.dispose === 'function') {
          try {
            playerRef.current.dispose();
          } catch(e) {}
        }
        if (wrapperRef.current) wrapperRef.current.innerHTML = '';
      }
      playerRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, channel?.url, playError, useProxy]); 

  return (
    <div className="relative w-full h-full bg-black">
      <div className="absolute top-4 right-4 z-50 flex gap-2 pointer-events-auto items-center">
        <label className="flex items-center gap-1.5 text-xs font-bold text-white bg-black/80 border border-white/20 rounded px-3 py-1.5 cursor-pointer hover:bg-black">
          <input 
            type="checkbox" 
            checked={useProxy}
            onChange={(e) => {
              setUseProxy(e.target.checked);
              failedEngines.current.clear();
              setPlayError(null);
            }}
            className="accent-primary"
          />
          Proxy Stream
        </label>
        <select 
          value={engine} 
          onChange={e => {
            failedEngines.current.clear();
            setPlayError(null);
            setEngine(e.target.value as any);
          }}
          className="bg-black/80 text-white border border-white/20 rounded px-3 py-1.5 text-xs font-bold outline-none"
        >
          <option value="Hls.js">Hls.js (Recommended)</option>
          <option value="Video.js">Video.js</option>
          <option value="Native">Browser Native</option>
        </select>
      </div>
      
      <div 
        ref={wrapperRef} 
        className="absolute inset-0 w-full h-full flex items-center justify-center [&_.video-js]:!w-full [&_.video-js]:!h-full [&_.vjs-tech]:!object-contain"
      />

      {playError && channel && (
        <div className="absolute inset-0 bg-black flex flex-col gap-3 items-center justify-center text-red-400 z-10 pointer-events-none p-6 text-center">
           <svg className="w-12 h-12 mb-2 text-red-500/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
           </svg>
           <p className="font-bold">Playback Error</p>
           <p className="text-sm text-red-400/80 max-w-md">{playError}</p>
        </div>
      )}

      {isLoading && !playError && channel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20 bg-black/80 backdrop-blur-sm">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin shadow-[0_0_15px_rgba(20,184,166,0.3)] mb-4"></div>
          <p className="text-primary font-bold animate-pulse tracking-widest text-xs uppercase">Loading Stream...</p>
        </div>
      )}

      {!channel && (
        <div className="absolute inset-0 bg-black flex items-center justify-center text-slate-500 z-10 pointer-events-none">
           <p>No channel selected</p>
        </div>
      )}
    </div>
  );
}
