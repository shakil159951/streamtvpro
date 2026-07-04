import fs from 'fs';

let content = fs.readFileSync('src/components/Player.tsx', 'utf8');

content = content.replace(`interface PlayerProps {
  channel: Channel | null;
}`, `interface PlayerProps {
  channel: Channel | null;
  isDevToolsOpen?: boolean;
}`);

content = content.replace(`export default function Player({ channel }: PlayerProps) {`, `export default function Player({ channel, isDevToolsOpen }: PlayerProps) {`);

fs.writeFileSync('src/components/Player.tsx', content);
console.log("Patched Player props");

