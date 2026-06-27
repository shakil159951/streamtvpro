import fs from 'fs';
fetch('https://raw.githubusercontent.com/sm-monirulislam/SM-Movie-Hup-Auto-Update/refs/heads/main/Movie_Combined.m3u')
  .then(r => r.text())
  .then(t => {
    fs.writeFileSync('test_m3u.m3u', t);
    console.log("Lines:", t.split('\n').length);
    console.log("Example:", t.substring(0, 1000));
  });
