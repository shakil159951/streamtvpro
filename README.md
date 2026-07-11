# StreamTVPro

A modern, fast, and minimal IPTV Player built with React, Vite, and Tailwind CSS.

## 🚀 Deployment to Vercel

This application is ready to be deployed to Vercel!

### Quick Steps:

1. **Export to GitHub**: In AI Studio, go to Settings -> Export to GitHub.
2. **Import in Vercel**: 
   - Go to your Vercel Dashboard and click "Add New" -> "Project".
   - Import the repository you just exported to GitHub.
3. **Configure Vercel**:
   - Vercel will automatically detect the **Vite** framework preset.
   - The Root Directory should remain as the default (`/`).
   - Leave the Build Command and Output Directory as default (`npm run build` and `dist`).
4. **Deploy**: Click Deploy! Vercel will automatically host the React frontend on the Edge Network and the proxy API (`/api/channels`) as a Serverless Function.

## Local Development

```bash
npm install
npm run dev
```

## Features
- Support for HLS (`.m3u8`) and native web formats (`.mp4`, `.webm`)
- Smart Player Auto-Switching (Hls.js, Video.js, HTML5 Native)
- Local playlist management
- Remote playlist synchronization
- Direct stream playback

