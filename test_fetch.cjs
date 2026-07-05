fetch('https://ifconfig.me/all.json', { headers: { 'X-Forwarded-For': '103.112.150.1' } })
  .then(r => r.json())
  .then(console.log);
