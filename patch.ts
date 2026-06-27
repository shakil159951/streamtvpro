import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace the admin checks for showing the buttons
content = content.replace(/\{\(\!pl\.isDefault && isRouteAdmin && isAdmin\) && \(/g, '{(!pl.isDefault) && (');

// Fix the mobile delete button
content = content.replace(/savePlaylists\(updated\);\s*publishConfigToFirebase\(updated\);\s*\}\}\s*className="px-4 py-2/g, 'savePlaylists(updated);\n                                        if (isRouteAdmin && isAdmin) publishConfigToFirebase(updated);\n                                      }}\n                                      className="px-4 py-2');

// Fix the desktop edit/delete buttons logic
content = content.replace(/\{\(!pl\.isDefault\) && \(/g, '{(!pl.isDefault) && ('); // Ensure we didn't miss it

fs.writeFileSync('src/App.tsx', content);
