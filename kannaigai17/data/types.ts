// 関内外OPEN!17 イベントデータ型定義

export interface Creator {
  name: string;
  affiliation: string | null;
}

export interface Project {
  id: number;
  category: string;
  title: string;
  description: string;
  creators: Creator[];
}

export interface Venue {
  name: string;
  nameEn: string;
  address: string;
  access: string;
}

export interface Event {
  title: string;
  subtitle: string;
  date: string;
  dateDisplay: string;
  time: string;
  venue: Venue;
}

export interface About {
  titleJa: string;
  titleEn: string;
  description: string;
}

export interface Exhibition {
  titleJa: string;
  titleEn: string;
  description: string;
  projects: Project[];
}

export interface TalkGuest {
  id: number;
  role: string;
  name: string;
  title: string | null;
  project: string | null;
}

export interface TalkSession {
  titleJa: string;
  titleEn: string;
  description: string;
  time: string;
  guests: TalkGuest[];
}

export interface DesignPitch {
  titleJa: string;
  titleEn: string;
  description: string;
  creatorCount: number;
  pitchDuration: string;
}

export interface KidsSpace {
  titleJa: string;
  titleEn: string;
  description: string;
}

export interface Social {
  instagram: string;
  facebook: string;
}

export interface EventData {
  event: Event;
  about: About;
  exhibition: Exhibition;
  talkSession: TalkSession;
  designPitch: DesignPitch;
  kidsSpace: KidsSpace;
  social: Social;
}
