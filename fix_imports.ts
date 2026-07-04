import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace("import { AlertCircle, Channel, Playlist } from './types';", "import { Channel, Playlist } from './types';");
content = content.replace("import { AlertCircle, getPlaylists, savePlaylists } from './lib/storage';", "import { getPlaylists, savePlaylists } from './lib/storage';");
content = content.replace("import { AlertCircle, parseM3U } from './lib/m3u';", "import { parseM3U } from './lib/m3u';");
content = content.replace("import { AlertCircle, XtreamApi, XtreamVod, XtreamSeries } from './lib/xtream';", "import { XtreamApi, XtreamVod, XtreamSeries } from './lib/xtream';");
content = content.replace("import { AlertCircle, subscribeToConfig, updateConfig } from './lib/firebase';", "import { subscribeToConfig, updateConfig } from './lib/firebase';");
content = content.replace("import { AlertCircle, motion, AnimatePresence } from 'motion/react';", "import { motion, AnimatePresence } from 'motion/react';");

fs.writeFileSync('src/App.tsx', content);

