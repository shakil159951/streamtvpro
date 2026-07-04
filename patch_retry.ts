import fs from 'fs';

let content = fs.readFileSync('src/components/Player.tsx', 'utf8');

if (!content.includes('const [retryTick, setRetryTick] = useState(0);')) {
    content = content.replace(
        "const [autoEngineIndex, setAutoEngineIndex] = useState(0);",
        "const [autoEngineIndex, setAutoEngineIndex] = useState(0);\n  const [retryTick, setRetryTick] = useState(0);"
    );
}

content = content.replace(
    "}, [channel, engine, autoEngineIndex]);",
    "}, [channel, engine, autoEngineIndex, retryTick]);"
);

content = content.replace(
    "if(engine === 'Auto') { setEngine('Auto') } \n                                    tryNativeFirst(0);",
    "setRetryTick(t => t + 1);"
);

fs.writeFileSync('src/components/Player.tsx', content);
console.log("Patched retry logic");

