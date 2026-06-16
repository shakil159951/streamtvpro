export interface Channel {
  uid: string;
  name: string;
  url: string;
  logo: string;
  group: string;
}

export interface Playlist {
  id: string;
  name: string;
  url: string;
  active: boolean;
  isDefault?: boolean;
}
