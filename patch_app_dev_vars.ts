import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

const returnTarget = `  return (
    <div className="flex`;

const vars = `  const devPhoto = devConfig?.photo || "https://api.dicebear.com/7.x/lorelei/svg?seed=Farabi&backgroundColor=0d9488";
  const devName = devConfig?.name || "FARABI AHMED\\nSHAKIL";
  const devFbUrl = devConfig?.facebookUrl || "https://www.facebook.com/farabiahmedshakil11";
  const devFbHandle = devConfig?.facebookHandle || "farabiahmedshakil11";
  const devTgUrl = devConfig?.telegramUrl || "https://t.me/farabiSH";
  const devTgHandle = devConfig?.telegramHandle || "@farabiSH";

  return (
    <div className="flex`;

if (content.includes(returnTarget)) {
    content = content.replace(returnTarget, vars);
    fs.writeFileSync('src/App.tsx', content);
    console.log("Patched variables in App.tsx");
} else {
    console.log("Target not found");
}
