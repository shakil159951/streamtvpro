import fs from 'fs';

let content = fs.readFileSync('src/components/Player.tsx', 'utf8');

const brokenRef = `const videoRef = useRef<HTMLVideoElement>
        <style>{\`
            .vjs-error-display { display: none !important; }
            .vjs-modal-dialog { display: none !important; }
        \`}</style>(null);`;

content = content.replace(brokenRef, `const videoRef = useRef<HTMLVideoElement>(null);`);

// insert at the top of the outer div
const outerDivStr = `  return (
    <div 
        ref={containerRef} 
        className={\`relative flex flex-col w-full h-full bg-transparent overflow-hidden group select-none \${isFullscreen ? 'fixed inset-0 z-50' : ''}\`}
        onMouseMove={handleInteraction}
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
    >`;

const replaceWith = outerDivStr + `\n        <style>{\`\n            .vjs-error-display { display: none !important; }\n            .vjs-modal-dialog { display: none !important; }\n        \`}</style>`;

if (content.includes(outerDivStr)) {
    content = content.replace(outerDivStr, replaceWith);
    console.log("Fixed mess");
} else {
    console.log("Could not find outer div");
}

fs.writeFileSync('src/components/Player.tsx', content);

