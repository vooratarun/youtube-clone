import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiVideo, ApiVideoComment } from '../video.model';

export type VideoByIdApiResponse = ApiVideo | { data?: ApiVideo | null; video?: ApiVideo | null };
export type VideoCommentsApiResponse = ApiVideoComment[] | { data?: ApiVideoComment[]; comments?: ApiVideoComment[] };
export type SubscribeStatusApiResponse = { userId?: number; channelName?: string; subscribed?: boolean };

@Injectable({
  providedIn: 'root'
})
export class VideoDetailsApiService {
  private readonly http = inject(HttpClient);
  private readonly videoByIdApiUrl = 'http://localhost:3000/get-video';

  getVideoById(videoId: number): Observable<VideoByIdApiResponse> {
    return this.http.get<VideoByIdApiResponse>(`${this.videoByIdApiUrl}/${videoId}`);
  }

  getSubscribeStatus(userId: number, channelName: string): Observable<SubscribeStatusApiResponse> {
    return this.http.get<SubscribeStatusApiResponse>(
      `http://localhost:3000/users/${userId}/subscribed-channels/${encodeURIComponent(channelName)}`
    );
  }

  subscribeToChannel(userId: number, channelName: string): Observable<void> {
    return this.http.post<void>(
      `http://localhost:3000/users/${userId}/subscribed-channels/${encodeURIComponent(channelName)}`,
      {}
    );
  }

  unsubscribeFromChannel(userId: number, channelName: string): Observable<void> {
    return this.http.delete<void>(
      `http://localhost:3000/users/${userId}/subscribed-channels/${encodeURIComponent(channelName)}`
    );
  }

  getComments(videoId: number): Observable<VideoCommentsApiResponse> {
    return this.http.get<VideoCommentsApiResponse>(`http://localhost:3000/videos/${videoId}/comments`);
  }

  postComment(videoId: number, text: string): Observable<ApiVideoComment> {
    return this.http.post<ApiVideoComment>(`http://localhost:3000/videos/${videoId}/comments`, { text });
  }

  updateComment(commentId: number, text: string): Observable<ApiVideoComment> {
    return this.http.put<ApiVideoComment>(`http://localhost:3000/comments/${commentId}`, { text });
  }
}

