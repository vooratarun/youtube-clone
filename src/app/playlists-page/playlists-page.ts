import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { AuthService } from '../auth.service';
import { PlaylistService } from '../playlist.service';
import { Playlist, VideoCard } from '../video.model';

export type PlaylistWithVideos = Playlist & {
  videos: VideoCard[];
  isLoadingVideos: boolean;
  isDeleting: boolean;
  removingVideoIds: number[];
  removeVideoError: string;
};

@Component({
  selector: 'app-playlists-page',
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './playlists-page.html',
  styleUrl: './playlists-page.css'
})
export class PlaylistsPageComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly playlistService = inject(PlaylistService);

  protected playlists: PlaylistWithVideos[] = [];
  protected isLoading = true;
  protected errorMessage = '';

  // create-playlist dialog
  protected isDialogOpen = false;
  protected newPlaylistName = '';
  protected newPlaylistDesc = '';
  protected isCreating = false;
  protected createError = '';
  protected createSuccess = '';
  protected deleteError = '';

  protected get authRoute(): string {
    return this.authService.isLoggedIn() ? '/logout' : '/login';
  }

  protected get authLabel(): string {
    return this.authService.isLoggedIn() ? 'Logout' : 'Login';
  }

  protected get authUsername(): string {
    return this.authService.currentUser()?.username ?? 'Guest';
  }

  ngOnInit(): void {
    const userId = this.authService.currentUser()?.id;
    if (!userId) {
      this.isLoading = false;
      this.errorMessage = 'You must be logged in to view your playlists.';
      return;
    }
    this.loadPlaylists(userId);
  }

  private loadPlaylists(userId: number): void {
    this.playlistService.getUserPlaylists(userId).subscribe({
      next: (response) => {
        const raw: Playlist[] = Array.isArray(response) ? response : response.data ?? [];

        // Seed state immediately so list renders
        this.playlists = raw.map((pl) => ({
          ...pl,
          videos: [],
          isLoadingVideos: pl.videoIds.length > 0,
          isDeleting: false,
          removingVideoIds: [],
          removeVideoError: ''
        }));
        this.isLoading = false;

        // Fetch videos for each playlist in parallel
        this.playlists.forEach((playlist, idx) => {
          this.fetchVideosForPlaylist(playlist, idx);
        });
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Failed to load playlists. Please try again.';
      }
    });
  }

  private fetchVideosForPlaylist(playlist: PlaylistWithVideos, idx: number): void {
    if (!playlist.videoIds.length) return;
    const requests = playlist.videoIds.map((id) => this.playlistService.getVideoById(id));
    forkJoin(requests).subscribe({
      next: (videos) => {
        this.playlists[idx] = {
          ...this.playlists[idx],
          videos: videos.filter((v): v is VideoCard => v !== null),
          isLoadingVideos: false
        };
      },
      error: () => {
        this.playlists[idx] = { ...this.playlists[idx], isLoadingVideos: false };
      }
    });
  }

  protected openDialog(): void {
    this.isDialogOpen = true;
    this.newPlaylistName = '';
    this.newPlaylistDesc = '';
    this.createError = '';
    this.createSuccess = '';
    this.deleteError = '';
  }

  protected closeDialog(): void {
    this.isDialogOpen = false;
  }

  protected submitCreatePlaylist(): void {
    const name = this.newPlaylistName.trim();
    if (!name) {
      this.createError = 'Playlist name is required.';
      return;
    }

    const userId = this.authService.currentUser()?.id;
    if (!userId) {
      this.createError = 'You must be logged in.';
      return;
    }

    this.isCreating = true;
    this.createError = '';
    this.createSuccess = '';

    this.playlistService.createPlaylist(userId, name, this.newPlaylistDesc.trim()).subscribe({
      next: (newPlaylist) => {
        const withVideos: PlaylistWithVideos = {
          ...newPlaylist,
          videos: [],
          isLoadingVideos: false,
          isDeleting: false,
          removingVideoIds: [],
          removeVideoError: ''
        };
        this.playlists = [withVideos, ...this.playlists];
        this.isCreating = false;
        this.createSuccess = `"${newPlaylist.name}" created.`;
        this.newPlaylistName = '';
        this.newPlaylistDesc = '';
      },
      error: (err) => {
        this.isCreating = false;
        this.createError = err?.error?.message || 'Failed to create playlist. Please try again.';
      }
    });
  }

  protected onDeletePlaylist(playlist: PlaylistWithVideos): void {
    const userId = this.authService.currentUser()?.id;
    if (!userId) {
      this.deleteError = 'You must be logged in to delete a playlist.';
      return;
    }

    const confirmed = window.confirm(`Delete playlist "${playlist.name}"?`);
    if (!confirmed) {
      return;
    }

    this.deleteError = '';
    this.playlists = this.playlists.map((item) =>
      item.id === playlist.id ? { ...item, isDeleting: true } : item
    );

    this.playlistService.deletePlaylist(userId, playlist.id).subscribe({
      next: () => {
        this.playlists = this.playlists.filter((item) => item.id !== playlist.id);
      },
      error: (err) => {
        this.playlists = this.playlists.map((item) =>
          item.id === playlist.id ? { ...item, isDeleting: false } : item
        );
        this.deleteError = err?.error?.message || 'Failed to delete playlist. Please try again.';
      }
    });
  }

  protected isRemovingVideo(playlist: PlaylistWithVideos, videoId: number): boolean {
    return playlist.removingVideoIds.includes(videoId);
  }

  protected onRemoveVideoFromPlaylist(
    event: Event,
    playlist: PlaylistWithVideos,
    video: VideoCard
  ): void {
    event.preventDefault();
    event.stopPropagation();

    const userId = this.authService.currentUser()?.id;
    if (!userId) {
      this.playlists = this.playlists.map((item) =>
        item.id === playlist.id
          ? { ...item, removeVideoError: 'You must be logged in to remove a video.' }
          : item
      );
      return;
    }

    if (playlist.removingVideoIds.includes(video.id)) {
      return;
    }

    this.playlists = this.playlists.map((item) =>
      item.id === playlist.id
        ? {
            ...item,
            removingVideoIds: [...item.removingVideoIds, video.id],
            removeVideoError: ''
          }
        : item
    );

    this.playlistService.removeVideoFromPlaylist(userId, playlist.id, video.id).subscribe({
      next: () => {
        this.playlists = this.playlists.map((item) =>
          item.id === playlist.id
            ? {
                ...item,
                videoIds: item.videoIds.filter((id) => id !== video.id),
                videos: item.videos.filter((itemVideo) => itemVideo.id !== video.id),
                removingVideoIds: item.removingVideoIds.filter((id) => id !== video.id),
                removeVideoError: ''
              }
            : item
        );
      },
      error: (err) => {
        this.playlists = this.playlists.map((item) =>
          item.id === playlist.id
            ? {
                ...item,
                removingVideoIds: item.removingVideoIds.filter((id) => id !== video.id),
                removeVideoError: err?.error?.message || 'Failed to remove video from playlist.'
              }
            : item
        );
      }
    });
  }
}

