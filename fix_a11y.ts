import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace standard buttons without aria-labels but with icons
content = content.replace(/<button onClick=\{\(\) => setLeftDrawerOpen\(true\)\} className="hidden md:flex lg:hidden/g, '<button aria-label="Open Menu" onClick={() => setLeftDrawerOpen(true)} className="hidden md:flex lg:hidden');
content = content.replace(/<button onClick=\{\(\) => setShowAddModal\(true\)\} className="p-2 glass-button/g, '<button aria-label="Add Playlist" onClick={() => setShowAddModal(true)} className="p-2 glass-button');
content = content.replace(/<button onClick=\{\(\) => setShowDirectModal\(true\)\} className="p-2 glass-button/g, '<button aria-label="Direct Play" onClick={() => setShowDirectModal(true)} className="p-2 glass-button');
content = content.replace(/<button onClick=\{\(\) => \{\n\s*if\s*\(window.confirm/g, '<button aria-label="Reset Settings" onClick={() => {\n            if (window.confirm');
content = content.replace(/<button onClick=\{\(\) => setShowNotice\(false\)\}/g, '<button aria-label="Close Notice" onClick={() => setShowNotice(false)}');

fs.writeFileSync('src/App.tsx', content);

let playerContent = fs.readFileSync('src/components/Player.tsx', 'utf8');

playerContent = playerContent.replace(/<button onClick=\{togglePiP\}/g, '<button aria-label="Picture in Picture" onClick={togglePiP}');
playerContent = playerContent.replace(/<button onClick=\{toggleFullscreen\}/g, '<button aria-label="Toggle Fullscreen" onClick={toggleFullscreen}');
playerContent = playerContent.replace(/<button onClick=\{togglePlay\}/g, '<button aria-label="Play/Pause" onClick={togglePlay}');
playerContent = playerContent.replace(/<button onClick=\{toggleMute\}/g, '<button aria-label="Mute/Unmute" onClick={toggleMute}');
playerContent = playerContent.replace(/<button onClick=\{skipBackward\}/g, '<button aria-label="Skip Backward 10s" onClick={skipBackward}');
playerContent = playerContent.replace(/<button onClick=\{skipForward\}/g, '<button aria-label="Skip Forward 10s" onClick={skipForward}');

fs.writeFileSync('src/components/Player.tsx', playerContent);
console.log('Fixed A11y');

