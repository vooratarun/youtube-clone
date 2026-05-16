import '@angular/compiler';
import {
  Injector,
  runInInjectionContext,
  ɵChangeDetectionScheduler as ChangeDetectionScheduler,
  ɵEffectScheduler as EffectScheduler
} from '@angular/core';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { CategoryService } from '../category.service';
import { VideoCard } from '../video.model';
import { VideosService } from '../videos.service';
import { HomePageComponent } from './home-page';

type HomePageLike = {
  ngOnInit: () => void;
  isTrendingMode: () => boolean;
  selectedCategoryId: () => number | null;
  searchQuery: () => string;
  isLoadingVideos: () => boolean;
  isLoadingMore: () => boolean;
  videosError: () => string;
  videos: () => VideoCard[];
  likeError: () => string;
  likedVideoIds: () => Set<number>;
  isSidebarVisible: () => boolean;
  isCreateVideoFormOpen: () => boolean;
  openCreateVideoForm: () => void;
  onSearchInput: (event: Event) => void;
  onCategorySelect: (categoryId: number | null) => void;
  onPrimaryCategorySelect: (category: { id: number; icon: string; label: string }) => void;
  onLikeVideo: (video: VideoCard) => void;
  onEditVideo: (video: VideoCard) => void;
};

const videoFixture: VideoCard = {
  id: 10,
  thumbnailUrl: 'thumb',
  authorImageUrl: 'author',
  title: 'Video 10',
  channelName: 'Channel',
  meta: '1K views'
};

describe('HomePageComponent (Vitest)', () => {
  let component: HomePageLike;

  let currentUser: { id: number; username: string } | null;

  const videosServiceMock = {
    getAllVideos: vi.fn(() => ({ status: 'IDLE' })),
    addVid: vi.fn(() => ({ status: 'IDLE' })),
    editVid: vi.fn(() => ({ status: 'IDLE' })),
    deleteVid: vi.fn(() => ({ status: 'IDLE' })),
    likeVid: vi.fn(() => ({ status: 'IDLE' })),
    unlikeVid: vi.fn(() => ({ status: 'IDLE' })),
    getAllAPI: vi.fn(),
    searchVideosAPI: vi.fn(),
    getTrendingVideosAPI: vi.fn(),
    loadMoreVideosAPI: vi.fn(),
    getCanLoadMoreVideos: vi.fn(() => true),
    likeVideo: vi.fn(),
    unlikeVideo: vi.fn(),
    getVideoLikeStatus: vi.fn(() => of(false)),
    addVideo: vi.fn(),
    updateVideo: vi.fn(),
    deleteVideo: vi.fn()
  };

  const authServiceMock = {
    isLoggedIn: vi.fn(() => Boolean(currentUser)),
    isAdmin: vi.fn(() => false),
    currentUser: vi.fn(() => currentUser)
  };

  const categoryServiceMock = {
    getCategories: vi.fn(() => of([])),
    getVideosByCategory: vi.fn(() => of({ videos: [] })),
    createCategory: vi.fn(() => of({ id: 1, name: 'New Category', description: 'desc' }))
  };

  const routerMock = {
    navigateByUrl: vi.fn()
  };

  const changeDetectionSchedulerMock = {
    notify: vi.fn()
  };

  const effectSchedulerMock = {
    add: vi.fn(),
    remove: vi.fn(),
    schedule: vi.fn(),
    flush: vi.fn()
  };

  beforeEach(() => {
    currentUser = null;
    vi.clearAllMocks();

    categoryServiceMock.getCategories.mockReturnValue(of([]));
    categoryServiceMock.getVideosByCategory.mockReturnValue(of({ videos: [] }));

    const injector = Injector.create({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: VideosService, useValue: videosServiceMock },
        { provide: CategoryService, useValue: categoryServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: ChangeDetectionScheduler, useValue: changeDetectionSchedulerMock },
        { provide: EffectScheduler, useValue: effectSchedulerMock }
      ]
    });

    component = runInInjectionContext(injector, () => new HomePageComponent()) as unknown as HomePageLike;
  });

  it('loads videos and categories on init', () => {
    component.ngOnInit();

    expect(videosServiceMock.getAllAPI).toHaveBeenCalled();
    expect(categoryServiceMock.getCategories).toHaveBeenCalled();
  });

  it('loads trending videos from primary sidebar', () => {
    (component as any).isSidebarVisible.set(true);

    component.onPrimaryCategorySelect({ id: 2, icon: 'local_fire_department', label: 'Trending' });

    expect(component.isTrendingMode()).toBe(true);
    expect(component.selectedCategoryId()).toBeNull();
    expect(component.searchQuery()).toBe('');
    expect(component.isLoadingVideos()).toBe(true);
    expect(component.isLoadingMore()).toBe(false);
    expect(component.videosError()).toBe('');
    expect(videosServiceMock.getTrendingVideosAPI).toHaveBeenCalledWith(5);
    expect(component.isSidebarVisible()).toBe(false);
  });

  it('returns to home feed from primary sidebar', () => {
    (component as any).isTrendingMode.set(true);
    (component as any).isSidebarVisible.set(true);

    component.onPrimaryCategorySelect({ id: 1, icon: 'home', label: 'Home' });

    expect(component.isTrendingMode()).toBe(false);
    expect(component.selectedCategoryId()).toBeNull();
    expect(component.searchQuery()).toBe('');
    expect(component.isLoadingVideos()).toBe(true);
    expect(component.isLoadingMore()).toBe(false);
    expect(videosServiceMock.getAllAPI).toHaveBeenCalled();
    expect(component.isSidebarVisible()).toBe(false);
  });

  it('navigates to subscriptions page from primary sidebar', () => {
    (component as any).isSidebarVisible.set(true);

    component.onPrimaryCategorySelect({ id: 3, icon: 'subscriptions', label: 'Subscriptions' });

    expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/subscriptions');
    expect(component.isSidebarVisible()).toBe(false);
  });

  it('navigates logged-in users to my videos page from primary sidebar', () => {
    currentUser = { id: 99, username: 'demo' };
    (component as any).isSidebarVisible.set(true);

    component.onPrimaryCategorySelect({ id: 4, icon: 'my_library_add', label: 'My Videos' });

    expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/my-videos');
    expect(component.isSidebarVisible()).toBe(false);
  });

  it('redirects guests to login when clicking my videos from primary sidebar', () => {
    (component as any).isSidebarVisible.set(true);

    component.onPrimaryCategorySelect({ id: 4, icon: 'my_library_add', label: 'My Videos' });

    expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/login');
    expect(component.isSidebarVisible()).toBe(false);
  });

  it('search input resets trending mode and calls search API', () => {
    (component as any).isTrendingMode.set(true);

    component.onSearchInput({ target: { value: 'music' } } as unknown as Event);

    expect(component.isTrendingMode()).toBe(false);
    expect(component.searchQuery()).toBe('music');
    expect(component.isLoadingVideos()).toBe(true);
    expect(component.videosError()).toBe('');
    expect(videosServiceMock.searchVideosAPI).toHaveBeenCalledWith('music');
  });

  it('selecting All category reloads full list', () => {
    (component as any).isTrendingMode.set(true);

    component.onCategorySelect(null);

    expect(component.isTrendingMode()).toBe(false);
    expect(component.selectedCategoryId()).toBeNull();
    expect(videosServiceMock.getAllAPI).toHaveBeenCalled();
  });

  it('loads filtered videos for a selected category', () => {
    // @ts-ignore
    categoryServiceMock.getVideosByCategory.mockReturnValue(of({ videos: [videoFixture] }));

    component.onCategorySelect(7);

    expect(categoryServiceMock.getVideosByCategory).toHaveBeenCalledWith(7);
    expect(component.videos()).toEqual([videoFixture]);
    expect(component.isLoadingVideos()).toBe(false);
    expect(component.videosError()).toBe('');
  });

  it('shows category error when category API fails', () => {
    categoryServiceMock.getVideosByCategory.mockReturnValue(throwError(() => new Error('failed')));

    component.onCategorySelect(7);

    expect(component.videos()).toEqual([]);
    expect(component.isLoadingVideos()).toBe(false);
    expect(component.videosError()).toBe('Failed to load videos for this category.');
  });

  it('prevents liking when user is not logged in', () => {
    component.onLikeVideo(videoFixture);

    expect(component.likeError()).toBe('You must be logged in to like a video.');
    expect(videosServiceMock.likeVideo).not.toHaveBeenCalled();
    expect(videosServiceMock.unlikeVideo).not.toHaveBeenCalled();
  });

  it('likes an unliked video when user is logged in', () => {
    currentUser = { id: 99, username: 'demo' };

    component.onLikeVideo(videoFixture);

    expect(component.likeError()).toBe('');
    expect(component.likedVideoIds().has(videoFixture.id)).toBe(true);
    expect(videosServiceMock.likeVideo).toHaveBeenCalledWith(99, videoFixture.id);
  });

  it('unlikes a liked video when user is logged in', () => {
    currentUser = { id: 99, username: 'demo' };
    component.likedVideoIds().add(videoFixture.id);

    component.onLikeVideo(videoFixture);

    expect(component.likedVideoIds().has(videoFixture.id)).toBe(false);
    expect(videosServiceMock.unlikeVideo).toHaveBeenCalledWith(99, videoFixture.id);
  });

  it('opens create video form when new-video action is triggered', () => {
    expect(component.isCreateVideoFormOpen()).toBe(false);

    component.openCreateVideoForm();

    expect(component.isCreateVideoFormOpen()).toBe(true);
  });

  it('opens the form in edit mode when editing a video', () => {
    expect(component.isCreateVideoFormOpen()).toBe(false);

    component.onEditVideo(videoFixture);

    expect(component.isCreateVideoFormOpen()).toBe(true);
  });
});
