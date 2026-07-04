import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const target1 = `                        // Encrypt the URL to make it stateless (valid for 24h to prevent permanent bookmarking)
                        const channelId = Buffer.from(encryptToken(originalUrl, 24 * 60 * 60 * 1000)).toString('base64url');`;

const replace1 = `                        // Encrypt the URL to make it stateless (valid for 24h to prevent permanent bookmarking)
                        const channelId = encryptToken(originalUrl, 24 * 60 * 60 * 1000);`;

const target2 = `  app.get("/api/live/:id", (req, res) => {
      const channelId = req.params.id;
      let rawToken = '';
      try {
          rawToken = Buffer.from(channelId, 'base64url').toString('utf8');
      } catch (e) {
          return res.status(400).send('Invalid channel ID format.');
      }
      const originalUrl = decryptToken(rawToken);`;

const replace2 = `  app.get("/api/live/:id", (req, res) => {
      const channelId = req.params.id;
      const originalUrl = decryptToken(channelId);`;

if (content.includes(target1) && content.includes(target2)) {
    content = content.replace(target1, replace1);
    content = content.replace(target2, replace2);
    fs.writeFileSync('server.ts', content);
    console.log("Fixed stateless hex");
} else {
    console.log("Could not find stateless fix targets");
}
