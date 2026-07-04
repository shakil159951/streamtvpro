const fs = require('fs');
let code = fs.readFileSync('src/components/Player.tsx', 'utf8');

code = code.replace(
    /if \(canPlayNativeHls && \(isM3u8Ext \|\| !isDirectExt\)\) \{\n\s+\/\/ Prefer native playback on devices that support it \(Safari, iOS, Android Chrome\) to bypass CORS issues\n\s+tryNativeFirst\(0\);\n\s+\} else if \(!isDirectExt && Hls\.isSupported\(\)\) \{\n\s+initHls\(0\);\n\s+\} else \{/,
    `if (!isDirectExt && Hls.isSupported()) {
            initHls(0);
        } else if (canPlayNativeHls && (isM3u8Ext || !isDirectExt)) {
            tryNativeFirst(0);
        } else {`
);

fs.writeFileSync('src/components/Player.tsx', code);
