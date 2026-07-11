export interface Channel {
  uid: string;
  name: string;
  url: string;
  logo: string;
  group: string;
  referer?: string;
  userAgent?: string;
  cookie?: string;
}

export interface Playlist {
  id: string;
  name: string;
  url: string;
  active: boolean;
  isDefault?: boolean;
}
