import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { ApiVideo, Playlist, VideoCard } from './video.model';

type PlaylistsApiResponse = Playlist[] | { data?: Playlist[] };
type VideoByIdApiResponse = ApiVideo | { data?: ApiVideo | null; video?: ApiVideo | null };

@Injectable({ providedIn: 'root' })
export class PlaylistService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000';

  getUserPlaylists(userId: number): Observable<PlaylistsApiResponse> {
    return this.http.get<PlaylistsApiResponse>(
      `${this.baseUrl}/users/${userId}/playlists`
    );
  }

  createPlaylist(userId: number, name: string, description: string): Observable<Playlist> {
    return this.http.post<Playlist>(
      `${this.baseUrl}/users/${userId}/playlists`,
      { name, description }
    );
  }

  deletePlaylist(userId: number, playlistId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/users/${userId}/playlists/${playlistId}`
    );
  }

  removeVideoFromPlaylist(userId: number, playlistId: number, videoId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/users/${userId}/playlists/${playlistId}/videos/${videoId}`
    );
  }

  addVideoToPlaylist(userId: number, playlistId: number, videoId: number): Observable<void> {
    return this.http.post<void>(
      `${this.baseUrl}/users/${userId}/playlists/${playlistId}/videos/${videoId}`,
      {}
    );
  }

  getVideoById(id: number): Observable<VideoCard | null> {
    return this.http.get<VideoByIdApiResponse>(`${this.baseUrl}/get-video/${id}`).pipe(
      map((response) => {
        const raw = this.extractRawVideo(response);
        if (!raw) return null;
        return {
          id: raw.id ?? id,
          thumbnailUrl: raw.thumbnailUrl ?? raw.thumbnail ?? '',
          videoSourceUrl: raw.videoSourceUrl ?? raw.videoUrl ?? raw.videoSrc ?? raw.src ?? raw.url ?? raw.videoPath ?? raw.mediaUrl ?? undefined,
          authorImageUrl: raw.authorImageUrl ?? raw.authorImage ?? '/profile.png',
          title: raw.title ?? 'Untitled video',
          channelName: raw.channelName ?? raw.channel ?? 'Unknown channel',
          categoryId: typeof raw.categoryId === 'number' ? raw.categoryId : undefined,
          categoryName: raw.categoryName ?? raw.category,
          category: raw.category ?? raw.categoryName,
          meta: raw.meta ?? [raw.views, raw.publishedAt].filter(Boolean).join(' • ')
        } as VideoCard;
      }),
      catchError(() => of(null))
    );
  }

  private extractRawVideo(response: VideoByIdApiResponse): ApiVideo | null {
    if (!response || typeof response !== 'object' || Array.isArray(response)) {
      return null;
    }
    if ('data' in response || 'video' in response) {
      return response.data ?? response.video ?? null;
    }
    return response as ApiVideo;
  }
}

