import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';

type SubscribedChannel = {
  channelName?: string;
};

type SubscribedChannelsApiResponse =
  | SubscribedChannel[]
  | string[]
  | { data?: SubscribedChannel[] | string[]; channels?: SubscribedChannel[] | string[] };

@Injectable({ providedIn: 'root' })
export class SubscriptionsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000';

  getUserSubscribedChannels(userId: number): Observable<string[]> {
    return this.http.get<SubscribedChannelsApiResponse>(`${this.baseUrl}/users/${userId}/subscribed-channels`).pipe(
      map((response) => this.normalizeChannels(response))
    );
  }

  unsubscribeChannel(userId: number, channelName: string): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/users/${userId}/subscribed-channels/${encodeURIComponent(channelName.trim())}`
    );
  }

  private normalizeChannels(response: SubscribedChannelsApiResponse): string[] {
    const source = Array.isArray(response)
      ? response
      : response.channels ?? response.data ?? [];

    return source
      .map((entry) => {
        if (typeof entry === 'string') {
          return entry;
        }

        return entry.channelName ?? '';
      })
      .map((name) => name.trim())
      .filter((name) => Boolean(name));
  }
}

