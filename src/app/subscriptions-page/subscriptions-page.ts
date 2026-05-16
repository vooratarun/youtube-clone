import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';
import { SubscriptionsService } from '../subscriptions.service';

@Component({
  selector: 'app-subscriptions-page',
  imports: [RouterLink],
  templateUrl: './subscriptions-page.html',
  styleUrl: './subscriptions-page.css'
})
export class SubscriptionsPageComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly subscriptionsService = inject(SubscriptionsService);

  protected readonly channels = signal<string[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal('');
  protected readonly unsubscribingChannel = signal<string | null>(null);

  protected readonly authRoute = computed(() =>
    this.authService.isLoggedIn() ? '/logout' : '/login'
  );
  protected readonly authLabel = computed(() =>
    this.authService.isLoggedIn() ? 'Logout' : 'Login'
  );

  ngOnInit(): void {
    const userId = this.authService.currentUser()?.id;
    if (!userId) {
      this.isLoading.set(false);
      this.errorMessage.set('You must be logged in to view subscriptions.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.subscriptionsService.getUserSubscribedChannels(userId).subscribe({
      next: (channels) => {
        this.channels.set(channels);
        this.isLoading.set(false);
      },
      error: () => {
        this.channels.set([]);
        this.isLoading.set(false);
        this.errorMessage.set('Unable to load subscriptions.');
      }
    });
  }

  protected onUnsubscribe(channelName: string): void {
    const userId = this.authService.currentUser()?.id;
    const normalizedChannelName = channelName.trim();

    if (!userId) {
      this.errorMessage.set('You must be logged in to manage subscriptions.');
      return;
    }

    if (!normalizedChannelName || this.unsubscribingChannel()) {
      return;
    }

    this.errorMessage.set('');
    this.unsubscribingChannel.set(channelName);

    this.subscriptionsService.unsubscribeChannel(userId, normalizedChannelName)
      .subscribe({
        next: () => {
          this.channels.update((channels) => channels.filter((name) => name !== channelName));
          this.unsubscribingChannel.set(null);
        },
        error: () => {
          this.unsubscribingChannel.set(null);
          this.errorMessage.set('Unable to unsubscribe from this channel.');
        }
      });
  }
}

