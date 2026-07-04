export interface XtreamCategory {
  category_id: string;
  category_name: string;
  parent_id?: number;
}

export interface XtreamVod {
  num: number;
  name: string;
  title: string;
  year: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  rating: string;
  added: string;
  category_id: string;
  container_extension: string;
  custom_sid: string;
  direct_source: string;
}

export interface XtreamSeries {
  num: number;
  name: string;
  series_id: number;
  cover: string;
  plot: string;
  cast: string;
  director: string;
  genre: string;
  releaseDate: string;
  last_modified: string;
  rating: string;
  rating_5based: number;
  backdrop_path: string[];
  youtube_trailer: string;
  episode_run_time: string;
  category_id: string;
}

export class XtreamApi {
  private baseUrl: string;
  private username: string;
  private pswd: string;

  constructor(serverUrl: string, username: string, pswd: string) {
    let url = serverUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'http://' + url;
    }
    // Ensure baseUrl doesn't end with a slash
    this.baseUrl = url.replace(/\/$/, '');
    this.username = username;
    this.pswd = pswd;
  }

  private async fetchApi(action: string, extraParams: Record<string, string | number> = {}) {
    if (this.baseUrl === 'http://demo.xtream.local') {
      return this.handleMockApi(action, extraParams);
    }

    let url = `${this.baseUrl}/player_api.php?username=${encodeURIComponent(this.username)}&password=${encodeURIComponent(this.pswd)}&action=${action}`;
    
    for (const [key, value] of Object.entries(extraParams)) {
      if (value !== undefined) {
        url += `&${key}=${encodeURIComponent(value)}`;
      }
    }

    const isMixedContent = typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http://');
    const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
    
    const fetchOpts = { cache: 'no-store' as RequestCache };
    
        try {
      const fetchUrl = isMixedContent ? proxyUrl : url;
      const res = await fetch(fetchUrl, fetchOpts);
      if (!res.ok) throw new Error('Not ok');
      const text = await res.text();
      if (text.trim().startsWith('<')) throw new Error('HTML response');
      return JSON.parse(text);
    } catch (e: any) {
      if (!isMixedContent) {
        try {
          const res = await fetch(proxyUrl, fetchOpts);
          if (!res.ok) throw new Error('Proxy failed');
          const text = await res.text();
          if (text.trim().startsWith('<')) throw new Error('HTML response from proxy');
          return JSON.parse(text);
        } catch (proxyError) {
          try {
            const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, fetchOpts);
            if (!res.ok) throw new Error('Public proxy failed');
            const text = await res.text();
            if (text.trim().startsWith('<')) throw new Error('HTML response from public proxy');
            return JSON.parse(text);
          } catch (publicProxyError) {
            throw publicProxyError;
          }
        }
      } else {
        try {
            const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, fetchOpts);
            if (!res.ok) throw new Error('Public proxy failed');
            const text = await res.text();
            if (text.trim().startsWith('<')) throw new Error('HTML response from public proxy');
            return JSON.parse(text);
          } catch (publicProxyError) {
            throw publicProxyError;
          }
      }
    }
  }

  private async handleMockApi(action: string, extraParams: Record<string, string | number>) {
    await new Promise(r => setTimeout(r, 600)); // Simulate latency

    if (action === 'get_vod_streams') {
      return [
        {
          num: 1,
          name: "Big Buck Bunny (Demo)",
          stream_id: 1001,
          stream_icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Big_buck_bunny_poster_big.jpg/640px-Big_buck_bunny_poster_big.jpg",
          rating: "5",
          added: "1734825600",
          category_id: "1",
          container_extension: "mp4"
        },
        {
          num: 2,
          name: "Tears of Steel (Demo)",
          stream_id: 1002,
          stream_icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/1/14/Tears_of_Steel_poster.jpg/640px-Tears_of_Steel_poster.jpg",
          rating: "4.8",
          added: "1734825600",
          category_id: "1",
          container_extension: "mp4"
        },
        {
          num: 3,
          name: "Sintel (Demo)",
          stream_id: 1003,
          stream_icon: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d4/Sintel_poster.jpg/640px-Sintel_poster.jpg",
          rating: "4.9",
          added: "1734825600",
          category_id: "1",
          container_extension: "mp4"
        }
      ];
    }

    if (action === 'get_series') {
      return [
        {
          num: 1,
          name: "Open Source Series (Demo)",
          series_id: 2001,
          cover: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Pioneer_Plaque_Vector.svg/640px-Pioneer_Plaque_Vector.svg.png",
          rating: "4.5",
          category_id: "2"
        }
      ]
    }

    if (action === 'get_series_info') {
      return {
        info: { name: "Open Source Series (Demo)" },
        episodes: {
          "1": [
            {
              id: 20011,
              episode_num: 1,
              title: "Episode 1",
              container_extension: "mp4"
            }
          ]
        }
      }
    }

    return [];
  }

  async getVodCategories(): Promise<XtreamCategory[]> {
    return this.fetchApi('get_vod_categories');
  }

  async getVodStreams(categoryId?: string): Promise<XtreamVod[]> {
    return this.fetchApi('get_vod_streams', categoryId ? { category_id: categoryId } : {});
  }

  async getVodInfo(vodId: number) {
    return this.fetchApi('get_vod_info', { vod_id: vodId });
  }

  async getSeriesCategories(): Promise<XtreamCategory[]> {
    return this.fetchApi('get_series_categories');
  }

  async getSeries(categoryId?: string): Promise<XtreamSeries[]> {
    return this.fetchApi('get_series', categoryId ? { category_id: categoryId } : {});
  }

  async getSeriesInfo(seriesId: number) {
    return this.fetchApi('get_series_info', { series_id: seriesId });
  }

  getVodStreamUrl(streamId: number, extension: string = 'mp4') {
    if (this.baseUrl === 'http://demo.xtream.local') {
      if (streamId === 1001) return 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
      if (streamId === 1002) return 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4';
      if (streamId === 1003) return 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4';
    }
    return `${this.baseUrl}/movie/${this.username}/${this.pswd}/${streamId}.${extension}`;
  }

  getSeriesStreamUrl(streamId: number, extension: string = 'mp4') {
    if (this.baseUrl === 'http://demo.xtream.local') {
      if (streamId === 20011) return 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4';
    }
    return `${this.baseUrl}/series/${this.username}/${this.pswd}/${streamId}.${extension}`;
  }

  getLiveStreamUrl(streamId: number, extension: string = 'ts') {
    return `${this.baseUrl}/live/${this.username}/${this.pswd}/${streamId}.${extension}`;
  }
}
