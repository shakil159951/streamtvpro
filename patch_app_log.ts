import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

const target = `      const chs = parseM3U(text);
      if (chs.length === 0) throw new Error('No channels found');
      setChs(chs);
    } catch (err: any) {`;

const replace = `      const chs = parseM3U(text);
      console.log("Parsed channels:", chs.length, "from text length:", text.length);
      if (chs.length === 0) throw new Error('No channels found');
      setChs(chs);
    } catch (err: any) {
      console.error("Playlist load error:", err);`;

content = content.replace(target, replace);
fs.writeFileSync('src/App.tsx', content);
