import fs from 'fs';

let content = fs.readFileSync('src/components/Player.tsx', 'utf8');

const targetStr = `  return (
    <div 
        ref={containerRef} `;

const replacementStr = `  return (
    <div 
        ref={containerRef} >
        <style>{\`
            .vjs-error-display { display: none !important; }
            .vjs-modal-dialog { display: none !important; }
        \`}</style>`;

if (content.includes(targetStr)) {
    content = content.replace(targetStr, replacementStr);
    console.log("Patched styles");
} else {
    console.log("Could not find style target");
}

fs.writeFileSync('src/components/Player.tsx', content);

