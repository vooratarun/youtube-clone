import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { ApiVideo, ApiWatchHistoryItem, VideoCard, WatchHistoryItem } from './video.model';

type WatchHistoryApiResponse = ApiWatchHistoryItem[] | { data?: ApiWatchHistoryItem[] };

@Injectable({ providedIn: 'root' })
export class WatchHistoryStore {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000';

  readonly items = signal<WatchHistoryItem[]>([]);
  readonly isLoading = signal(false);
  readonly errorMessage = signal('');
  readonly count = computed(() => this.items().length);
  readonly isEmpty = computed(() => !this.isLoading() && !this.errorMessage() && this.count() === 0);

  load(userId: number): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    this.items.set([]);

    this.http.get<WatchHistoryApiResponse>(`${this.baseUrl}/users/${userId}/watch-history`).subscribe({
      next: (response) => {
        const historyItems = Array.isArray(response) ? response : response.data ?? [];
        this.items.set(historyItems.map((item, index) => this.normalizeHistoryItem(item, index)));
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Unable to load watch history. Please try again.');
      }
    });
  }

  reset(): void {
    this.items.set([]);
    this.isLoading.set(false);
    this.errorMessage.set('');
  }

  private normalizeHistoryItem(item: ApiWatchHistoryItem, index: number): WatchHistoryItem {
    const normalizedVideo = this.normalizeVideo(item.video, item.videoId ?? index + 1);
    return {
      id: item.id ?? index + 1,
      userId: typeof item.userId === 'number' ? item.userId : 0,
      videoId: typeof item.videoId === 'number' ? item.videoId : normalizedVideo.id,
      watchedAt: item.watchedAt ?? '',
      video: normalizedVideo
    };
  }

  private normalizeVideo(video: ApiVideo | null | undefined, fallbackId: number): VideoCard {
    const rawVideo = video ?? ({ id: fallbackId } as ApiVideo);
    return {
      id: rawVideo.id ?? fallbackId,
      thumbnailUrl: rawVideo.thumbnailUrl ?? rawVideo.thumbnail ?? '',
      videoSourceUrl:
        rawVideo.videoSourceUrl ??
        rawVideo.videoUrl ??
        rawVideo.videoSrc ??
        rawVideo.src ??
        rawVideo.url ??
        rawVideo.videoPath ??
        rawVideo.mediaUrl ??
        undefined,
      authorImageUrl: rawVideo.authorImageUrl ?? rawVideo.authorImage ?? '/profile.png',
      title: rawVideo.title ?? 'Untitled video',
      channelName: rawVideo.channelName ?? rawVideo.channel ?? 'Unknown channel',
      categoryId: typeof rawVideo.categoryId === 'number' ? rawVideo.categoryId : undefined,
      categoryName: rawVideo.categoryName ?? rawVideo.category,
      category: rawVideo.category ?? rawVideo.categoryName,
      meta: rawVideo.meta ?? [rawVideo.views, rawVideo.publishedAt].filter(Boolean).join(' • ')
    };
  }
}

