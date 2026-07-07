export const config = {
  runtime: 'edge',
};

// Known streaming sites that require specific Origin/Referer headers
const SITE_HEADERS: Record<string, { origin: string; referer: string }> = {
  'toffe.live': { origin: 'https://www.toffe.live', referer: 'https://www.toffe.live/' },
  'toffee.tv': { origin: 'https://www.toffee.tv', referer: 'https://www.toffee.tv/' },
  'toffeelive': { origin: 'https://www.toffe.live', referer: 'https://www.toffe.live/' },
  'bioscopelive': { origin: 'https://www.bioscopelive.com', referer: 'https://www.bioscopelive.com/' },
  'hoichoi': { origin: 'https://www.hoichoi.tv', referer: 'https://www.hoichoi.tv/' },
  'chorki': { origin: 'https://www.chorki.com', referer: 'https://www.chorki.com/' },
};

function getSiteHeaders(targetUrl: string): { origin?: string; referer?: string } {
  try {
    const hostname = new URL(targetUrl).hostname.toLowerCase();
    for (const [key, headers] of Object.entries(SITE_HEADERS)) {
      if (hostname.includes(key)) return headers;
    }
  } catch {}
  return {};
}

async function fetchWithRetry(url: string, options: RequestInit, maxRetries: number = 2): Promise<Response> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.ok || res.status === 403 || res.status === 404) return res;
      if (res.status >= 500 && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
        continue;
      }
      return res;
    } catch (e: any) {
      lastError = e;
      if (attempt < maxRetries && e.name !== 'AbortError') {
        await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
        continue;
      }
      throw e;
    }
  }
  throw lastError || new Error('Fetch failed');
}

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const targetUrl = url.searchParams.get('u') || url.searchParams.get('url');

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
        'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Range, Authorization',
        'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Content-Type, Accept-Ranges',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  if (!targetUrl) return new Response('No target URL provided.', { status: 400 });

  const fetchHeaders = new Headers();
  
  // Forward safe browser headers
  const allowedHeaders = ['accept', 'accept-language', 'range'];
  for (const [key, value] of req.headers.entries()) {
    const lk = key.toLowerCase();
    if (allowedHeaders.includes(lk)) fetchHeaders.set(lk, value);
  }

  // Parse custom headers from base64 encoded parameter
  const customHeadersBase64 = url.searchParams.get('h');
  let hasCustomOrigin = false;
  let hasCustomReferer = false;
  
  if (customHeadersBase64) {
    try {
      const decoded = JSON.parse(atob(customHeadersBase64));
      for (const [k, v] of Object.entries(decoded)) {
        if (v !== undefined && typeof v === 'string') {
          const lk = k.toLowerCase();
          fetchHeaders.set(lk, v);
          if (lk === 'origin') hasCustomOrigin = true;
          if (lk === 'referer') hasCustomReferer = true;
        }
      }
    } catch (e) { console.warn("Failed to decode headers:", e); }
  } else {
    // Legacy query parameter format
    if (url.searchParams.get('referer')) { fetchHeaders.set('referer', url.searchParams.get('referer')!); hasCustomReferer = true; }
    if (url.searchParams.get('useragent')) fetchHeaders.set('user-agent', url.searchParams.get('useragent')!);
    if (url.searchParams.get('cookie')) fetchHeaders.set('cookie', url.searchParams.get('cookie')!);
    if (url.searchParams.get('origin')) { fetchHeaders.set('origin', url.searchParams.get('origin')!); hasCustomOrigin = true; }
  }

  // Auto-detect site-specific headers for known streaming platforms (Toffee, Bioscope, etc.)
  if (!hasCustomOrigin || !hasCustomReferer) {
    const siteHeaders = getSiteHeaders(targetUrl);
    if (siteHeaders.origin && !hasCustomOrigin) fetchHeaders.set('origin', siteHeaders.origin);
    if (siteHeaders.referer && !hasCustomReferer) fetchHeaders.set('referer', siteHeaders.referer);
  }

  // Set Bangladesh IP headers for geo-restricted BD IPTV streams
  fetchHeaders.set('x-forwarded-for', '103.112.150.1');
  fetchHeaders.set('x-real-ip', '103.112.150.1');
  fetchHeaders.set('client-ip', '103.112.150.1');
  fetchHeaders.set('true-client-ip', '103.112.150.1');
  fetchHeaders.set('cf-connecting-ip', '103.112.150.1');
  
  if (!fetchHeaders.has('user-agent')) {
    fetchHeaders.set('user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');
  }
  if (!fetchHeaders.has('accept')) fetchHeaders.set('accept', '*/*');

  try {
    const proxyRes = await fetchWithRetry(targetUrl, { method: req.method, headers: fetchHeaders, redirect: 'follow' });
    const responseHeaders = new Headers();
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
    responseHeaders.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type, Accept-Ranges');

    const contentType = proxyRes.headers.get('content-type')?.toLowerCase() || '';
    const finalUrl = proxyRes.url || targetUrl;
    
    // Detect m3u8 by content-type OR by URL extension
    const isM3u8 = contentType.includes('mpegurl') || 
                   contentType.includes('vnd.apple.mpegurl') || 
                   (contentType.includes('octet-stream') && (finalUrl.includes('.m3u8') || finalUrl.includes('.m3u'))) ||
                   finalUrl.includes('.m3u8') ||
                   finalUrl.includes('.m3u');

    const headersToPreserve = ['content-type', 'cache-control', 'accept-ranges', 'etag', 'last-modified', 'content-range'];
    proxyRes.headers.forEach((value, key) => {
      const lk = key.toLowerCase();
      if (headersToPreserve.includes(lk)) {
        if (isM3u8 && ['content-length', 'etag', 'last-modified', 'content-range'].includes(lk)) return;
        responseHeaders.set(key, value);
      }
    });

    if (isM3u8 && proxyRes.status >= 200 && proxyRes.status < 300) {
      const text = await proxyRes.text();
      const lines = text.split('\n');
      
      // Preserve proxy params for sub-requests
      const proxyUrlParams = new URLSearchParams(url.searchParams);
      ['u','url','h','referer','useragent','cookie','origin'].forEach(k => proxyUrlParams.delete(k));

      const buildRewrittenUrl = (absUrl: string) => {
        let rw = `/api/proxy?u=${encodeURIComponent(absUrl)}`;
        if (customHeadersBase64) rw += `&h=${encodeURIComponent(customHeadersBase64)}`;
        const ref = url.searchParams.get('referer'); if (ref) rw += `&referer=${encodeURIComponent(ref)}`;
        const ua = url.searchParams.get('useragent'); if (ua) rw += `&useragent=${encodeURIComponent(ua)}`;
        const ck = url.searchParams.get('cookie'); if (ck) rw += `&cookie=${encodeURIComponent(ck)}`;
        const extra = proxyUrlParams.toString(); if (extra) rw += `&${extra}`;
        return rw;
      };

      const rewritten = lines.map(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          // Handle stream URLs (may have query strings with tokens)
          try {
            const absUrl = trimmed.startsWith('http') ? trimmed : new URL(trimmed, finalUrl).href;
            return buildRewrittenUrl(absUrl);
          } catch { return line; }
        } else if (trimmed.startsWith('#EXT')) {
          // Rewrite URI= in EXT-X-KEY, EXT-X-MAP, EXT-X-MEDIA, etc.
          return line.replace(/URI="([^"]+)"/g, (match, uri) => {
            try {
              const absUrl = uri.startsWith('http') ? uri : new URL(uri, finalUrl).href;
              return `URI="${buildRewrittenUrl(absUrl)}"`;
            } catch { return match; }
          });
        }
        return line;
      }).join('\n');

      responseHeaders.set('Content-Type', 'application/vnd.apple.mpegurl');
      return new Response(rewritten, { status: proxyRes.status, headers: responseHeaders });
    }

    return new Response(proxyRes.body, { status: proxyRes.status, headers: responseHeaders });
  } catch (err: any) {
    return new Response(`Proxy Error: ${err.message}`, { status: 502 });
  }
}
