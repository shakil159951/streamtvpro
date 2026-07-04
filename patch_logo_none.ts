import fs from 'fs';

let content = fs.readFileSync('src/components/ChannelLogo.tsx', 'utf8');

const target1 = `        if (customLogo) {
            newSources.push(customLogo);
        }
        if (channel.logo && channel.logo !== customLogo) {
            newSources.push(channel.logo);
        }

        if (!customLogo) {`;

const replace1 = `        if (customLogo === 'none') {
            // Do not push any sources, force avatar
        } else {
            if (customLogo) {
                newSources.push(customLogo);
            }
            if (channel.logo && channel.logo !== customLogo) {
                newSources.push(channel.logo);
            }

            if (!customLogo) {`;

if (content.includes(target1)) {
    content = content.replace(target1, replace1);
    
    // also need to close the brace
    const target2 = `            } catch (e) {
                // Ignore invalid URLs
            }
        }`;
    const replace2 = `            } catch (e) {
                // Ignore invalid URLs
            }
            }
        }`;
    content = content.replace(target2, replace2);
    
    fs.writeFileSync('src/components/ChannelLogo.tsx', content);
    console.log('Patched ChannelLogo none');
} else {
    console.log('Could not find target1');
}

