import fs from 'fs';

let content = fs.readFileSync('src/components/Player.tsx', 'utf8');

const targetStr = `            manifestLoadingRetryDelay: 1000,
            levelLoadingMaxRetry: 2,
            fragLoadingMaxRetry: 2,
            xhrSetup: (xhr, url) => {
                if (proxyIdx > 0) {
                    xhr.open('GET', getProxiedUrl(url, proxyIdx), true);
                }
            }
        });
        
        hlsRef.current = hls;
        hls.loadSource(channel.url);`;

const replacementStr = `            manifestLoadingRetryDelay: 1000,
            levelLoadingMaxRetry: 2,
            fragLoadingMaxRetry: 2
        });
        
        hlsRef.current = hls;
        hls.loadSource(getProxiedUrl(channel.url, proxyIdx));`;

if (content.includes(targetStr)) {
    content = content.replace(targetStr, replacementStr);
    fs.writeFileSync('src/components/Player.tsx', content);
    console.log("Patched HLS");
} else {
    console.log("Could not find HLS target string");
}
