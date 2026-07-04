import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const target1 = `  // Caching
  const playlistCache = new Map<string, { m3uText: string, expiresAt: number }>();
  const channelCache = new Map<string, string>(); // channelId -> originalUrl

  app.get("/api/channels", async (req, res) => {`;

const replace1 = `  // Caching
  const playlistCache = new Map<string, { m3uText: string, expiresAt: number }>();

  app.get("/api/channels", async (req, res) => {`;

const target2 = `                        const originalUrl = nextLine;
                        const channelId = crypto.createHash('md5').update(originalUrl).digest('hex');
                        channelCache.set(channelId, originalUrl);
                        
                        // Rewrite URL to relative path
                        rewrittenLines.push(\`/api/live/\${channelId}\`);`;

const replace2 = `                        const originalUrl = nextLine;
                        // Encrypt the URL to make it stateless (valid for 24h to prevent permanent bookmarking)
                        const channelId = Buffer.from(encryptToken(originalUrl, 24 * 60 * 60 * 1000)).toString('base64url');
                        
                        // Rewrite URL to relative path
                        rewrittenLines.push(\`/api/live/\${channelId}\`);`;

const target3 = `  app.get("/api/live/:id", (req, res) => {
      const channelId = req.params.id;
      const originalUrl = channelCache.get(channelId);
      
      if (!originalUrl) {
          return res.status(404).send('Channel not found or expired. Please refresh the playlist.');
      }`;

const replace3 = `  app.get("/api/live/:id", (req, res) => {
      const channelId = req.params.id;
      let rawToken = '';
      try {
          rawToken = Buffer.from(channelId, 'base64url').toString('utf8');
      } catch (e) {
          return res.status(400).send('Invalid channel ID format.');
      }
      const originalUrl = decryptToken(rawToken);
      
      if (!originalUrl) {
          return res.status(404).send('Channel not found or expired. Please refresh the playlist.');
      }`;

if (content.includes(target1) && content.includes(target2) && content.includes(target3)) {
    content = content.replace(target1, replace1);
    content = content.replace(target2, replace2);
    content = content.replace(target3, replace3);
    fs.writeFileSync('server.ts', content);
    console.log("Patched server.ts to be stateless");
} else {
    console.log("Could not find server.ts stateless targets");
    console.log("target1: " + content.includes(target1));
    console.log("target2: " + content.includes(target2));
    console.log("target3: " + content.includes(target3));
}
