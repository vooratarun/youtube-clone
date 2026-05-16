import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-register-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register-page.html',
  styleUrl: './register-page.css'
})
export class RegisterPageComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly registerForm = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    username: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['user' as 'user' | 'admin', Validators.required]
  });

  protected registerError = '';
  protected isSubmitting = false;

  protected onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      this.registerError = 'Please fill in name, username, password, and role.';
      return;
    }

    const { name, username, password, role } = this.registerForm.getRawValue();
    this.isSubmitting = true;
    this.registerError = '';

    this.authService.registerWithApi(username, password, name, role).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.router.navigateByUrl('/');
      },
      error: () => {
        this.isSubmitting = false;
        this.registerError = 'Registration failed. Please try again.';
      }
    });
  }
}

