import { Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';
import { WatchHistoryStore } from '../watch-history.store';

@Component({
  selector: 'app-watch-history-page',
  imports: [RouterLink],
  templateUrl: './watch-history-page.html',
  styleUrl: './watch-history-page.css'
})
export class WatchHistoryPageComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly watchHistoryStore = inject(WatchHistoryStore);

  protected readonly items = this.watchHistoryStore.items;
  protected readonly isLoading = this.watchHistoryStore.isLoading;
  protected readonly errorMessage = this.watchHistoryStore.errorMessage;
  protected readonly count = this.watchHistoryStore.count;
  protected readonly isEmpty = this.watchHistoryStore.isEmpty;

  protected readonly authRoute = computed(() =>
    this.authService.isLoggedIn() ? '/logout' : '/login'
  );
  protected readonly authLabel = computed(() =>
    this.authService.isLoggedIn() ? 'Logout' : 'Login'
  );
  protected readonly authUsername = computed(() =>
    this.authService.currentUser()?.username ?? 'Guest'
  );

  ngOnInit(): void {
    const userId = this.authService.currentUser()?.id;
    if (!userId) {
      this.watchHistoryStore.reset();
      this.watchHistoryStore.errorMessage.set('You must be logged in to view watch history.');
      return;
    }

    this.watchHistoryStore.load(userId);
  }
}

