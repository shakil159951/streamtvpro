const fs = require('fs');
let code = fs.readFileSync('src/components/Player.tsx', 'utf8');

code = code.replace(
    /if \(engine === 'Auto' && autoEngineIndex < autoEngines\.length - 1\) \{\n\s+const nextEngine = autoEngines\[autoEngineIndex \+ 1\];\n\s+setError\(`Stream failed\. Auto-switching to \$\{nextEngine\} player\.\.\.`\);\n\s+setLoading\(true\);\n\s+if \(!isDestroyed\) setAutoEngineIndex\(prev => prev \+ 1\);\n\s+\} else \{/,
    `if (engine === 'Auto' && autoEngineIndex < autoEngines.length - 1) {
            const nextEngine = autoEngines[autoEngineIndex + 1];
            setLoading(true);
            if (!isDestroyed) setAutoEngineIndex(prev => prev + 1);
        } else {`
);

fs.writeFileSync('src/components/Player.tsx', code);
