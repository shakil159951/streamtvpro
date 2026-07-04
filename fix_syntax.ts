import fs from 'fs';

let content = fs.readFileSync('src/components/Player.tsx', 'utf8');

const brokenStr = `<div 
        ref={containerRef} >
        <style>{\`
            .vjs-error-display { display: none !important; }
            .vjs-modal-dialog { display: none !important; }
        \`}</style>
        className={\`relative flex flex-col`;

const fixedStr = `<div 
        ref={containerRef} 
        className={\`relative flex flex-col`;

if (content.includes(brokenStr)) {
    content = content.replace(brokenStr, fixedStr);
    
    // Add the style block INSIDE the div, so after the closing > of the first div.
    const divEndIndex = content.indexOf('        onDoubleClick={toggleFullscreen}', content.indexOf(fixedStr));
    const divClosingBracket = content.indexOf('>', divEndIndex);
    
    const insertStyle = `\n        <style>{\`\n            .vjs-error-display { display: none !important; }\n            .vjs-modal-dialog { display: none !important; }\n        \`}</style>`;
    
    content = content.substring(0, divClosingBracket + 1) + insertStyle + content.substring(divClosingBracket + 1);
    
    console.log("Fixed syntax");
} else {
    console.log("Could not find broken syntax");
}

fs.writeFileSync('src/components/Player.tsx', content);

