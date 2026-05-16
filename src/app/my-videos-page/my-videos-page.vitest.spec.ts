import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../auth.service';
import { VideoCard } from '../video.model';
import { VideosService } from '../videos.service';
import { MyVideosPageComponent } from './my-videos-page';

type MyVideosPageLike = {
  ngOnInit: () => void;
  isLoading: () => boolean;
  errorMessage: () => string;
  myVideos: () => VideoCard[];
};

const videoFixture: VideoCard = {
  id: 1,
  thumbnailUrl: 'thumb',
  authorImageUrl: 'author',
  title: 'My Video',
  channelName: 'Me',
  meta: '1 view'
};

describe('MyVideosPageComponent (Vitest)', () => {
  let component: MyVideosPageLike;
  let currentUser: { id: number; username: string } | null;

  const videosServiceMock = {
    getUserVideos: vi.fn()
  };

  const authServiceMock = {
    isLoggedIn: vi.fn(() => Boolean(currentUser)),
    currentUser: vi.fn(() => currentUser)
  };

  beforeEach(() => {
    vi.clearAllMocks();
    currentUser = null;

    const injector = Injector.create({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: VideosService, useValue: videosServiceMock }
      ]
    });

    component = runInInjectionContext(injector, () => new MyVideosPageComponent()) as unknown as MyVideosPageLike;
  });

  it('shows login error when user is not logged in', () => {
    component.ngOnInit();

    expect(videosServiceMock.getUserVideos).not.toHaveBeenCalled();
    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toBe('You must be logged in to view your videos.');
  });

  it('loads user videos for logged-in user', () => {
    currentUser = { id: 7, username: 'demo' };
    videosServiceMock.getUserVideos.mockReturnValue(of([videoFixture]));

    component.ngOnInit();

    expect(videosServiceMock.getUserVideos).toHaveBeenCalledWith(7);
    expect(component.myVideos()).toEqual([videoFixture]);
    expect(component.errorMessage()).toBe('');
    expect(component.isLoading()).toBe(false);
  });

  it('shows error when request fails', () => {
    currentUser = { id: 7, username: 'demo' };
    videosServiceMock.getUserVideos.mockReturnValue(throwError(() => new Error('failed')));

    component.ngOnInit();

    expect(component.myVideos()).toEqual([]);
    expect(component.errorMessage()).toBe('Unable to load your videos.');
    expect(component.isLoading()).toBe(false);
  });
});

