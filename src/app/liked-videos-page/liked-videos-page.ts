import { Component, OnInit, effect, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth.service';
import { VideoCard } from '../video.model';
import { VideosService } from '../videos.service';

@Component({
  selector: 'app-liked-videos-page',
  imports: [RouterLink, CommonModule],
  templateUrl: './liked-videos-page.html',
  styleUrl: './liked-videos-page.css'
})
export class LikedVideosPageComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly videosService = inject(VideosService);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly likedVideos = signal<VideoCard[]>([]);
  protected readonly unlikeErrorMessage = signal('');
  protected readonly pendingUnlikeVideoId = signal<number | null>(null);

  protected get authRoute(): string {
    return this.authService.isLoggedIn() ? '/logout' : '/login';
  }

  protected get authLabel(): string {
    return this.authService.isLoggedIn() ? 'Logout' : 'Login';
  }

  protected get authUsername(): string {
    return this.authService.currentUser()?.username ?? 'Guest';
  }

  constructor() {
    effect(() => {
      const state = this.videosService.getLikedVideosState();
      if (state.status === 'OK') {
        this.isLoading.set(false);
        this.errorMessage.set('');
        this.likedVideos.set(state.value ?? []);
      } else if (state.status === 'ERROR') {
        this.isLoading.set(false);
        this.likedVideos.set([]);
        this.errorMessage.set('Unable to load liked videos. Make sure you are logged in.');
      }
    });

    effect(() => {
      const state = this.videosService.unlikeVid();
      if (this.pendingUnlikeVideoId() === null) {
        return;
      }

      if (state.status === 'OK') {
        const removedId = this.pendingUnlikeVideoId();
        this.pendingUnlikeVideoId.set(null);
        this.unlikeErrorMessage.set('');
        this.likedVideos.update((videos) => videos.filter((video) => video.id !== removedId));
      } else if (state.status === 'ERROR') {
        this.pendingUnlikeVideoId.set(null);
        this.unlikeErrorMessage.set('Failed to remove liked video. Please try again.');
      }
    });
  }

  ngOnInit(): void {
    const userId = this.authService.currentUser()?.id;
    if (!userId) {
      this.isLoading.set(false);
      this.errorMessage.set('You must be logged in to view liked videos.');
      return;
    }
    this.videosService.getLikedVideosAPI(userId);
  }

  protected onUnlikeVideo(videoId: number): void {
    const userId = this.authService.currentUser()?.id;
    if (!userId) {
      this.unlikeErrorMessage.set('You must be logged in to remove liked videos.');
      return;
    }

    if (this.pendingUnlikeVideoId() !== null) {
      return;
    }

    this.unlikeErrorMessage.set('');
    this.pendingUnlikeVideoId.set(videoId);
    this.videosService.unlikeVideo(userId, videoId);
  }
}
