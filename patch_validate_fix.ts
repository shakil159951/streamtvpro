import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf8');

const target = `  // Validates if the request comes from our own app
  function validateInternalRequest(req: express.Request, res: express.Response): boolean {
      const referer = req.headers.referer || '';
      const origin = req.headers.origin || '';
      const host = req.headers.host || '';
      const forwardedHost = req.headers['x-forwarded-host'] || '';
      
      const validHosts = [host, forwardedHost].filter(Boolean) as string[];
      
      // Some players don't send referer/origin, but if they do, they must match our host
      if (origin) {
          const isValid = validHosts.some(h => origin.includes(h));
          if (!isValid && !origin.includes('localhost')) {
              // In dev environment behind proxy, allow if it matches the typical dev url pattern
              if (!origin.includes('ais-dev') && !origin.includes('ais-pre')) {
                  // res.status(403).send("Forbidden: Invalid Origin");
                  // return false;
              }
          }
      }
      return true;
  }`;

const replace = `  // Validates if the request comes from our own app
  function validateInternalRequest(req: express.Request, res: express.Response): boolean {
      const origin = req.headers.origin || '';
      const referer = req.headers.referer || '';
      const host = (req.headers['x-forwarded-host'] || req.headers.host || '') as string;
      
      // Check if origin matches host (allow localhost for dev/preview)
      if (origin) {
          try {
              const originHost = new URL(origin).host;
              if (originHost !== host && !host.includes('localhost') && !originHost.includes('localhost') && !originHost.includes('ais-dev') && !originHost.includes('ais-pre')) {
                  res.status(403).send("Forbidden: Invalid Origin");
                  return false;
              }
          } catch(e) {}
      }
      return true;
  }`;

if (content.includes(target)) {
    content = content.replace(target, replace);
    fs.writeFileSync('server.ts', content);
    console.log("Patched validateInternalRequest");
} else {
    console.log("Could not find validateInternalRequest target");
}
