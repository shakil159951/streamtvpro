import fs from 'fs';

let content = fs.readFileSync('src/components/ChannelLogo.tsx', 'utf8');

const target = `            if (customLogo) {
                newSources.push(customLogo);
            }
            if (channel.logo && channel.logo !== customLogo) {
                newSources.push(channel.logo);
            }

            if (!customLogo) {
                try {
                    const urlObj = new URL(channel.url);
                    const domain = urlObj.hostname;
                    if (domain && domain !== 'localhost' && !domain.match(/^\\d+\\.\\d+\\.\\d+\\.\\d+$/)) {
                        newSources.push(\`https://www.google.com/s2/favicons?domain=\${domain}&sz=128\`);
                        newSources.push(\`https://icons.duckduckgo.com/ip3/\${domain}.ico\`);
                        newSources.push(\`https://logo.clearbit.com/\${domain}\`);
                    }
                } catch (e) {
                    // Ignore invalid URLs
                }
            }`;

const replace = `            if (customLogo) {
                newSources.push(customLogo);
            }
            if (channel.logo && channel.logo !== customLogo) {
                newSources.push(channel.logo);
            }`;

if (content.includes(target)) {
    content = content.replace(target, replace);
    fs.writeFileSync('src/components/ChannelLogo.tsx', content);
    console.log("Removed broken favicon fallback");
} else {
    console.log("Target not found. Will try a looser replacement.");
    // Try looser replacement if exact match fails
    const effectTarget = `        if (customLogo === 'none') {
            // Do not push any sources, force avatar
        } else {
            if (customLogo) {
                newSources.push(customLogo);
            }
            if (channel.logo && channel.logo !== customLogo) {
                newSources.push(channel.logo);
            }`;
            
    const fullEffectReplace = `        if (customLogo === 'none') {
            // Do not push any sources, force avatar
        } else {
            if (customLogo) {
                newSources.push(customLogo);
            }
            if (channel.logo && channel.logo !== customLogo) {
                newSources.push(channel.logo);
            }
        }`;
    
    // We'll just replace the whole useEffect body
    const fullEffectTarget = content.substring(content.indexOf('useEffect(() => {', content.indexOf('const newSources: string[] = [];') - 50), content.indexOf('    }, [channel.logo, channel.url, customLogo]);') + 48);
    
    if (fullEffectTarget) {
        const fixedEffect = `    useEffect(() => {
        const newSources: string[] = [];
        
        if (customLogo === 'none') {
            // Do not push any sources, force avatar
        } else {
            if (customLogo) {
                newSources.push(customLogo);
            }
            if (channel.logo && channel.logo !== customLogo) {
                newSources.push(channel.logo);
            }
        }

        let startIdx = 0;
        while (startIdx < newSources.length && CACHE[newSources[startIdx]] === false) {
            startIdx++;
        }
        
        setSources(newSources);
        setCurrentSrcIndex(startIdx);
        setStatus(startIdx < newSources.length ? 'loading' : 'avatar');
        setHasFadedIn(false);
    }, [channel.logo, channel.url, customLogo]);`;
        
        content = content.replace(fullEffectTarget, fixedEffect);
        fs.writeFileSync('src/components/ChannelLogo.tsx', content);
        console.log("Replaced full effect body to remove favicons");
    }
}
