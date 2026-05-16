import {HttpClient, HttpErrorResponse} from '@angular/common/http';
import {Injectable, inject, WritableSignal, signal, computed} from '@angular/core';
import { catchError, map, Observable, of } from 'rxjs';
import {ApiVideo, VideoCard, VideoUploadPayload, VideoCardAdd} from './video.model';
import {State} from './state.model';



type VideosApiResponse = ApiVideo[] | { videos?: ApiVideo[]; data?: ApiVideo[] };
type VideosPagedApiResponse = {
  page?: number;
  limit?: number;
  total?: number;
  hasMore?: boolean;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
  data: ApiVideo[];
};


type VideoByIdApiResponse = ApiVideo | { data?: ApiVideo | null; video?: ApiVideo | null };
type LikedVideoStatusApiResponse =
  | { liked?: boolean; isLiked?: boolean; status?: 'liked' | 'not-liked' }
  | { data?: { liked?: boolean; isLiked?: boolean; status?: 'liked' | 'not-liked' } };
type TrendingVideosApiResponse = { trendingVideoIds?: number[] };
type VideosByIdsApiResponse = { videos?: ApiVideo[]; missingIds?: number[] };

@Injectable({
  providedIn: 'root'
})
export class VideosService {
      private toApiVideoPayload(payload: VideoUploadPayload): VideoUploadPayload & { acategoryId: number } {
        return {
          ...payload,
          acategoryId: payload.categoryId
        };
      }

  private readonly http = inject(HttpClient);
  private readonly videosApiUrl = 'http://localhost:3000/get-videos-paginated';
  private readonly searchVideosApiUrl = 'http://localhost:3000/search';
  private readonly videoByIdApiUrl = 'http://localhost:3000/get-video';
  private readonly uploadVideoApiUrl = 'http://localhost:3000/add-video';
  private readonly deleteVideoApiUrl = 'http://localhost:3000/delete-video';
  private readonly trendingVideosApiUrl = 'http://localhost:3000/trending-videos';
  private readonly videosByIdsApiUrl = 'http://localhost:3000/videos/by-ids';
  private readonly pageSize = 5;
  private currentPage = 1;
  private currentQuery = '';
  private isSearchMode = false;

  getVideos(): Observable<VideoCard[]> {
    return this.http.get<VideosApiResponse>(this.videosApiUrl).pipe(
      map((response) => this.normalizeVideos(response))
    );
  }

  private add$: WritableSignal<State<VideoCardAdd, HttpErrorResponse>> =
    signal(State.Builder<VideoCardAdd, HttpErrorResponse>().forInit().build());
  addVid = computed(() => this.add$());

  private edit$: WritableSignal<State<VideoCardAdd, HttpErrorResponse>> =
    signal(State.Builder<VideoCardAdd, HttpErrorResponse>().forInit().build());
  editVid = computed(() => this.edit$());

  private delete$: WritableSignal<State<unknown, HttpErrorResponse>> =
    signal(State.Builder<unknown, HttpErrorResponse>().forInit().build());
  deleteVid = computed(() => this.delete$());

  private getAll$: WritableSignal<State<Array<VideoCard>, HttpErrorResponse>> =
    signal(State.Builder<Array<VideoCard>, HttpErrorResponse>().forInit().build());
  getAllVideos = computed(() => this.getAll$());

  private like$: WritableSignal<State<unknown, HttpErrorResponse>> =
    signal(State.Builder<unknown, HttpErrorResponse>().forInit().build());
  likeVid = computed(() => this.like$());

  private unlike$: WritableSignal<State<unknown, HttpErrorResponse>> =
    signal(State.Builder<unknown, HttpErrorResponse>().forInit().build());
  unlikeVid = computed(() => this.unlike$());

  likeVideo(userId: number, videoId: number): void {
    this.http.post(`http://localhost:3000/users/${userId}/liked-videos/${videoId}`, {})
      .subscribe({
        next: (response) => this.like$.set(State.Builder<unknown, HttpErrorResponse>().forSuccess(response).build()),
        error: (err) => this.like$.set(State.Builder<unknown, HttpErrorResponse>().forError(err).build())
      });
  }

  unlikeVideo(userId: number, videoId: number): void {
    this.http.delete(`http://localhost:3000/users/${userId}/liked-videos/${videoId}`)
      .subscribe({
        next: (response) => this.unlike$.set(State.Builder<unknown, HttpErrorResponse>().forSuccess(response).build()),
        error: (err) => this.unlike$.set(State.Builder<unknown, HttpErrorResponse>().forError(err).build())
      });
  }

  recordWatchHistory(userId: number, videoId: number): Observable<void> {
    return this.http.post<void>(`http://localhost:3000/users/${userId}/watch-history/${videoId}`, {});
  }

  getVideoLikeStatus(userId: number, videoId: number): Observable<boolean> {
    return this.http.get<LikedVideoStatusApiResponse>(`http://localhost:3000/users/${userId}/liked-videos/${videoId}`).pipe(
      map((response) => this.resolveLikedStatus(response)),
      catchError(() => of(false))
    );
  }

  private likedVideos$: WritableSignal<State<Array<VideoCard>, HttpErrorResponse>> =
    signal(State.Builder<Array<VideoCard>, HttpErrorResponse>().forInit().build());
  getLikedVideosState = computed(() => this.likedVideos$());

  getLikedVideosAPI(userId: number): void {
    this.likedVideos$.set(State.Builder<Array<VideoCard>, HttpErrorResponse>().forInit().build());
    this.http.get<VideosApiResponse>(`http://localhost:3000/users/${userId}/liked-videos`)
      .subscribe({
        next: (response) => {
          const videos = this.normalizeVideos(response);
          this.likedVideos$.set(State.Builder<Array<VideoCard>, HttpErrorResponse>().forSuccess(videos).build());
        },
        error: (err) => this.likedVideos$.set(State.Builder<Array<VideoCard>, HttpErrorResponse>().forError(err).build())
      });
  }
  private getById$: WritableSignal<State<VideoCard | null, HttpErrorResponse>> =
    signal(State.Builder<VideoCard | null, HttpErrorResponse>().forInit().build());
  getVideoByIdState = computed(() => this.getById$());

  private trendingMissingIds$: WritableSignal<number[]> = signal([]);
  getTrendingMissingIds = computed(() => this.trendingMissingIds$());

  private hasMore$: WritableSignal<boolean> = signal(true);

  getCanLoadMoreVideos(): boolean {
    return this.hasMore$();
  }

  getUserVideos(userId: number): Observable<VideoCard[]> {
    return this.http.get<VideosApiResponse>(`http://localhost:3000/users/${userId}/videos`).pipe(
      map((response) => this.normalizeVideos(response))
    );
  }

  uploadVideo(payload: VideoUploadPayload): Observable<unknown> {
    return this.http.post(this.uploadVideoApiUrl, this.toApiVideoPayload(payload));
  }


  addVideo(payload : VideoUploadPayload): void {
    this.http.post<VideoCardAdd>(`http://localhost:3000/add-video`, this.toApiVideoPayload(payload))
      .subscribe({
        next: savedVid => this.add$.set(State.Builder<VideoCardAdd, HttpErrorResponse>().forSuccess(savedVid).build()),
        error: err => this.add$.set(State.Builder<VideoCardAdd, HttpErrorResponse>().forError(err).build())
      })
  }

  updateVideo(id: number, payload: VideoUploadPayload): void {
    this.http.put<VideoCardAdd>(`http://localhost:3000/update-video/${id}`, this.toApiVideoPayload(payload))
      .subscribe({
        next: updatedVid => this.edit$.set(State.Builder<VideoCardAdd, HttpErrorResponse>().forSuccess(updatedVid).build()),
        error: err => this.edit$.set(State.Builder<VideoCardAdd, HttpErrorResponse>().forError(err).build())
      })
  }

  deleteVideo(id: number): void {
    this.http.delete(`${this.deleteVideoApiUrl}/${id}`)
      .subscribe({
        next: (response) => this.delete$.set(State.Builder<unknown, HttpErrorResponse>().forSuccess(response).build()),
        error: (err) => this.delete$.set(State.Builder<unknown, HttpErrorResponse>().forError(err).build())
      });
  }


  getAllAPI(): void {
    this.currentPage = 1;
    this.currentQuery = '';
    this.isSearchMode = false;
    this.fetchVideosPage(false);
  }

  loadMoreVideos(): void {
    if (!this.hasMore$()) {
      return;
    }

    this.currentPage += 1;
    this.fetchVideosPage(true);
  }

  loadMoreVideosAPI(): void {
    this.loadMoreVideos();
  }

  searchVideosAPI(query: string): void {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      this.getAllAPI();
      return;
    }

    this.currentPage = 1;
    this.currentQuery = normalizedQuery;
    this.isSearchMode = true;
    this.fetchVideosPage(false);
  }

  getTrendingVideosAPI(limit = 5): void {
    this.currentPage = 1;
    this.currentQuery = '';
    this.isSearchMode = false;
    this.hasMore$.set(false);
    this.trendingMissingIds$.set([]);

    this.http.get<TrendingVideosApiResponse>(`${this.trendingVideosApiUrl}?limit=${limit}`)
      .subscribe({
        next: (response) => {
          const trendingVideoIds = Array.isArray(response?.trendingVideoIds)
            ? response.trendingVideoIds.filter((id): id is number => typeof id === 'number')
            : [];

          if (!trendingVideoIds.length) {
            this.getAll$.set(
              State.Builder<VideoCard[], HttpErrorResponse>()
                .forSuccess([])
                .build()
            );
            return;
          }

          this.http.post<VideosByIdsApiResponse>(this.videosByIdsApiUrl, { videoIds: trendingVideoIds })
            .subscribe({
              next: (videosResponse) => {
                const videos = this.normalizeVideos({ videos: videosResponse.videos ?? [] });
                const orderedVideos = this.sortVideosByIds(videos, trendingVideoIds);
                this.trendingMissingIds$.set(videosResponse.missingIds ?? []);
                this.getAll$.set(
                  State.Builder<VideoCard[], HttpErrorResponse>()
                    .forSuccess(orderedVideos)
                    .build()
                );
              },
              error: (err) => {
                this.getAll$.set(
                  State.Builder<VideoCard[], HttpErrorResponse>()
                    .forError(err)
                    .build()
                );
              }
            });
        },
        error: (err) => {
          this.getAll$.set(
            State.Builder<VideoCard[], HttpErrorResponse>()
              .forError(err)
              .build()
          );
        }
      });
  }

  getVideoByIdAPI(id: number): void {
    this.http.get<VideoByIdApiResponse>(`${this.videoByIdApiUrl}/${id}`)
      .subscribe({
        next: (response) => {
          const video = this.normalizeSingleVideo(response, id);
          this.getById$.set(
            State.Builder<VideoCard | null, HttpErrorResponse>()
              .forSuccess(video)
              .build()
          );
        },
        error: (err) => {
          this.getById$.set(
            State.Builder<VideoCard | null, HttpErrorResponse>()
              .forError(err)
              .build()
          );
        }
      });
  }

  private fetchVideosPage(append: boolean): void {
    const url = this.isSearchMode ? this.searchVideosApiUrl : this.videosApiUrl;
    const queryParam = this.isSearchMode ? `q=${encodeURIComponent(this.currentQuery)}&` : '';
    const requestUrl = `${url}?${queryParam}page=${this.currentPage}&limit=${this.pageSize}`;

    this.http.get<VideosPagedApiResponse>(requestUrl)
      .subscribe({
        next: (response) => {
          const videoCards = this.normalizeVideos(response);
          const existingVideos = append ? this.getAll$().value ?? [] : [];
          const mergedVideos = append ? this.mergeVideos(existingVideos, videoCards) : videoCards;
          const hasMore = this.resolveHasMore(response, videoCards.length);

          this.hasMore$.set(hasMore);
          this.getAll$.set(
            State.Builder<VideoCard[], HttpErrorResponse>()
              .forSuccess(mergedVideos)
              .build()
          );
        },
        error: (err) => {
          this.getAll$.set(
            State.Builder<VideoCard[], HttpErrorResponse>()
              .forError(err)
              .build()
          );
          if (append) {
            this.currentPage = Math.max(1, this.currentPage - 1);
          }
        }

      });
  }

  private mergeVideos(existingVideos: VideoCard[], incomingVideos: VideoCard[]): VideoCard[] {
    const videoById = new Map<number, VideoCard>();
    existingVideos.forEach((video) => videoById.set(video.id, video));
    incomingVideos.forEach((video) => videoById.set(video.id, video));
    return [...videoById.values()];
  }

  private sortVideosByIds(videos: VideoCard[], orderedIds: number[]): VideoCard[] {
    const videoMap = new Map<number, VideoCard>();
    videos.forEach((video) => videoMap.set(video.id, video));
    return orderedIds
      .map((id) => videoMap.get(id))
      .filter((video): video is VideoCard => Boolean(video));
  }

  private resolveHasMore(response: VideosPagedApiResponse, incomingCount: number): boolean {
    const responseLimit =
      typeof response === 'object' && response !== null && typeof response.limit === 'number'
        ? response.limit
        : undefined;

    if (typeof response === 'object' && response !== null && 'hasNextPage' in response && typeof response.hasNextPage === 'boolean') {
      return response.hasNextPage;
    }

    if (typeof response === 'object' && response !== null && 'totalPages' in response && typeof response.totalPages === 'number') {
      return this.currentPage < response.totalPages;
    }

    if (typeof response === 'object' && response !== null && 'hasMore' in response && typeof response.hasMore === 'boolean') {
      return response.hasMore;
    }

    if (typeof response === 'object' && response !== null && 'total' in response && typeof response.total === 'number') {
      const effectiveLimit = responseLimit && responseLimit > 0 ? responseLimit : this.pageSize;
      return this.currentPage * effectiveLimit < response.total;
    }

    const effectiveLimit = responseLimit && responseLimit > 0 ? responseLimit : this.pageSize;
    return incomingCount >= effectiveLimit;
  }

  private normalizeVideos(response: VideosApiResponse): VideoCard[] {
    const apiVideos = Array.isArray(response) ? response : response.videos ?? response.data ?? [];

    return apiVideos.map((video, index) => ({
      id: video.id ?? index + 1,
      thumbnailUrl: video.thumbnailUrl ?? video.thumbnail ?? '',
      videoSourceUrl: video.videoSourceUrl ?? video.videoUrl ?? video.videoSrc ?? video.src ?? video.url ?? video.videoPath ?? video.mediaUrl ?? undefined,
      authorImageUrl: video.authorImageUrl ?? video.authorImage ?? '/profile.png',
      title: video.title ?? 'Untitled video',
      channelName: video.channelName ?? video.channel ?? 'Unknown channel',
      categoryId: typeof video.categoryId === 'number' ? video.categoryId : undefined,
      categoryName: video.categoryName ?? video.category,
      category: video.category ?? video.categoryName,
      meta: video.meta ?? this.buildMeta(video)
    }));
  }

  private normalizeSingleVideo(response: VideoByIdApiResponse, fallbackId: number): VideoCard | null {
    const rawVideo = this.extractVideoFromByIdResponse(response);

    if (!rawVideo) {
      return null;
    }

    return {
      id: rawVideo.id ?? fallbackId,
      thumbnailUrl: rawVideo.thumbnailUrl ?? rawVideo.thumbnail ?? '',
      videoSourceUrl: rawVideo.videoSourceUrl ?? rawVideo.videoUrl ?? rawVideo.videoSrc ?? rawVideo.src ?? rawVideo.url ?? rawVideo.videoPath ?? rawVideo.mediaUrl ?? undefined,
      authorImageUrl: rawVideo.authorImageUrl ?? rawVideo.authorImage ?? '/profile.png',
      title: rawVideo.title ?? 'Untitled video',
      channelName: rawVideo.channelName ?? rawVideo.channel ?? 'Unknown channel',
      categoryId: typeof rawVideo.categoryId === 'number' ? rawVideo.categoryId : undefined,
      categoryName: rawVideo.categoryName ?? rawVideo.category,
      category: rawVideo.category ?? rawVideo.categoryName,
      meta: rawVideo.meta ?? this.buildMeta(rawVideo)
    };
  }

  private extractVideoFromByIdResponse(response: VideoByIdApiResponse): ApiVideo | null {
    if (!response || Array.isArray(response) || typeof response !== 'object') {
      return null;
    }

    if ('data' in response || 'video' in response) {
      return response.data ?? response.video ?? null;
    }

    return response as ApiVideo;
  }

  private buildMeta(video: ApiVideo): string {
    return [video.views, video.publishedAt].filter(Boolean).join(' • ');
  }

  private resolveLikedStatus(response: LikedVideoStatusApiResponse): boolean {
    if (!response || typeof response !== 'object') {
      return false;
    }

    if ('liked' in response && typeof response.liked === 'boolean') {
      return response.liked;
    }

    if ('isLiked' in response && typeof response.isLiked === 'boolean') {
      return response.isLiked;
    }

    if ('status' in response && typeof response.status === 'string') {
      return response.status === 'liked';
    }

    const nested = 'data' in response ? response.data : undefined;
    if (!nested || typeof nested !== 'object') {
      return false;
    }

    if (typeof nested.liked === 'boolean') {
      return nested.liked;
    }

    if (typeof nested.isLiked === 'boolean') {
      return nested.isLiked;
    }

    return nested.status === 'liked';
  }
}

