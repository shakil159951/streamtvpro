import express from 'express';
import axios from 'axios';
import { URL } from 'url';
import https from 'https';
import http from 'http';

const router = express.Router();

const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
    keepAlive: true
});

const httpAgent = new http.Agent({
    keepAlive: true
});

router.all('/*', async (req, res) => {
    let targetUrl = req.query.url as string;
    
    if (!targetUrl) {
        return res.status(400).send('Missing url parameter');
    }

    // Forward relevant headers from client
    const headersToForward = ['user-agent', 'accept', 'accept-language', 'range', 'if-range', 'if-match', 'if-none-match', 'if-modified-since', 'if-unmodified-since'];
    const headers: any = {};
    
    for (const h of headersToForward) {
        if (req.headers[h]) {
            headers[h] = req.headers[h];
        }
    }

    // Always set a default user-agent if client didn't provide one
    if (!headers['user-agent']) {
        headers['user-agent'] = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36';
    }

    try {
        const parsedTargetUrl = new URL(targetUrl);
        headers['Origin'] = parsedTargetUrl.origin;
        headers['Referer'] = parsedTargetUrl.origin + '/';
        headers['Host'] = parsedTargetUrl.host;
    } catch (e) {
        return res.status(400).send('Invalid url parameter');
    }

    // Support aborting request if client disconnects
    const controller = new AbortController();
    req.on('close', () => {
        controller.abort();
    });

    let response;
    let attempt = 0;
    const MAX_RETRIES = 3;

    while (attempt < MAX_RETRIES) {
        try {
            response = await axios({
                method: req.method,
                url: targetUrl,
                headers: headers,
                responseType: 'stream',
                validateStatus: () => true,
                httpsAgent,
                httpAgent,
                timeout: 15000,
                signal: controller.signal,
                decompress: false // Let client handle decompression or just stream it
            });
            break;
        } catch (error: any) {
            if (error.name === 'CanceledError') {
                return; // Client disconnected
            }
            attempt++;
            if (attempt >= MAX_RETRIES || (error.code !== 'EAI_AGAIN' && error.code !== 'ENOTFOUND' && error.code !== 'ECONNRESET' && error.code !== 'ETIMEDOUT')) {
                if (!res.headersSent) {
                    throw error;
                }
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
    }

    if (!response) {
        if (!res.headersSent) res.status(502).send('Failed to fetch after retries');
        return;
    }

    // Forward response headers
    for (const [key, value] of Object.entries(response.headers)) {
        const lowerKey = key.toLowerCase();
        if (['access-control-allow-origin', 'access-control-allow-methods', 'access-control-allow-headers', 'access-control-expose-headers', 'access-control-max-age', 'access-control-allow-credentials', 'host', 'connection'].includes(lowerKey)) {
            continue;
        }
        try {
            res.setHeader(key, value as string | string[]);
        } catch(e) {}
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Range');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    res.status(response.status);

    const contentType = response.headers['content-type'] || '';
    
    // M3U8 Rewriting
    if (contentType.includes('mpegurl') || contentType.includes('application/vnd.apple.mpegurl') || targetUrl.includes('.m3u8') || targetUrl.includes('.m3u')) {
        let m3u8Content = '';
        response.data.on('data', (chunk: Buffer) => {
            m3u8Content += chunk.toString();
        });
        
        response.data.on('error', (err: any) => {
            if (!res.headersSent) res.status(500).send('Stream error: ' + err.message);
        });

        response.data.on('end', () => {
            const lines = m3u8Content.split('\n');
            const rewrittenLines = lines.map(line => {
                const trimmed = line.trim();
                
                // Rewrite URI="..." in tags like #EXT-X-KEY, #EXT-X-MAP
                if (trimmed.startsWith('#EXT') && trimmed.includes('URI="')) {
                    return trimmed.replace(/URI="([^"]+)"/g, (match, p1) => {
                        try {
                            const absoluteUrl = new URL(p1, targetUrl).toString();
                            return `URI="/api/proxy?url=${encodeURIComponent(absoluteUrl)}"`;
                        } catch (e) {
                            return match;
                        }
                    });
                }
                
                if (trimmed && !trimmed.startsWith('#')) {
                    try {
                        const absoluteUrl = new URL(trimmed, targetUrl).toString();
                        return `/api/proxy?url=${encodeURIComponent(absoluteUrl)}`;
                    } catch (e) {
                        return line;
                    }
                }
                return line;
            });
            res.send(rewrittenLines.join('\n'));
        });
    } else {
        // For video segments (.ts, .mp4, etc.), just stream it
        response.data.on('error', (err: any) => {
            if (!res.headersSent) res.status(500).send('Stream error: ' + err.message);
            else res.end();
        });
        
        response.data.pipe(res);
    }
});

export default router;
