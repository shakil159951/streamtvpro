import fs from 'fs';

let content = fs.readFileSync('src/components/Player.tsx', 'utf8');

const target = `            let type = 'application/x-mpegURL';
            if (isDashExt) type = 'application/dash+xml';
            else if (ext === 'mp4') type = 'video/mp4';
            else if (ext === 'webm') type = 'video/webm';
            else if (ext === 'ogg') type = 'video/ogg';
            
            const player = videojs(videoEl, {
                controls: true,
                autoplay: true,
                fluid: false,
                errorDisplay: false,
                sources: [{ src: getProxiedUrl(channel.url, proxyIdx), type }]
            });`;

const replace = `            const srcObj: any = { src: getProxiedUrl(channel.url, proxyIdx) };
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
            });`;

content = content.replace(target, replace);
fs.writeFileSync('src/components/Player.tsx', content);
