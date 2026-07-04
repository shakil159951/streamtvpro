import fs from 'fs';

let content = fs.readFileSync('src/components/ChannelLogo.tsx', 'utf8');

const target = `    const initials = useMemo(() => {
        const name = channel.name || '';
        const words = name.trim().split(/[\\s_-]+/);
        if (words.length >= 2) {
            return (words[0][0] + words[1][0]).toUpperCase();
        } else if (name.length >= 2) {
            return name.substring(0, 2).toUpperCase();
        }
        return name.substring(0, 1).toUpperCase();
    }, [channel.name]);`;

const replace = `    const initials = useMemo(() => {
        const name = channel.name || '';
        const cleanName = name.replace(/[^a-zA-Z0-9]/g, '');
        if (cleanName.length >= 2) {
            return cleanName.substring(0, 2).toUpperCase();
        }
        return cleanName.substring(0, 1).toUpperCase();
    }, [channel.name]);`;

if (content.includes(target)) {
    content = content.replace(target, replace);
    fs.writeFileSync('src/components/ChannelLogo.tsx', content);
    console.log("Fixed initials");
} else {
    console.log("Could not find initials target");
}

