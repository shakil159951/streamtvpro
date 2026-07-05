const fs = require('fs');
let code = fs.readFileSync('src/components/Player.tsx', 'utf8');

code = code.replace(
    /if \(dashRef\.current\) \{\n\s+dashRef\.current\.destroy\(\);\n\s+dashRef\.current = null;\n\s+\}\n\s+\};\n\s+\}, \[channel, engine, autoEngineIndex, retryTick\]\);/,
    `if (dashRef.current) {
            dashRef.current.destroy();
            dashRef.current = null;
        }
        if (shakaRef.current) {
            shakaRef.current.destroy();
            shakaRef.current = null;
        }
        if (videojsRef.current) {
            videojsRef.current.dispose();
            videojsRef.current = null;
        }
        if (clapprRef.current) {
            clapprRef.current.destroy();
            clapprRef.current = null;
        }
    };
  }, [channel, engine, autoEngineIndex, retryTick]);`
);

fs.writeFileSync('src/components/Player.tsx', code);
