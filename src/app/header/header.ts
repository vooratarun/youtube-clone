import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink, CommonModule, FormsModule],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class HeaderComponent {
  private readonly authService = inject(AuthService);

  @Input() searchQuery = '';
  @Input() authRoute = '/login';
  @Input() authLabel = 'Login';
  @Input() authUsername = 'Guest';

  @Output() menuToggle = new EventEmitter<void>();
  @Output() searchInput = new EventEmitter<Event>();
  @Output() newVideoClick = new EventEmitter<void>();

  // change-password dialog state
  protected isDialogOpen = false;
  protected oldPassword = '';
  protected newPassword = '';
  protected confirmPassword = '';
  protected isSubmitting = false;
  protected errorMessage = '';
  protected successMessage = '';

  get isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  onMenuToggle(): void {
    this.menuToggle.emit();
  }

  onSearchInput(event: Event): void {
    this.searchInput.emit(event);
  }

  onNewVideoClick(): void {
    this.newVideoClick.emit();
  }

  protected openDialog(): void {
    this.isDialogOpen = true;
    this.oldPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.errorMessage = '';
    this.successMessage = '';
  }

  protected closeDialog(): void {
    this.isDialogOpen = false;
  }

  protected submitChangePassword(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.oldPassword.trim()) {
      this.errorMessage = 'Current password is required.';
      return;
    }
    if (this.newPassword.length < 6) {
      this.errorMessage = 'New password must be at least 6 characters.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.isSubmitting = true;
    this.authService.changePassword(this.oldPassword, this.newPassword).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.successMessage = 'Password changed successfully.';
        this.oldPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
      },
      error: (err) => {
        this.isSubmitting = false;
        this.errorMessage =
          err?.error?.message || 'Failed to change password. Please try again.';
      }
    });
  }
}
