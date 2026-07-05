const fs = require('fs');
let code = fs.readFileSync('src/components/Player.tsx', 'utf8');

// 1. Remove import
code = code.replace(/import \* as dashjs from 'dashjs';\n/, '');

// 2. Remove refs
code = code.replace(/  const dashRef = useRef<dashjs\.MediaPlayerClass \| null>\(null\);\n/g, '');
code = code.replace(/  const clapprRef = useRef<any>\(null\);\n/g, '');
code = code.replace(/  const clapprContainerRef = useRef<HTMLDivElement>\(null\);\n/g, '');

// 3. State engine types
code = code.replace(/useState<'Default' \| 'Shaka' \| 'Clappr' \| 'dash\.js' \| 'Video\.js'>/, "useState<'Default' | 'Shaka' | 'Video.js'>");
code = code.replace(/const autoEngines = \['Default', 'Shaka', 'Video\.js', 'Clappr'\];/, "const autoEngines = ['Default', 'Shaka', 'Video.js'];");

// 4. Remove destroy blocks from destroyPlayer
code = code.replace(/    if \(dashRef\.current\) \{\s*dashRef\.current\.destroy\(\);\s*dashRef\.current = null;\s*\}\s*/g, '');
code = code.replace(/    if \(clapprRef\.current\) \{\s*clapprRef\.current\.destroy\(\);\s*clapprRef\.current = null;\s*\}\s*/g, '');

code = code.replace(/        if \(dashRef\.current\) \{\s*dashRef\.current\.destroy\(\);\s*dashRef\.current = null;\s*\}\s*/g, '');
code = code.replace(/        if \(clapprRef\.current\) \{\s*clapprRef\.current\.destroy\(\);\s*clapprRef\.current = null;\s*\}\s*/g, '');

// 5. Remove pause/play for clappr
code = code.replace(/      if \(clapprRef\.current && clapprRef\.current\.pause\) \{\s*clapprRef\.current\.pause\(\);\s*\}\s*/g, '');
code = code.replace(/      if \(clapprRef\.current && clapprRef\.current\.play\) \{\s*try \{\s*const p = clapprRef\.current\.play\(\);\s*if \(p && p\.catch\) p\.catch\(\(\) => \{\}\);\s*\} catch\(e\) \{\}\s*\}\s*/g, '');

// 6. Remove initDash and initClappr blocks entirely
code = code.replace(/    const initDash = \(proxyIdx: number\) => \{[\s\S]*?    \};\n\n/g, '');
code = code.replace(/    const initClappr = async \(proxyIdx: number\) => \{[\s\S]*?    \};\n\n/g, '');

// 7. Remove if-else branches in init sequence
code = code.replace(/    \} else if \(activeEngine === 'Clappr'\) \{\s*initClappr\(0\);\s*\}/, '');
code = code.replace(/    \} else if \(isDashExt \|\| activeEngine === 'dash\.js'\) \{\s*initDash\(0\);\s*\}/, '');

// 8. Remove subtitle and audio track changes for dash
code = code.replace(/      \} else if \(dashRef\.current\) \{\s*dashRef\.current\.setTextTrack\(idx\);\s*/, '');
code = code.replace(/      \} else if \(dashRef\.current\) \{\s*const tracks = dashRef\.current\.getTracksFor\('audio'\);\s*if \(tracks && tracks\[idx\]\) dashRef\.current\.setCurrentTrack\(tracks\[idx\]\);\s*/, '');

// 9. Remove clappr div
code = code.replace(/        <div \s*ref=\{clapprContainerRef\}\s*className="w-full h-full absolute inset-0"\s*style=\{\{ display: activeEngine === 'Clappr' && !isDevToolsOpen \? 'block' : 'none' \}\}\s*\/>\s*/g, '');

// 10. Update activeEngine checks
code = code.replace(/activeEngine === 'Clappr' \|\| activeEngine === 'Video\.js'/g, "activeEngine === 'Video.js'");
code = code.replace(/\(activeEngine === 'Clappr' \|\| activeEngine === 'Video\.js'\)/g, "activeEngine === 'Video.js'");

// 11. Update map engine UI
code = code.replace(/\['Default', 'Video\.js', 'Shaka', 'dash\.js', 'Clappr'\]/g, "['Default', 'Video.js', 'Shaka']");

fs.writeFileSync('src/components/Player.tsx', code);
