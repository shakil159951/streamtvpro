import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetState = `  const [showNotice, setShowNotice] = useState(true);
  const [appNotice, setAppNotice] = useState(() => localStorage.getItem('app_notice') || APP_NOTICE);`;

const replaceState = `  const [showNotice, setShowNotice] = useState(true);
  const [appNotice, setAppNotice] = useState(() => localStorage.getItem('app_notice') || APP_NOTICE);
  const [devConfig, setDevConfig] = useState<any>(() => { try { return JSON.parse(localStorage.getItem('dev_config') || '{}'); } catch { return {}; } });`;

const targetFirebase = `    if (data.app_notice) {
      setAppNotice(data.app_notice);
      localStorage.setItem('app_notice', data.app_notice);
    }`;

const replaceFirebase = `    if (data.app_notice) {
      setAppNotice(data.app_notice);
      localStorage.setItem('app_notice', data.app_notice);
    }
    
    if (data.devConfig) {
      setDevConfig(data.devConfig);
      localStorage.setItem('dev_config', JSON.stringify(data.devConfig));
    }`;

const targetPublish = `      const data = JSON.parse(JSON.stringify({
        app_notice: appNotice || '',
        xtream: {`;

const replacePublish = `      const data = JSON.parse(JSON.stringify({
        app_notice: appNotice || '',
        devConfig: devConfig || {},
        xtream: {`;

const targetJsonBtn = `                                  const data = {
                                    app_notice: appNotice,
                                    xtream: {`;

const replaceJsonBtn = `                                  const data = {
                                    app_notice: appNotice,
                                    devConfig: devConfig,
                                    xtream: {`;

content = content.replace(targetState, replaceState);
content = content.replace(targetFirebase, replaceFirebase);
content = content.replace(targetPublish, replacePublish);
content = content.replace(targetJsonBtn, replaceJsonBtn);

fs.writeFileSync('src/App.tsx', content);
console.log("Patched App.tsx with devConfig state");
