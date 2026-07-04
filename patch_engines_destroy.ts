import fs from 'fs';

let content = fs.readFileSync('src/components/Player.tsx', 'utf8');

// Shaka
const shakaOld = `        try {
            const shaka = (await import('shaka-player/dist/shaka-player.compiled')).default;
            const player = new shaka.Player(videoRef.current);`;
const shakaNew = `        try {
            const shaka = (await import('shaka-player/dist/shaka-player.compiled')).default;
            if (shakaRef.current) {
                await shakaRef.current.destroy();
                shakaRef.current = null;
            }
            const player = new shaka.Player(videoRef.current);`;

// Video.js
const videojsOld = `            // @ts-ignore
            await import('video.js/dist/video-js.css');
            
            // Re-create the video element`;
const videojsNew = `            // @ts-ignore
            await import('video.js/dist/video-js.css');
            
            if (videojsRef.current) {
                videojsRef.current.dispose();
                videojsRef.current = null;
            }
            
            // Re-create the video element`;

// Clappr
const clapprOld = `        try {
            const Clappr = (await import('@clappr/player')).default;
            
            clapprContainerRef.current.innerHTML = '';`;
const clapprNew = `        try {
            const Clappr = (await import('@clappr/player')).default;
            if (clapprRef.current) {
                clapprRef.current.destroy();
                clapprRef.current = null;
            }
            
            clapprContainerRef.current.innerHTML = '';`;

if (content.includes(shakaOld)) { content = content.replace(shakaOld, shakaNew); }
if (content.includes(videojsOld)) { content = content.replace(videojsOld, videojsNew); }
if (content.includes(clapprOld)) { content = content.replace(clapprOld, clapprNew); }

fs.writeFileSync('src/components/Player.tsx', content);
console.log("Patched engines to destroy on retry");
