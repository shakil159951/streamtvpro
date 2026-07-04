import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

const importTarget = `import { motion, AnimatePresence } from 'motion/react';`;
const importReplace = `import { motion, AnimatePresence } from 'motion/react';\nimport { useAntiDebug } from './hooks/useAntiDebug';`;

if (content.includes(importTarget)) {
    content = content.replace(importTarget, importReplace);
}

const hookTarget = `  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);`;
const hookReplace = `  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);\n  const isDevToolsOpen = useAntiDebug();`;

if (content.includes(hookTarget)) {
    content = content.replace(hookTarget, hookReplace);
}

const playerTarget = `<Player channel={activeChannel} />`;
const playerReplace = `<Player channel={activeChannel} isDevToolsOpen={isDevToolsOpen} />`;

if (content.includes(playerTarget)) {
    content = content.replace(playerTarget, playerReplace);
}

fs.writeFileSync('src/App.tsx', content);
console.log("Patched App.tsx for anti debug");

