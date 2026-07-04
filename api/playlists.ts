import type { VercelRequest, VercelResponse } from '@vercel/node';
import https from 'https';

export default function handler(req: VercelRequest, res: VercelResponse) {
    const targetUrl = 'https://raw.githubusercontent.com/shakil951/PlaylistCheck/refs/heads/main/combined_playlist.m3u';
    
    https.get(targetUrl, (proxyRes) => {
        res.setHeader('Content-Type', 'audio/x-mpegurl');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(proxyRes.statusCode || 200);
        proxyRes.pipe(res);
    }).on('error', (err) => {
        res.status(500).send('Failed to fetch default playlist');
    });
}
