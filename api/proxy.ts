import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Readable } from 'stream';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const targetUrl = (req.query.url || req.query.u) as string;

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS, HEAD");
    res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Range, Authorization");
    res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Range, Content-Type, Accept-Ranges");

    if (req.method === "OPTIONS") {
        res.setHeader("Access-Control-Max-Age", "86400");
        return res.status(200).end();
    }

    if (!targetUrl) {
        return res.status(400).send("No target URL provided.");
    }

    let urlObj: URL;
    try {
        urlObj = new URL(targetUrl);
    } catch (e) {
        return res.status(400).send("Invalid target URL format.");
    }

    const proxyUrlParams = new URLSearchParams();
    for (const [k, v] of Object.entries(req.query)) {
        if (k !== 'url' && k !== 'u' && k !== 'h' && k !== 'referer' && k !== 'useragent' && v !== undefined) {
            if (Array.isArray(v)) {
                v.forEach(val => proxyUrlParams.append(k, String(val)));
            } else {
                proxyUrlParams.append(k, String(v));
            }
        }
    }

    const fetchHeaders = new Headers();
    const allowedHeaders = ['accept', 'accept-language', 'range'];
    
    for (const [key, value] of Object.entries(req.headers)) {
        const lowerKey = key.toLowerCase();
        if (value !== undefined && allowedHeaders.includes(lowerKey)) {
             if (Array.isArray(value)) {
                 fetchHeaders.set(lowerKey, value[0]);
             } else {
                 fetchHeaders.set(lowerKey, value as string);
             }
        }
    }

    const customHeadersBase64 = req.query.h as string;

    if (customHeadersBase64) {
        try {
            const decodedHeaders = JSON.parse(Buffer.from(customHeadersBase64, 'base64').toString('utf-8'));
            for (const [k, v] of Object.entries(decodedHeaders)) {
                if (v !== undefined && typeof v === 'string') {
                    const lowerK = k.toLowerCase();
                    fetchHeaders.set(lowerK, v);
                }
            }
        } catch (e) {
            console.warn("Failed to decode custom headers:", e);
        }
    } else {
        if (req.query.referer) {
            fetchHeaders.set("referer", req.query.referer as string);
        }
        if (req.query.useragent) fetchHeaders.set("user-agent", req.query.useragent as string);
        if (req.query.cookie) fetchHeaders.set("cookie", req.query.cookie as string);
        if (req.query.origin) {
            fetchHeaders.set("origin", req.query.origin as string);
        }
    }
    
    fetchHeaders.set('x-forwarded-for', '103.112.150.1');
    fetchHeaders.set('x-real-ip', '103.112.150.1');

    if (!fetchHeaders.has("user-agent")) {
        fetchHeaders.set("user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    req.on('close', () => {
        controller.abort();
    });

    try {
        const proxyRes = await fetch(targetUrl, {
            method: req.method,
            headers: fetchHeaders,
            redirect: 'follow',
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        const headersToPreserve = ['content-type', 'cache-control', 'accept-ranges', 'etag', 'last-modified', 'content-range'];
        
        const contentType = proxyRes.headers.get('content-type')?.toLowerCase() || '';
        const finalUrl = proxyRes.url || targetUrl;
        const isM3u8 = contentType.includes('mpegurl') || contentType.includes('vnd.apple.mpegurl') || finalUrl.includes('.m3u8');

        proxyRes.headers.forEach((value, key) => {
            const lowerKey = key.toLowerCase();
            if (headersToPreserve.includes(lowerKey)) {
                if (isM3u8 && ['content-length', 'etag', 'last-modified', 'content-range'].includes(lowerKey)) {
                    return;
                }
                res.setHeader(key, value);
            }
        });

        res.status(proxyRes.status);

        if (isM3u8 && proxyRes.status >= 200 && proxyRes.status < 300) {
            const text = await proxyRes.text();
            const lines = text.split('\n');

            const buildRewrittenUrl = (absUrl: string) => {
                let rewrittenUrl = `/api/proxy?u=${encodeURIComponent(absUrl)}`;
                if (customHeadersBase64) rewrittenUrl += `&h=${encodeURIComponent(customHeadersBase64)}`;
                const extraParams = proxyUrlParams.toString();
                if (extraParams) rewrittenUrl += `&${extraParams}`;
                return rewrittenUrl;
            };

            const rewritten = lines.map(line => {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#')) {
                    try {
                        const absUrl = new URL(trimmed, finalUrl).href;
                        return buildRewrittenUrl(absUrl);
                    } catch(e) {
                        return line;
                    }
                } else if (trimmed.startsWith('#EXT')) {
                    return line.replace(/URI="([^"]+)"/g, (match, uri) => {
                        try {
                            const absUrl = new URL(uri, finalUrl).href;
                            return `URI="${buildRewrittenUrl(absUrl)}"`;
                        } catch(e) {
                            return match;
                        }
                    });
                }
                return line;
            }).join('\n');

            res.setHeader('Content-Length', Buffer.byteLength(rewritten).toString());
            return res.send(rewritten);
        }

        if (proxyRes.body) {
            const nodeStream = Readable.fromWeb(proxyRes.body as any);
            
            nodeStream.on('error', (streamErr: any) => {
                console.error("Stream pipe error:", streamErr);
                if (!res.headersSent) {
                    res.status(502).end();
                } else {
                    res.end();
                }
            });

            nodeStream.pipe(res);
        } else {
            res.end();
        }

    } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            if (!res.headersSent) res.status(504).send("Gateway Timeout");
        } else {
            if (!res.headersSent) res.status(502).send(`Proxy Error: ${err.message}`);
        }
    }
}
