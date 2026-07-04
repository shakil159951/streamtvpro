import fs from 'fs';

let content = fs.readFileSync('src/components/Player.tsx', 'utf8');

const target = `            const videojs = (await import('video.js')).default;
            // @ts-ignore
            await import('video.js/dist/video-js.css');`;

const replace = `            const videojs = (await import('video.js')).default;
            // @ts-ignore
            await import('video.js/dist/video-js.css');
            
            // Suppress VideoJS console errors
            if (videojs.log && videojs.log.level) {
                videojs.log.level('off');
            }`;

if (content.includes(target)) {
    content = content.replace(target, replace);
    fs.writeFileSync('src/components/Player.tsx', content);
    console.log("Patched VideoJS log level");
} else {
    console.log("Could not find VideoJS target for log level");
}

