import '@angular/compiler';
import {
  Injector,
  runInInjectionContext,
  ɵChangeDetectionScheduler as ChangeDetectionScheduler,
  ɵEffectScheduler as EffectScheduler
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../auth.service';
import { PlaylistService } from '../playlist.service';
import { VideoCard, VideoComment } from '../video.model';
import { VideosService } from '../videos.service';
import { VideoDetailsComponent } from './video-details';

type VideoDetailsLike = {
  ngOnInit: () => void;
  onToggleLike: () => void;
  onSubscribeToChannel: () => void;
  onStartVideo: () => void;
  onPostComment: () => void;
  onAddToPlaylist: () => void;
  startEditComment: (comment: VideoComment) => void;
  submitEditComment: () => void;
  video: VideoCard | null;
  isLoading: boolean;
  errorMessage: string;
  isLiked: boolean;
  isLikeSubmitting: boolean;
  likeError: string;
  likeSuccess: string;
  isSubscribed: boolean;
  isSubscribeSubmitting: boolean;
  subscribeError: string;
  subscribeSuccess: string;
  comments: VideoComment[];
  commentsError: string;
  playlists: Array<{ id: number; videoIds: number[] }>;
  selectedPlaylistId: number | null;
  addToPlaylistError: string;
  addToPlaylistSuccess: string;
  isVideoPlaying: boolean;
  videoSourceUrl: string | null;
  newCommentText: string;
  postCommentError: string;
  postCommentSuccess: string;
  editingCommentId: number | null;
  editCommentText: string;
  editCommentError: string;
};

describe('VideoDetailsComponent (Vitest)', () => {
  let component: VideoDetailsLike;
  let routeVideoId: string | null;
  let currentUser: { id: number; username: string } | null;

  const httpMock = {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    put: vi.fn()
  };

  const authServiceMock = {
    isLoggedIn: vi.fn(() => Boolean(currentUser)),
    currentUser: vi.fn(() => currentUser)
  };

  const videosServiceMock = {
    likeVid: vi.fn(() => ({ status: 'IDLE' })),
    unlikeVid: vi.fn(() => ({ status: 'IDLE' })),
    likeVideo: vi.fn(),
    unlikeVideo: vi.fn(),
    getVideoLikeStatus: vi.fn(() => of(false)),
    recordWatchHistory: vi.fn(() => of(void 0))
  };

  const playlistServiceMock = {
    getUserPlaylists: vi.fn(() => of([])),
    addVideoToPlaylist: vi.fn(() => of(void 0))
  };

  const changeDetectionSchedulerMock = { notify: vi.fn() };
  const effectSchedulerMock = {
    add: vi.fn(),
    remove: vi.fn(),
    schedule: vi.fn(),
    flush: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    routeVideoId = '7';
    currentUser = null;

    const activatedRouteMock = {
      snapshot: {
        paramMap: {
          get: vi.fn((key: string) => (key === 'id' ? routeVideoId : null))
        }
      }
    };

    const injector = Injector.create({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        { provide: HttpClient, useValue: httpMock },
        { provide: VideosService, useValue: videosServiceMock },
        { provide: PlaylistService, useValue: playlistServiceMock },
        { provide: ChangeDetectionScheduler, useValue: changeDetectionSchedulerMock },
        { provide: EffectScheduler, useValue: effectSchedulerMock }
      ]
    });

    component = runInInjectionContext(injector, () => new VideoDetailsComponent()) as unknown as VideoDetailsLike;
  });

  it('shows an error for invalid route id', () => {
    routeVideoId = 'abc';

    component.ngOnInit();

    expect(component.isLoading).toBe(false);
    expect(component.errorMessage).toBe('Invalid video id.');
    expect(httpMock.get).not.toHaveBeenCalled();
  });

  it('loads video details, comments, like status, and playlists on init', () => {
    currentUser = { id: 12, username: 'demo' };

    const apiVideo = {
      id: 7,
      thumbnailUrl: 'thumb',
      authorImageUrl: 'author',
      title: 'Video 7',
      channelName: 'Channel 7',
      categoryId: 3,
      categoryName: 'Music',
      videoUrl: 'https://example.com/video.mp4',
      meta: '10K views'
    };

    const apiComments = [
      { id: 1, videoId: 7, userId: 12, username: 'demo', text: 'Nice!', createdAt: 'a', updatedAt: 'b' }
    ];

    httpMock.get.mockImplementation((url: string) => {
      if (url === 'http://localhost:3000/get-video/7') {
        return of(apiVideo);
      }

      if (url === 'http://localhost:3000/users/12/subscribed-channels/Channel%207') {
        return of({ userId: 12, channelName: 'Channel 7', subscribed: true });
      }

      if (url === 'http://localhost:3000/videos/7/comments') {
        return of(apiComments);
      }

      return throwError(() => new Error(`Unexpected GET: ${url}`));
    });

    videosServiceMock.getVideoLikeStatus.mockReturnValue(of(true));
    playlistServiceMock.getUserPlaylists.mockReturnValue(
      // @ts-ignore
      of([{ id: 11, userId: 12, name: 'Favs', description: '', videoIds: [], createdAt: '', updatedAt: '' }])
    );

    component.ngOnInit();

    expect(component.errorMessage).toBe('');
    expect(component.isLoading).toBe(false);
    expect(component.video?.id).toBe(7);
    expect(component.videoSourceUrl).toBe('https://example.com/video.mp4');
    expect(component.comments.length).toBe(1);
    expect(component.isLiked).toBe(true);
    expect(component.isSubscribed).toBe(true);
    expect(playlistServiceMock.getUserPlaylists).toHaveBeenCalledWith(12);
    expect(component.selectedPlaylistId).toBe(11);
  });

  it('shows video loading error when video request fails', () => {
    httpMock.get.mockReturnValueOnce(throwError(() => new Error('boom')));

    component.ngOnInit();

    expect(component.isLoading).toBe(false);
    expect(component.video).toBeNull();
    expect(component.errorMessage).toBe('Unable to load video details.');
  });

  it('blocks liking when user is not logged in', () => {
    component.video = {
      id: 3,
      thumbnailUrl: 't',
      authorImageUrl: 'a',
      title: 'Video',
      channelName: 'Channel',
      meta: 'meta'
    };

    component.onToggleLike();

    expect(component.likeError).toBe('You must be logged in to like this video.');
    expect(videosServiceMock.likeVideo).not.toHaveBeenCalled();
    expect(videosServiceMock.unlikeVideo).not.toHaveBeenCalled();
  });

  it('likes an unliked video for a logged-in user', () => {
    currentUser = { id: 4, username: 'demo' };
    component.video = {
      id: 9,
      thumbnailUrl: 't',
      authorImageUrl: 'a',
      title: 'Video',
      channelName: 'Channel',
      meta: 'meta'
    };

    component.onToggleLike();

    expect(component.isLiked).toBe(true);
    expect(component.isLikeSubmitting).toBe(true);
    expect(videosServiceMock.likeVideo).toHaveBeenCalledWith(4, 9);
  });

  it('blocks subscribing when user is not logged in', () => {
    component.video = {
      id: 9,
      thumbnailUrl: 't',
      authorImageUrl: 'a',
      title: 'Video',
      channelName: 'Channel 9',
      meta: 'meta'
    };

    component.onSubscribeToChannel();

    expect(component.subscribeError).toBe('You must be logged in to subscribe to channels.');
    expect(httpMock.post).not.toHaveBeenCalled();
  });

  it('subscribes to channel for a logged-in user', () => {
    currentUser = { id: 4, username: 'demo' };
    component.video = {
      id: 9,
      thumbnailUrl: 't',
      authorImageUrl: 'a',
      title: 'Video',
      channelName: 'Channel 9',
      meta: 'meta'
    };
    httpMock.post.mockReturnValue(of(void 0));

    component.onSubscribeToChannel();

    expect(httpMock.post).toHaveBeenCalledWith(
      'http://localhost:3000/users/4/subscribed-channels/Channel%209',
      {}
    );
    expect(component.isSubscribed).toBe(true);
    expect(component.subscribeSuccess).toBe('Subscribed to channel.');
  });

  it('unsubscribes from channel for a logged-in user', () => {
    currentUser = { id: 4, username: 'demo' };
    component.video = {
      id: 9,
      thumbnailUrl: 't',
      authorImageUrl: 'a',
      title: 'Video',
      channelName: 'Channel 9',
      meta: 'meta'
    };
    component.isSubscribed = true;
    httpMock.delete.mockReturnValue(of(void 0));

    component.onSubscribeToChannel();

    expect(httpMock.delete).toHaveBeenCalledWith(
      'http://localhost:3000/users/4/subscribed-channels/Channel%209'
    );
    expect(component.isSubscribed).toBe(false);
    expect(component.subscribeSuccess).toBe('Unsubscribed from channel.');
  });

  it('records watch history when playback starts for logged-in users', () => {
    currentUser = { id: 4, username: 'demo' };
    component.video = {
      id: 10,
      thumbnailUrl: 't',
      authorImageUrl: 'a',
      title: 'Video',
      channelName: 'Channel',
      meta: 'meta'
    };
    component.videoSourceUrl = 'https://example.com/video.mp4';

    component.onStartVideo();

    expect(component.isVideoPlaying).toBe(true);
    expect(videosServiceMock.recordWatchHistory).toHaveBeenCalledWith(4, 10);
  });

  it('posts a comment and prepends normalized result', () => {
    currentUser = { id: 4, username: 'demo' };
    component.video = {
      id: 7,
      thumbnailUrl: 't',
      authorImageUrl: 'a',
      title: 'Video',
      channelName: 'Channel',
      meta: 'meta'
    };
    component.newCommentText = '  hello world  ';

    httpMock.post.mockReturnValue(
      of({ id: 99, videoId: 7, userId: 4, username: 'demo', text: '  hello world  ', createdAt: 'c', updatedAt: 'u' })
    );

    component.onPostComment();

    expect(httpMock.post).toHaveBeenCalledWith('http://localhost:3000/videos/7/comments', { text: 'hello world' });
    expect(component.comments[0].text).toBe('hello world');
    expect(component.newCommentText).toBe('');
    expect(component.postCommentSuccess).toBe('Comment posted.');
  });

  it('prevents adding a duplicate video to playlist', () => {
    currentUser = { id: 4, username: 'demo' };
    component.video = {
      id: 7,
      thumbnailUrl: 't',
      authorImageUrl: 'a',
      title: 'Video',
      channelName: 'Channel',
      meta: 'meta'
    };
    component.selectedPlaylistId = 21;
    component.playlists = [{ id: 21, videoIds: [7] }];

    component.onAddToPlaylist();

    expect(component.addToPlaylistError).toBe('This video is already in the selected playlist.');
    expect(playlistServiceMock.addVideoToPlaylist).not.toHaveBeenCalled();
  });

  it('adds a video to playlist and updates local playlist state', () => {
    currentUser = { id: 4, username: 'demo' };
    component.video = {
      id: 8,
      thumbnailUrl: 't',
      authorImageUrl: 'a',
      title: 'Video',
      channelName: 'Channel',
      meta: 'meta'
    };
    component.selectedPlaylistId = 21;
    component.playlists = [{ id: 21, videoIds: [] }];

    component.onAddToPlaylist();

    expect(playlistServiceMock.addVideoToPlaylist).toHaveBeenCalledWith(4, 21, 8);
    expect(component.playlists[0].videoIds).toEqual([8]);
    expect(component.addToPlaylistSuccess).toBe('Video added to playlist.');
  });

  it('updates an existing comment on edit submit', () => {
    component.video = {
      id: 7,
      thumbnailUrl: 't',
      authorImageUrl: 'a',
      title: 'Video',
      channelName: 'Channel',
      meta: 'meta'
    };
    component.comments = [
      { id: 30, videoId: 7, userId: 4, username: 'demo', text: 'old', createdAt: 'a', updatedAt: 'a' }
    ];

    component.startEditComment(component.comments[0]);
    component.editCommentText = '  new text  ';

    httpMock.put.mockReturnValue(
      of({ id: 30, videoId: 7, userId: 4, username: 'demo', text: '  new text  ', createdAt: 'a', updatedAt: 'b' })
    );

    component.submitEditComment();

    expect(httpMock.put).toHaveBeenCalledWith('http://localhost:3000/comments/30', { text: 'new text' });
    expect(component.comments[0].text).toBe('new text');
    expect(component.editingCommentId).toBeNull();
    expect(component.editCommentText).toBe('');
  });
});

