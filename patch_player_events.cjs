const fs = require('fs');
let code = fs.readFileSync('src/components/Player.tsx', 'utf8');

code = code.replace(
    /player\.on\('error', \(\) => \{/g,
    `player.on('playing', () => { setIsPlaying(true); setLoading(false); setError(''); });
            player.on('play', () => { setIsPlaying(true); setLoading(false); setError(''); });
            player.on('error', () => {`
);

code = code.replace(
    /player\.on\(Clappr\.Events\.PLAYER_ERROR, \(\) => \{/g,
    `player.on(Clappr.Events.PLAYER_PLAY, () => { setIsPlaying(true); setLoading(false); setError(''); });
            player.on(Clappr.Events.PLAYER_ERROR, () => {`
);

fs.writeFileSync('src/components/Player.tsx', code);
