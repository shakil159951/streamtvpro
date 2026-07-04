import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `import { 
  Tv, Code, ListVideo, Search, Plus, PlayCircle, RefreshCw, 
  Trash2, X, MonitorPlay, ExternalLink, Activity, Film, Clapperboard, FolderOpen, Settings, Edit, ChevronDown, Rocket, ShieldCheck, Lightbulb, Quote, Code2
} from 'lucide-react';`;

const replacementStr = `import { 
  Tv, Code, ListVideo, Search, Plus, PlayCircle, RefreshCw, 
  Trash2, X, MonitorPlay, ExternalLink, Activity, Film, Clapperboard, FolderOpen, Settings, Edit, ChevronDown, Rocket, ShieldCheck, Lightbulb, Quote, Code2, Info
} from 'lucide-react';`;

if (content.includes(targetStr)) {
    content = content.replace(targetStr, replacementStr);
    fs.writeFileSync('src/App.tsx', content);
    console.log("Patched App.tsx imports");
} else {
    console.log("Could not find App.tsx imports");
}
