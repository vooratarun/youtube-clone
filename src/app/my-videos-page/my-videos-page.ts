import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';
import { VideoCard } from '../video.model';
import { VideosService } from '../videos.service';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-my-videos-page',
  imports: [
    CommonModule,
    RouterLink,
    MatToolbarModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './my-videos-page.html',
  styleUrl: './my-videos-page.css'
})
export class MyVideosPageComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly videosService = inject(VideosService);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly myVideos = signal<VideoCard[]>([]);

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
      this.isLoading.set(false);
      this.errorMessage.set('You must be logged in to view your videos.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.videosService.getUserVideos(userId).subscribe({
      next: (videos) => {
        this.myVideos.set(videos);
        this.isLoading.set(false);
      },
      error: () => {
        this.myVideos.set([]);
        this.isLoading.set(false);
        this.errorMessage.set('Unable to load your videos.');
      }
    });
  }
}
