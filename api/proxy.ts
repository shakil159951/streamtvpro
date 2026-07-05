export const config = {
  runtime: 'edge',
  regions: ['sin1', 'bom1'],
};

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

  if (!targetUrl) {
    return new Response('No target URL provided.', { status: 400 });
  }

  const fetchHeaders = new Headers();
  const allowedHeaders = ['accept', 'accept-language', 'range'];
  
  for (const [key, value] of req.headers.entries()) {
      const lowerKey = key.toLowerCase();
      if (allowedHeaders.includes(lowerKey)) {
          fetchHeaders.set(lowerKey, value);
      }
  }

  const customHeadersBase64 = url.searchParams.get('h');
  if (customHeadersBase64) {
      try {
          const decodedHeaders = JSON.parse(atob(customHeadersBase64));
          for (const [k, v] of Object.entries(decodedHeaders)) {
              if (v !== undefined && typeof v === 'string') {
                  fetchHeaders.set(k.toLowerCase(), v);
              }
          }
      } catch (e) {
          console.warn("Failed to decode custom headers:", e);
      }
  } else {
      if (url.searchParams.get('referer')) fetchHeaders.set('referer', url.searchParams.get('referer')!);
      if (url.searchParams.get('useragent')) fetchHeaders.set('user-agent', url.searchParams.get('useragent')!);
      if (url.searchParams.get('cookie')) fetchHeaders.set('cookie', url.searchParams.get('cookie')!);
      if (url.searchParams.get('origin')) fetchHeaders.set('origin', url.searchParams.get('origin')!);
  }

  if (!fetchHeaders.has('user-agent')) {
      fetchHeaders.set('user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36');
  }

  try {
      const proxyRes = await fetch(targetUrl, {
          method: req.method,
          headers: fetchHeaders,
          redirect: 'follow',
      });

      const responseHeaders = new Headers();
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Allow-Methods', 'GET, OPTIONS, HEAD');
      responseHeaders.set('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type, Accept-Ranges');

      const headersToPreserve = ['content-type', 'cache-control', 'accept-ranges', 'etag', 'last-modified', 'content-length', 'content-range'];
      const contentType = proxyRes.headers.get('content-type')?.toLowerCase() || '';
      const finalUrl = proxyRes.url || targetUrl;
      const isM3u8 = contentType.includes('mpegurl') || contentType.includes('vnd.apple.mpegurl') || finalUrl.includes('.m3u8');

      proxyRes.headers.forEach((value, key) => {
          const lowerKey = key.toLowerCase();
          if (headersToPreserve.includes(lowerKey)) {
              if (isM3u8 && ['content-length', 'etag', 'last-modified', 'content-range'].includes(lowerKey)) {
                  return;
              }
              responseHeaders.set(key, value);
          }
      });

      if (isM3u8 && proxyRes.status >= 200 && proxyRes.status < 300) {
          const text = await proxyRes.text();
          const lines = text.split('\n');
          const proxyUrlParams = new URLSearchParams(url.searchParams);
          proxyUrlParams.delete('u');
          proxyUrlParams.delete('url');
          proxyUrlParams.delete('h');
          proxyUrlParams.delete('referer');
          proxyUrlParams.delete('useragent');
          proxyUrlParams.delete('cookie');
          proxyUrlParams.delete('origin');
          
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

          responseHeaders.set('Content-Length', new Blob([rewritten]).size.toString());
          return new Response(rewritten, {
              status: proxyRes.status,
              headers: responseHeaders
          });
      }

      return new Response(proxyRes.body, {
          status: proxyRes.status,
          headers: responseHeaders
      });

  } catch (err: any) {
      return new Response(`Proxy Error: ${err.message}`, { status: 502 });
  }
}
