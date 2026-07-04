import fs from 'fs';

let content = fs.readFileSync('src/components/ChannelLogo.tsx', 'utf8');

const effectTarget = `        setSources(newSources);
        setCurrentSrcIndex(0);
        setStatus(newSources.length > 0 ? 'loading' : 'avatar');
        setHasFadedIn(false);
    }, [channel.logo, channel.url, customLogo]);`;

const effectReplace = `        let startIdx = 0;
        while (startIdx < newSources.length && CACHE[newSources[startIdx]] === false) {
            startIdx++;
        }
        
        setSources(newSources);
        setCurrentSrcIndex(startIdx);
        setStatus(startIdx < newSources.length ? 'loading' : 'avatar');
        setHasFadedIn(false);
    }, [channel.logo, channel.url, customLogo]);

    useEffect(() => {
        if (status === 'loading' && sources[currentSrcIndex]) {
            if (CACHE[sources[currentSrcIndex]] === false) {
                handleImageError();
            } else if (CACHE[sources[currentSrcIndex]] === true) {
                setStatus('loaded');
                setHasFadedIn(true);
            }
        }
    }, [currentSrcIndex, status, sources]);`;

if (content.includes(effectTarget)) {
    content = content.replace(effectTarget, effectReplace);
    fs.writeFileSync('src/components/ChannelLogo.tsx', content);
    console.log("Patched cache logic");
} else {
    console.log("Could not find effectTarget");
}

