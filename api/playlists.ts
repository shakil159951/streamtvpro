export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const targetUrl = 'https://raw.githubusercontent.com/shakil951/PlaylistCheck/refs/heads/main/combined_playlist.m3u';
  
  try {
      const response = await fetch(targetUrl);
      
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Content-Type', 'audio/x-mpegurl');

      return new Response(response.body, {
          status: response.status,
          headers: responseHeaders
      });
  } catch (err: any) {
      return new Response('Failed to fetch default playlist', { status: 500 });
  }
}
