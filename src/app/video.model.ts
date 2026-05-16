export type VideoCard = {
  id: number;
  thumbnailUrl: string;
  videoSourceUrl?: string;
  authorImageUrl: string;
  title: string;
  channelName: string;
  category?: string;
  categoryId?: number;
  categoryName?: string;
  meta: string;
};

export type ApiVideo = Partial<VideoCard> & {
  id: number;
  thumbnail?: string;
  videoUrl?: string;
  videoSrc?: string;
  src?: string;
  url?: string;
  videoPath?: string;
  mediaUrl?: string;
  authorImage?: string;
  channel?: string;
  views?: string;
  publishedAt?: string;
};

export type VideoComment = {
  id: number;
  videoId: number;
  userId: number;
  username: string;
  text: string;
  createdAt: string;
  updatedAt: string;
};

export type ApiVideoComment = Partial<VideoComment> & {
  id: number;
};

export interface VideoCardAdd {
  thumbnailUrl: string;
  videoSourceUrl: string;
  authorImageUrl: string;
  title: string;
  channelName: string;
  categoryId: number;
  categoryName: string;
  meta: string;
}

export type VideoUploadPayload = VideoCardAdd;

export type Playlist = {
  id: number;
  userId: number;
  name: string;
  description: string;
  videoIds: number[];
  createdAt: string;
  updatedAt: string;
};

export type WatchHistoryItem = {
  id: number;
  userId: number;
  videoId: number;
  watchedAt: string;
  video: VideoCard;
};

export type ApiWatchHistoryItem = {
  id: number;
  userId?: number;
  videoId?: number;
  watchedAt?: string;
  video?: ApiVideo | null;
};

