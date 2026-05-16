import { Component, OnInit, effect, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';
import { ApiVideo, ApiVideoComment, Playlist, VideoCard, VideoComment } from '../video.model';
import { PlaylistService } from '../playlist.service';
import { VideosService } from '../videos.service';
import { VideoDetailsApiService, VideoByIdApiResponse } from './video-details-api.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-video-details',
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './video-details.html',
  styleUrl: './video-details.css'
})
export class VideoDetailsComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly videoDetailsApiService = inject(VideoDetailsApiService);

  protected video: VideoCard | null = null;
  protected isLoading = true;
  protected errorMessage = '';
  protected isLiked = false;
  protected isLikeSubmitting = false;
  protected likeError = '';
  protected likeSuccess = '';
  protected isSubscribed = false;
  protected isSubscribeSubmitting = false;
  protected subscribeError = '';
  protected subscribeSuccess = '';
  protected comments: VideoComment[] = [];
  protected isCommentsLoading = false;
  protected commentsError = '';
  protected playlists: Playlist[] = [];
  protected isLoadingPlaylists = false;
  protected playlistsError = '';
  protected selectedPlaylistId: number | null = null;
  protected isAddingToPlaylist = false;
  protected addToPlaylistError = '';
  protected addToPlaylistSuccess = '';
  protected isVideoPlaying = false;
  protected videoSourceUrl: string | null = null;

  // create comment
  protected newCommentText = '';
  protected isPostingComment = false;
  protected postCommentError = '';
  protected postCommentSuccess = '';

  // edit comment
  protected editingCommentId: number | null = null;
  protected editCommentText = '';
  protected isSubmittingEdit = false;
  protected editCommentError = '';

  private readonly videoService = inject(VideosService);
  private readonly playlistService = inject(PlaylistService);
  private pendingLikeAction: 'LIKE' | 'UNLIKE' | null = null;

  constructor() {
    effect(() => {
      const state = this.videoService.likeVid();
      if (this.pendingLikeAction !== 'LIKE') {
        return;
      }

      if (state.status === 'OK') {
        this.isLikeSubmitting = false;
        this.pendingLikeAction = null;
        this.likeError = '';
        this.likeSuccess = 'Added to liked videos.';
      } else if (state.status === 'ERROR') {
        this.isLikeSubmitting = false;
        this.pendingLikeAction = null;
        this.isLiked = false;
        this.likeSuccess = '';
        this.likeError = 'Failed to like this video. Please try again.';
      }
    });

    effect(() => {
      const state = this.videoService.unlikeVid();
      if (this.pendingLikeAction !== 'UNLIKE') {
        return;
      }

      if (state.status === 'OK') {
        this.isLikeSubmitting = false;
        this.pendingLikeAction = null;
        this.likeError = '';
        this.likeSuccess = 'Removed from liked videos.';
      } else if (state.status === 'ERROR') {
        this.isLikeSubmitting = false;
        this.pendingLikeAction = null;
        this.isLiked = true;
        this.likeSuccess = '';
        this.likeError = 'Failed to remove like. Please try again.';
      }
    });
  }

  protected get authRoute(): string {
    return this.authService.isLoggedIn() ? '/logout' : '/login';
  }

  protected get authLabel(): string {
    return this.authService.isLoggedIn() ? 'Logout' : 'Login';
  }

  protected get isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id) || id <= 0) {
      this.isLoading = false;
      this.errorMessage = 'Invalid video id.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.videoDetailsApiService.getVideoById(id).subscribe({
      next: (response) => {
        const rawVideo = this.extractVideo(response);
        this.video = rawVideo
          ? {
              id: rawVideo.id ?? id,
              thumbnailUrl: rawVideo.thumbnailUrl ?? rawVideo.thumbnail ?? '',
              authorImageUrl: rawVideo.authorImageUrl ?? rawVideo.authorImage ?? '/profile.png',
              title: rawVideo.title ?? 'Untitled video',
              channelName: rawVideo.channelName ?? rawVideo.channel ?? 'Unknown channel',
              categoryId: typeof rawVideo.categoryId === 'number' ? rawVideo.categoryId : undefined,
              categoryName: rawVideo.categoryName ?? rawVideo.category,
              category: rawVideo.category ?? rawVideo.categoryName,
              meta: rawVideo.meta ?? [rawVideo.views, rawVideo.publishedAt].filter(Boolean).join(' • ')
            }
          : null;

        this.isVideoPlaying = false;
        this.videoSourceUrl = rawVideo ? this.resolveVideoSource(rawVideo) : null;

        if (this.video) {
          this.syncLikeStatus(this.video.id);
          this.syncSubscribeStatus(this.video.channelName);
          this.loadComments(this.video.id);
          this.loadPlaylists();
        } else {
          this.comments = [];
          this.commentsError = '';
          this.isCommentsLoading = false;
          this.resetSubscribeState();
          this.resetPlaylistState();
        }

        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.video = null;
        this.comments = [];
        this.isCommentsLoading = false;
        this.commentsError = '';
        this.isVideoPlaying = false;
        this.videoSourceUrl = null;
        this.resetSubscribeState();
        this.resetPlaylistState();
        this.errorMessage = 'Unable to load video details.';
      }
    });
  }

  protected onToggleLike(): void {
    const userId = this.authService.currentUser()?.id;
    const videoId = this.video?.id;

    if (!userId || !videoId) {
      this.likeSuccess = '';
      this.likeError = 'You must be logged in to like this video.';
      return;
    }

    if (this.isLikeSubmitting) {
      return;
    }

    this.isLikeSubmitting = true;
    this.likeError = '';
    this.likeSuccess = '';

    if (this.isLiked) {
      this.isLiked = false;
      this.pendingLikeAction = 'UNLIKE';
      this.videoService.unlikeVideo(userId, videoId);
      return;
    }

    this.isLiked = true;
    this.pendingLikeAction = 'LIKE';
    this.videoService.likeVideo(userId, videoId);
  }

  protected onStartVideo(): void {
    if (!this.videoSourceUrl) {
      return;
    }

    this.isVideoPlaying = true;

    const userId = this.authService.currentUser()?.id;
    const videoId = this.video?.id;
    if (!userId || !videoId) {
      return;
    }

    // Record watch event in the background; playback should never wait for this call.
    this.videoService.recordWatchHistory(userId, videoId).subscribe({
      error: () => {
        // Ignore failures silently to avoid interrupting playback UX.
      }
    });
  }

  protected onSubscribeToChannel(): void {
    const userId = this.authService.currentUser()?.id;
    const channelName = this.video?.channelName?.trim();

    this.subscribeError = '';
    this.subscribeSuccess = '';

    if (!userId) {
      this.subscribeError = 'You must be logged in to subscribe to channels.';
      return;
    }

    if (!channelName) {
      this.subscribeError = 'Channel is unavailable.';
      return;
    }

    if (this.isSubscribeSubmitting) {
      return;
    }

    this.isSubscribeSubmitting = true;

    if (this.isSubscribed) {
      this.videoDetailsApiService.unsubscribeFromChannel(userId, channelName).subscribe({
        next: () => {
          this.isSubscribeSubmitting = false;
          this.isSubscribed = false;
          this.subscribeSuccess = 'Unsubscribed from channel.';
        },
        error: () => {
          this.isSubscribeSubmitting = false;
          this.subscribeError = 'Failed to unsubscribe. Please try again.';
        }
      });
      return;
    }

    this.videoDetailsApiService.subscribeToChannel(userId, channelName).subscribe({
      next: () => {
        this.isSubscribeSubmitting = false;
        this.isSubscribed = true;
        this.subscribeSuccess = 'Subscribed to channel.';
      },
      error: () => {
        this.isSubscribeSubmitting = false;
        this.subscribeError = 'Failed to subscribe. Please try again.';
      }
    });
  }

  private syncLikeStatus(videoId: number): void {
    const userId = this.authService.currentUser()?.id;
    if (!userId) {
      this.isLiked = false;
      return;
    }

    this.videoService.getVideoLikeStatus(userId, videoId)
      .subscribe((isLiked) => {
        this.isLiked = isLiked;
      });
  }

  private syncSubscribeStatus(channelName: string): void {
    const userId = this.authService.currentUser()?.id;
    const normalizedChannelName = channelName.trim();

    if (!userId || !normalizedChannelName) {
      this.resetSubscribeState();
      return;
    }

    this.videoDetailsApiService.getSubscribeStatus(userId, normalizedChannelName).subscribe({
      next: (response) => {
        this.isSubscribed = Boolean(response?.subscribed);
      },
      error: () => {
        this.isSubscribed = false;
      }
    });
  }

  protected isCurrentUser(userId: number): boolean {
    return this.authService.currentUser()?.id === userId;
  }

  protected onPostComment(): void {
    const videoId = this.video?.id;
    const text = this.newCommentText.trim();

    if (!this.authService.isLoggedIn()) {
      this.postCommentError = 'You must be logged in to comment.';
      return;
    }

    if (!text) {
      this.postCommentError = 'Comment cannot be empty.';
      return;
    }

    if (!videoId) {
      return;
    }

    this.isPostingComment = true;
    this.postCommentError = '';
    this.postCommentSuccess = '';

    this.videoDetailsApiService.postComment(videoId, text)
      .subscribe({
        next: (comment) => {
          this.comments = [this.normalizeComment(comment, videoId), ...this.comments];
          this.newCommentText = '';
          this.isPostingComment = false;
          this.postCommentSuccess = 'Comment posted.';
        },
        error: () => {
          this.isPostingComment = false;
          this.postCommentError = 'Failed to post comment. Please try again.';
        }
      });
  }

  protected onAddToPlaylist(): void {
    const userId = this.authService.currentUser()?.id;
    const videoId = this.video?.id;

    this.addToPlaylistError = '';
    this.addToPlaylistSuccess = '';

    if (!userId) {
      this.addToPlaylistError = 'You must be logged in to save this video to a playlist.';
      return;
    }

    if (!videoId) {
      this.addToPlaylistError = 'Video is unavailable.';
      return;
    }

    if (this.selectedPlaylistId === null) {
      this.addToPlaylistError = 'Select a playlist first.';
      return;
    }

    if (this.isAddingToPlaylist) {
      return;
    }

    const selectedPlaylist = this.playlists.find((playlist) => playlist.id === this.selectedPlaylistId);
    if (selectedPlaylist?.videoIds.includes(videoId)) {
      this.addToPlaylistError = 'This video is already in the selected playlist.';
      return;
    }

    this.isAddingToPlaylist = true;
    this.playlistService.addVideoToPlaylist(userId, this.selectedPlaylistId, videoId).subscribe({
      next: () => {
        this.playlists = this.playlists.map((playlist) =>
          playlist.id === this.selectedPlaylistId
            ? { ...playlist, videoIds: [...playlist.videoIds, videoId] }
            : playlist
        );
        this.isAddingToPlaylist = false;
        this.addToPlaylistSuccess = 'Video added to playlist.';
      },
      error: (err) => {
        this.isAddingToPlaylist = false;
        this.addToPlaylistError = err?.error?.message || 'Failed to add video to playlist. Please try again.';
      }
    });
  }

  protected startEditComment(comment: VideoComment): void {
    this.editingCommentId = comment.id;
    this.editCommentText = comment.text;
    this.editCommentError = '';
  }

  protected cancelEditComment(): void {
    this.editingCommentId = null;
    this.editCommentText = '';
    this.editCommentError = '';
  }

  protected submitEditComment(): void {
    const videoId = this.video?.id;
    const text = this.editCommentText.trim();

    if (!text) {
      this.editCommentError = 'Comment cannot be empty.';
      return;
    }

    if (!videoId || this.editingCommentId === null) {
      return;
    }

    this.isSubmittingEdit = true;
    this.editCommentError = '';

    this.videoDetailsApiService.updateComment(this.editingCommentId, text).subscribe({
      next: (updated) => {
        const normalized = this.normalizeComment(updated, videoId);
        this.comments = this.comments.map((c) =>
          c.id === normalized.id ? normalized : c
        );
        this.isSubmittingEdit = false;
        this.editingCommentId = null;
        this.editCommentText = '';
      },
      error: () => {
        this.isSubmittingEdit = false;
        this.editCommentError = 'Failed to update comment. Please try again.';
      }
    });
  }

  private loadPlaylists(): void {
    const userId = this.authService.currentUser()?.id;
    this.resetPlaylistState();

    if (!userId) {
      return;
    }

    this.isLoadingPlaylists = true;
    this.playlistService.getUserPlaylists(userId).subscribe({
      next: (response) => {
        this.playlists = Array.isArray(response) ? response : response.data ?? [];
        this.selectedPlaylistId = this.playlists.length ? this.playlists[0].id : null;
        this.isLoadingPlaylists = false;
      },
      error: () => {
        this.isLoadingPlaylists = false;
        this.playlistsError = 'Unable to load playlists.';
      }
    });
  }

  private resetPlaylistState(): void {
    this.playlists = [];
    this.isLoadingPlaylists = false;
    this.playlistsError = '';
    this.selectedPlaylistId = null;
    this.isAddingToPlaylist = false;
    this.addToPlaylistError = '';
    this.addToPlaylistSuccess = '';
  }

  private resetSubscribeState(): void {
    this.isSubscribed = false;
    this.isSubscribeSubmitting = false;
    this.subscribeError = '';
    this.subscribeSuccess = '';
  }

  private loadComments(videoId: number): void {
    this.isCommentsLoading = true;
    this.commentsError = '';
    this.comments = [];

    this.videoDetailsApiService.getComments(videoId).subscribe({
      next: (response) => {
        const apiComments = Array.isArray(response)
          ? response
          : response.comments ?? response.data ?? [];

        this.comments = apiComments.map((comment) => this.normalizeComment(comment, videoId));
        this.isCommentsLoading = false;
      },
      error: () => {
        this.isCommentsLoading = false;
        this.comments = [];
        this.commentsError = 'Unable to load comments.';
      }
    });
  }

  private resolveVideoSource(video: ApiVideo): string | null {
    const raw = video as unknown as Record<string, unknown>;
    const candidates = [
      raw['videoUrl'],
      raw['videoSrc'],
      raw['src'],
      raw['url'],
      raw['videoPath'],
      raw['mediaUrl'],
      raw['videoSourceUrl']
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }

    return null;
  }

  private normalizeComment(comment: ApiVideoComment, fallbackVideoId: number): VideoComment {
    return {
      id: comment.id,
      videoId: typeof comment.videoId === 'number' ? comment.videoId : fallbackVideoId,
      userId: typeof comment.userId === 'number' ? comment.userId : 0,
      username: comment.username?.trim() || 'Unknown user',
      text: comment.text?.trim() || '',
      createdAt: comment.createdAt || '',
      updatedAt: comment.updatedAt || ''
    };
  }

  private extractVideo(response: VideoByIdApiResponse): ApiVideo | null {
    if (!response || typeof response !== 'object' || Array.isArray(response)) {
      return null;
    }

    if ('data' in response || 'video' in response) {
      return response.data ?? response.video ?? null;
    }

    return response as ApiVideo;
  }
}

