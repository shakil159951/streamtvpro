import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const target = `  // Generate a secret key for encrypting URLs in tokens
  const SECRET_KEY = crypto.randomBytes(32);`;

const replace = `  // Use a stable key for serverless environments (Vercel)
  // so tokens remain valid across different lambda instances.
  const baseKeyStr = process.env.STREAM_SECRET_KEY || "DEFAULT_STREAM_SECURE_TOKEN_KEY_V1";
  const SECRET_KEY = crypto.createHash('sha256').update(baseKeyStr).digest();`;

if (content.includes(target)) {
    content = content.replace(target, replace);
    fs.writeFileSync('server.ts', content);
    console.log("Patched server.ts secret key");
} else {
    console.log("Could not find server.ts secret key target");
}
