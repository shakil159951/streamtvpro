const fs = require('fs');
let code = fs.readFileSync('src/components/Player.tsx', 'utf8');

code = code.replace(/  const \[autoEngineIndex, setAutoEngineIndex\] = useState\(0\);\n/g, '');
code = code.replace(/  const autoEngines = \['Default', 'Shaka', 'Video\.js'\];\n/g, '');
code = code.replace(/  const activeEngine = engine === 'Auto' \? \(autoEngines\[autoEngineIndex\] \|\| 'Default'\) : engine;\n/g, '  const activeEngine = engine;\n');
code = code.replace(/                                    setAutoEngineIndex\(0\); \n/g, '');
code = code.replace(/autoEngineIndex, /g, '');

fs.writeFileSync('src/components/Player.tsx', code);
