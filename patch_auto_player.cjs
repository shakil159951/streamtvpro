const fs = require('fs');
let code = fs.readFileSync('src/components/Player.tsx', 'utf8');

// Replace state
code = code.replace(
    /const \[engine, setEngine\] = useState<'Auto' \| 'Shaka' \| 'Clappr' \| 'dash\.js' \| 'Video\.js'>\('Auto'\);/,
    "const [engine, setEngine] = useState<'Default' | 'Shaka' | 'Clappr' | 'dash.js' | 'Video.js'>('Default');"
);

// Remove autoEngineIndex
code = code.replace(
    /const \[autoEngineIndex, setAutoEngineIndex\] = useState\(0\);\n\s+const autoEngines = \['Default', 'Shaka', 'Video\.js', 'Clappr'\];\n\s+const activeEngine = engine === 'Auto' \? \(autoEngines\[autoEngineIndex\] \|\| 'Default'\) : engine;/,
    "const activeEngine = engine;"
);

// Remove setAutoEngineIndex(0)
code = code.replace(
    /setAutoEngineIndex\(0\);\n/g,
    ""
);

// Fix handleEngineFailure
code = code.replace(
    /if \(engine === 'Auto' && autoEngineIndex < autoEngines\.length - 1\) \{[\s\S]*?\} else \{/,
    "if (false) {"
);

// Fix error UI
code = code.replace(
    /\{error\.includes\('Auto-switching'\) \? 'Switching Engine' : 'Playback Failed'\}/,
    "'Playback Failed'"
);
code = code.replace(
    /\{error\.includes\('Auto-switching'\) \? error : 'The stream is currently offline, unsupported, or geo-blocked\.'\}/,
    "'The stream is currently offline, unsupported, or geo-blocked.'"
);
code = code.replace(
    /\{!error\.includes\('Auto-switching'\) && \(/,
    "{(true) && ("
);

// Update engine selector mapping
code = code.replace(
    /\{\['Auto', 'Video\.js', 'Shaka', 'dash\.js', 'Clappr'\]\.map\(eng => \{[\s\S]*?if \(engine === 'Auto'\) \{[\s\S]*?\} else if \(engine === eng\) \{/,
    `{['Default', 'Video.js', 'Shaka', 'dash.js', 'Clappr'].map(eng => {
                            let btnClass = 'bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white';
                            if (engine === eng) {`
);

fs.writeFileSync('src/components/Player.tsx', code);
