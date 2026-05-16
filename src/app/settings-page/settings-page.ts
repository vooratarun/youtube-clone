import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';
import { SettingsService, UserSettings } from '../settings.service';

@Component({
  selector: 'app-settings-page',
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.css'
})
export class SettingsPageComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly settingsService = inject(SettingsService);

  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');

  protected readonly theme = signal<'light' | 'dark' | 'system'>('system');
  protected readonly language = signal('en');
  protected readonly autoplay = signal(true);
  protected readonly emailNotifications = signal(true);
  protected readonly pushNotifications = signal(true);

  protected readonly authRoute = computed(() =>
    this.authService.isLoggedIn() ? '/logout' : '/login'
  );
  protected readonly authLabel = computed(() =>
    this.authService.isLoggedIn() ? 'Logout' : 'Login'
  );
  protected readonly authUsername = computed(() =>
    this.authService.currentUser()?.username ?? 'Guest'
  );

  readonly themeOptions: { value: 'light' | 'dark' | 'system'; label: string; icon: string }[] = [
    { value: 'light', label: 'Light', icon: 'light_mode' },
    { value: 'dark', label: 'Dark', icon: 'dark_mode' },
    { value: 'system', label: 'System Default', icon: 'brightness_auto' }
  ];

  readonly languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'pt', label: 'Portuguese' },
    { value: 'ja', label: 'Japanese' },
    { value: 'ko', label: 'Korean' },
    { value: 'zh', label: 'Chinese' }
  ];

  ngOnInit(): void {
    const userId = this.authService.currentUser()?.id;
    if (!userId) {
      this.isLoading.set(false);
      this.errorMessage.set('You must be logged in to view settings.');
      return;
    }

    this.settingsService.getSettings(userId).subscribe({
      next: (settings) => {
        this.theme.set(settings.theme);
        this.language.set(settings.language);
        this.autoplay.set(settings.autoplay);
        this.emailNotifications.set(settings.emailNotifications);
        this.pushNotifications.set(settings.pushNotifications);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.errorMessage.set('Failed to load settings. Please try again.');
      }
    });
  }

  protected onThemeSelect(value: 'light' | 'dark' | 'system'): void {
    this.theme.set(value);
  }

  protected onSave(): void {
    const userId = this.authService.currentUser()?.id;
    if (!userId) {
      this.errorMessage.set('You must be logged in to save settings.');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const payload: Partial<UserSettings> = {
      theme: this.theme(),
      language: this.language(),
      autoplay: this.autoplay(),
      emailNotifications: this.emailNotifications(),
      pushNotifications: this.pushNotifications()
    };

    this.settingsService.updateSettings(userId, payload).subscribe({
      next: (updated) => {
        this.theme.set(updated.theme);
        this.language.set(updated.language);
        this.autoplay.set(updated.autoplay);
        this.emailNotifications.set(updated.emailNotifications);
        this.pushNotifications.set(updated.pushNotifications);
        this.isSaving.set(false);
        this.successMessage.set('Settings saved successfully.');
      },
      error: (err) => {
        this.isSaving.set(false);
        this.errorMessage.set(err?.error?.message || 'Failed to save settings. Please try again.');
      }
    });
  }
}

