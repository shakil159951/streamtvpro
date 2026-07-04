import fs from 'fs';

let content = fs.readFileSync('src/components/Player.tsx', 'utf8');

const targetStr = `        dashRef.current = dashPlayer;
        
        dashPlayer.on(dashjs.MediaPlayer.events.ERROR, (e: any) => {`;

const replacementStr = `        dashRef.current = dashPlayer;
        
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
        });
        
        dashPlayer.on(dashjs.MediaPlayer.events.ERROR, (e: any) => {`;

const initTarget = `dashPlayer.initialize(videoRef.current as HTMLMediaElement, getProxiedUrl(channel.url, proxyIdx), true);`;
const initReplacement = `dashPlayer.initialize(videoRef.current as HTMLMediaElement, channel.url, true);`;

if (content.includes(targetStr) && content.includes(initTarget)) {
    content = content.replace(targetStr, replacementStr);
    content = content.replace(initTarget, initReplacement);
    fs.writeFileSync('src/components/Player.tsx', content);
    console.log("Patched DASH");
} else {
    console.log("Could not find DASH target strings");
}
