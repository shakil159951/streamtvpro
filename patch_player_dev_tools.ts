import fs from 'fs';

let content = fs.readFileSync('src/components/Player.tsx', 'utf8');

const hookTarget = `  useEffect(() => {
    if (!channel || !videoRef.current) return;`;

const devToolsEffect = `
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
`;

content = content.replace(hookTarget, devToolsEffect + '\n' + hookTarget);

const overlayTarget = `{error && (`;
const devToolsOverlay = `
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
`;

content = content.replace(overlayTarget, devToolsOverlay + '\n' + overlayTarget);

const contextMenuTarget = `onMouseMove={handleInteraction}`;
const contextMenuReplace = `onMouseMove={handleInteraction}\n        onContextMenu={(e) => { if (import.meta.env.VITE_ENABLE_ANTI_DEBUG !== 'false') e.preventDefault(); }}`;

content = content.replace(contextMenuTarget, contextMenuReplace);

fs.writeFileSync('src/components/Player.tsx', content);
console.log("Patched Player for anti-debug");

