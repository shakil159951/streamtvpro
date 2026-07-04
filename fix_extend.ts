import fs from 'fs';

let content = fs.readFileSync('src/components/Player.tsx', 'utf8');

const targetStr = `        dashPlayer.extend("RequestModifier", function () {`;
const replacementStr = `        dashPlayer.extend("RequestModifier", function () {`;

// Wait, I just need to add `, true)` at the end of the extend call.
const fullTarget = `                    return url;
                }
            };
        });`;

const fullReplacement = `                    return url;
                }
            };
        }, true);`;

if (content.includes(fullTarget)) {
    content = content.replace(fullTarget, fullReplacement);
    fs.writeFileSync('src/components/Player.tsx', content);
    console.log("Patched DASH extend");
} else {
    console.log("Could not find DASH extend target string");
}
