export const config = {
  runtime: 'edge',
  regions: ['sin1', 'bom1'],
};

export default async function handler(req: Request) {
  const url = new URL(req.url);
  let targetUrl = url.searchParams.get('url');
  
  if (!targetUrl || targetUrl === '/api/playlists') {
      targetUrl = 'https://raw.githubusercontent.com/shakil951/PlaylistCheck/refs/heads/main/combined_playlist.m3u';
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
      },
    });
  }

  try {
      const proxyRes = await fetch(targetUrl, {
          headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
          }
      });
      
      if (!proxyRes.ok) {
          return new Response('Failed to fetch playlist', { status: proxyRes.status });
      }

      const responseHeaders = new Headers();
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Content-Type', 'audio/x-mpegurl');
      // Cache at Edge for 30 minutes
      responseHeaders.set('Cache-Control', 'public, s-maxage=1800, max-age=1800');

      return new Response(proxyRes.body, {
          status: proxyRes.status,
          headers: responseHeaders
      });

  } catch (err: any) {
      return new Response(`Error: ${err.message}`, { status: 502 });
  }
}
