const fs = require('fs');
let code = fs.readFileSync('api/proxy.ts', 'utf8');

if (!code.includes('x-forwarded-for')) {
    code = code.replace(
        /if \(\!fetchHeaders\.has\('user-agent'\)\) \{/g,
        `
  const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');
  if (clientIp) {
      fetchHeaders.set('x-forwarded-for', clientIp);
  } else {
      fetchHeaders.set('x-forwarded-for', '103.112.150.1'); // A dummy BD IP
  }
  
  if (!fetchHeaders.has('user-agent')) {`
    );
    fs.writeFileSync('api/proxy.ts', code);
}
