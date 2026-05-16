import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AuthService } from '../auth.service';
import { CategoryService, CategoryOption } from '../category.service';
import { HeaderComponent } from '../header/header';
import { SidebarCategoryComponent } from '../sidebar-category/sidebar-category';
import { VideoCard, VideoUploadPayload } from '../video.model';
import { VideosService } from '../videos.service';
import { VideoFormComponent } from '../video-form/video-form';

type SidebarCategory = {
  id: number;
  icon: string;
  label: string;
  route?: string;
};

@Component({
  selector: 'app-home-page',
  imports: [SidebarCategoryComponent, VideoFormComponent, RouterLink, CommonModule, FormsModule, HeaderComponent],
  templateUrl: './home-page.html',
  styleUrl: './home-page.css'
})
export class HomePageComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly videosService = inject(VideosService);
  private readonly categoryService = inject(CategoryService);
  private readonly router = inject(Router);

  protected readonly isSidebarVisible = signal(false);
  protected readonly searchQuery = signal('');
  protected readonly isLoadingVideos = signal(true);
  protected readonly videosError = signal('');
  protected readonly isUploadingVideo = signal(false);
  protected readonly isDeletingVideo = signal(false);
  protected readonly isLoadingMore = signal(false);
  protected readonly isTrendingMode = signal(false);
  protected readonly uploadVideoError = signal('');
  protected readonly uploadVideoSuccess = signal('');
  protected readonly videoFormResetKey = signal(0);
  protected readonly isEditMode = signal(false);
  protected readonly selectedVideoForEdit = signal<VideoCard | null>(null);
  protected readonly likedVideoIds = signal(new Set<number>());
  protected readonly likeError = signal('');
  protected readonly categories = signal<CategoryOption[]>([]);
  protected readonly selectedCategoryId = signal<number | null>(null);
  protected readonly isLoadingCategories = signal(true);
  protected readonly isCreateCategoryDialogOpen = signal(false);
  protected readonly newCategoryName = signal('');
  protected readonly createCategoryError = signal('');
  protected readonly isCreatingCategory = signal(false);
  protected readonly isCreateVideoFormOpen = signal(false);
  protected readonly primarySidebarCategories: SidebarCategory[] = [
    { id: 1, icon: 'home', label: 'Home' },
    { id: 2, icon: 'local_fire_department', label: 'Trending' },
    { id: 3, icon: 'subscriptions', label: 'Subscriptions' },
    { id: 4, icon: 'my_library_add', label: 'My Videos' }

  ];
  protected readonly librarySidebarCategories: SidebarCategory[] = [
    { id: 2, icon: 'history', label: 'History', route: '/watch-history' },
    { id: 5, icon: 'thumb_up', label: 'Liked Videos', route: '/liked-videos' },
    { id: 6, icon: 'playlist_play', label: 'Playlists', route: '/playlists' },
    { id: 7, icon: 'settings', label: 'Settings', route: '/settings' }
  ];
  protected readonly videos = signal<VideoCard[]>([]);
  protected readonly filteredVideos = computed(() => this.videos());
  protected readonly showNoVideosMessage = computed(
    () => !this.isLoadingVideos() && !this.videosError() && !this.filteredVideos().length
  );
  protected readonly emptyVideosMessage = computed(() =>
    this.searchQuery().trim()
      ? `No videos found for "${this.searchQuery()}".`
      : 'No videos available.'
  );
  protected readonly authRoute = computed(() =>
    this.authService.isLoggedIn() ? '/logout' : '/login'
  );
  protected readonly authLabel = computed(() =>
    this.authService.isLoggedIn() ? 'Logout' : 'Login'
  );
  protected readonly authUsername = computed(() =>
    this.authService.currentUser()?.username ?? 'Guest'
  );
  protected readonly canDeleteVideos = computed(() => this.authService.isAdmin());

  ngOnInit(): void {
    this.videosService.getAllAPI();
    this.loadCategories();
  }

  constructor() {
    effect(() => {
      const response = this.videosService.getAllVideos();
      const hasCategoryFilter = this.selectedCategoryId() !== null;

      // Category and trending views manage their own video lists.
      if (hasCategoryFilter ) {
        return;
      }

      if (response.status === 'OK') {
        const videos = response.value ?? [];
        this.isLoadingVideos.set(false);
        this.isLoadingMore.set(false);
        this.videosError.set('');
        this.videos.set(videos);
        this.syncLikedStatuses(videos);
      } else if (response.status === 'ERROR') {
        this.isLoadingVideos.set(false);
        this.isLoadingMore.set(false);
        this.videos.set([]);
        this.videosError.set('Unable to load videos right now.');
      }
    });

    effect(() => {
      const response = this.videosService.addVid();
      if (response.status === 'OK') {
        this.isUploadingVideo.set(false);
        this.uploadVideoSuccess.set('Video uploaded successfully.');
        this.videoFormResetKey.update((value) => value + 1);
        this.isCreateVideoFormOpen.set(false);
        this.isLoadingVideos.set(true);
        this.videosService.getAllAPI();
      } else if (response.status === 'ERROR') {
        this.isUploadingVideo.set(false);
        this.uploadVideoError.set('Failed to upload video. Please try again.');
      }
    });

    effect(() => {
      const response = this.videosService.editVid();
      if (response.status === 'OK') {
        this.isUploadingVideo.set(false);
        this.uploadVideoSuccess.set('Video updated successfully.');
        this.videoFormResetKey.update((value) => value + 1);
        this.selectedVideoForEdit.set(null);
        this.isEditMode.set(false);
        this.isLoadingVideos.set(true);
        this.videosService.getAllAPI();
      } else if (response.status === 'ERROR') {
        this.isUploadingVideo.set(false);
        this.uploadVideoError.set('Failed to update video. Please try again.');
      }
    });

    effect(() => {
      const response = this.videosService.deleteVid();
      if (response.status === 'OK') {
        this.isDeletingVideo.set(false);
        this.uploadVideoSuccess.set('Video deleted successfully.');
        this.uploadVideoError.set('');
        this.isLoadingVideos.set(true);
        this.videosService.getAllAPI();
      } else if (response.status === 'ERROR') {
        this.isDeletingVideo.set(false);
        this.uploadVideoError.set('Failed to delete video. Please try again.');
      }
    });

    effect(() => {
      const response = this.videosService.likeVid();
      if (response.status === 'OK') {
        this.likeError.set('');
        this.syncLikedStatuses(this.videos());
      }

      if (response.status === 'ERROR') {
        this.likeError.set('Failed to like video. Please try again.');
        this.syncLikedStatuses(this.videos());
      }
    });

    effect(() => {
      const response = this.videosService.unlikeVid();
      if (response.status === 'OK') {
        this.likeError.set('');
        this.syncLikedStatuses(this.videos());
      }

      if (response.status === 'ERROR') {
        this.likeError.set('Failed to remove liked video. Please try again.');
        this.syncLikedStatuses(this.videos());
      }
    });
  }

  protected onEditVideo(video: VideoCard): void {
    this.selectedVideoForEdit.set(video);
    this.isEditMode.set(true);
    this.isCreateVideoFormOpen.set(true);
    this.uploadVideoError.set('');
    this.uploadVideoSuccess.set('');
  }

  protected openCreateVideoForm(): void {
    this.isCreateVideoFormOpen.set(true);
    this.isEditMode.set(false);
    this.selectedVideoForEdit.set(null);
    this.videoFormResetKey.update((value) => value + 1);
    this.uploadVideoError.set('');
    this.uploadVideoSuccess.set('');
  }

  protected closeCreateVideoForm(): void {
    this.isCreateVideoFormOpen.set(false);
    this.isEditMode.set(false);
    this.selectedVideoForEdit.set(null);
    this.videoFormResetKey.update((value) => value + 1);
    this.uploadVideoError.set('');
  }

  protected onCancelEdit(): void {
    this.selectedVideoForEdit.set(null);
    this.isEditMode.set(false);
    this.videoFormResetKey.update((value) => value + 1);
    this.uploadVideoError.set('');
    this.uploadVideoSuccess.set('');
  }

  protected onVideoSubmit(payload: VideoUploadPayload): void {
    this.isUploadingVideo.set(true);
    this.uploadVideoError.set('');
    this.uploadVideoSuccess.set('');

    if (this.isEditMode() && this.selectedVideoForEdit()) {
      this.videosService.updateVideo(this.selectedVideoForEdit()!.id, payload);
    } else {
      this.videosService.addVideo(payload);
    }
  }

  protected onLikeVideo(video: VideoCard): void {
    const userId = this.authService.currentUser()?.id;
    if (!userId) {
      this.likeError.set('You must be logged in to like a video.');
      return;
    }

    this.likeError.set('');
    if (this.likedVideoIds().has(video.id)) {
      this.likedVideoIds.update((likedIds) => {
        const next = new Set(likedIds);
        next.delete(video.id);
        return next;
      });
      this.videosService.unlikeVideo(userId, video.id);
      return;
    }

    this.likedVideoIds.update((likedIds) => {
      const next = new Set(likedIds);
      next.add(video.id);
      return next;
    });
    this.videosService.likeVideo(userId, video.id);
  }

  protected isVideoLiked(videoId: number): boolean {
    return this.likedVideoIds().has(videoId);
  }

  protected onDeleteVideo(video: VideoCard): void {
    if (!this.canDeleteVideos()) {
      this.uploadVideoError.set('Only admin users can delete videos.');
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to delete "${video.title}"?`);
    if (!confirmed) {
      return;
    }

    this.isDeletingVideo.set(true);
    this.uploadVideoError.set('');
    this.uploadVideoSuccess.set('');

    if (this.selectedVideoForEdit()?.id === video.id) {
      this.onCancelEdit();
    }

    this.videosService.deleteVideo(video.id);
  }

  protected onSearchInput(event: Event): void {
    this.isTrendingMode.set(false);
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
    this.isLoadingVideos.set(true);
    this.isLoadingMore.set(false);
    this.videosError.set('');
    this.videosService.searchVideosAPI(this.searchQuery());
  }

  protected onCategorySelect(categoryId: number | null): void {
    this.isTrendingMode.set(false);
    this.selectedCategoryId.set(categoryId);
    this.isLoadingVideos.set(true);
    this.videosError.set('');

    if (categoryId === null) {
      this.videosService.getAllAPI();
    } else {
      this.categoryService.getVideosByCategory(categoryId).subscribe({
        next: (response) => {
          this.videos.set(response.videos || []);
          this.isLoadingVideos.set(false);
          this.videosError.set('');
          this.syncLikedStatuses(this.videos());
        },
        error: () => {
          this.isLoadingVideos.set(false);
          this.videos.set([]);
          this.videosError.set('Failed to load videos for this category.');
        }
      });
    }
  }

  private loadCategories(): void {
    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories.set(categories);
        this.isLoadingCategories.set(false);
      },
      error: () => {
        this.categories.set([]);
        this.isLoadingCategories.set(false);
      }
    });
  }

  protected onLoadMoreVideos(): void {
    if (!this.canLoadMoreVideos || this.isLoadingMore()) {
      return;
    }

    this.isLoadingMore.set(true);
    this.videosService.loadMoreVideosAPI();
  }

  protected get canLoadMoreVideos(): boolean {
    return this.videosService.getCanLoadMoreVideos();
  }

  protected toggleSidebar(): void {
    this.isSidebarVisible.update((value) => !value);
  }

  protected onPrimaryCategorySelect(category: SidebarCategory): void {
    const normalizedLabel = category.label.toLowerCase();

    if (normalizedLabel === 'trending') {
      this.isTrendingMode.set(true);
      this.selectedCategoryId.set(null);
      this.searchQuery.set('');
      this.isLoadingVideos.set(true);
      this.isLoadingMore.set(false);
      this.videosError.set('');
      this.videosService.getTrendingVideosAPI(5);
      this.collapseSidebar();
      return;
    }

    if (normalizedLabel === 'home') {
      this.isTrendingMode.set(false);
      this.selectedCategoryId.set(null);
      this.searchQuery.set('');
      this.isLoadingVideos.set(true);
      this.isLoadingMore.set(false);
      this.videosError.set('');
      this.videosService.getAllAPI();
      this.collapseSidebar();
      return;
    }

    if (normalizedLabel === 'subscriptions' || normalizedLabel === 'subcriptions') {
      this.collapseSidebar();
      this.router.navigateByUrl('/subscriptions');
      return;
    }

    if (normalizedLabel === 'my videos' || normalizedLabel === 'my-videos') {
      this.collapseSidebar();
      if (!this.authService.currentUser()?.id) {
        this.router.navigateByUrl('/login');
        return;
      }
      this.router.navigateByUrl('/my-videos');
      return;
    }

    this.collapseSidebar();
  }

  protected collapseSidebar(): void {
    if (!this.isSidebarVisible()) {
      return;
    }

    this.isSidebarVisible.set(false);
  }

  private syncLikedStatuses(videos: VideoCard[]): void {
    const userId = this.authService.currentUser()?.id;
    if (!userId || !videos.length) {
      this.likedVideoIds.set(new Set<number>());
      return;
    }

    const checks = videos.map((video) => this.videosService.getVideoLikeStatus(userId, video.id));
    forkJoin(checks).subscribe((statuses) => {
      const likedIds = new Set<number>();
      videos.forEach((video, index) => {
        if (statuses[index]) {
          likedIds.add(video.id);
        }
      });
      this.likedVideoIds.set(likedIds);
    });
  }

  protected openCreateCategoryDialog(): void {
    this.isCreateCategoryDialogOpen.set(true);
    this.newCategoryName.set('');
    this.createCategoryError.set('');
  }

  protected closeCreateCategoryDialog(): void {
    this.isCreateCategoryDialogOpen.set(false);
    this.newCategoryName.set('');
    this.createCategoryError.set('');
  }

  protected submitCreateCategory(): void {
    const trimmedName = this.newCategoryName().trim();

    if (!trimmedName) {
      this.createCategoryError.set('Please enter a category name');
      return;
    }

    if (this.categories().some((cat) => cat.name.toLowerCase() === trimmedName.toLowerCase())) {
      this.createCategoryError.set('This category already exists');
      return;
    }

    this.isCreatingCategory.set(true);
    this.createCategoryError.set('');

    this.categoryService.createCategory({
      name: trimmedName,
      description: `${trimmedName} category`
    }).subscribe({
      next: (newCategory) => {
        this.categories.update((categories) => [...categories, newCategory]);
        this.isCreatingCategory.set(false);
        this.closeCreateCategoryDialog();
      },
      error: (err) => {
        this.isCreatingCategory.set(false);
        this.createCategoryError.set(
          err?.error?.message || 'Failed to create category. Please try again.'
        );
      }
    });
  }
}

