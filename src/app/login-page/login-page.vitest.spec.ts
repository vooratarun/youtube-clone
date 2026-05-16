import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../auth.service';
import { LoginPageComponent } from './login-page';

type LoginPageLike = {
  loginForm: {
    setValue: (value: { username: string; password: string }) => void;
    invalid: boolean;
    markAllAsTouched: () => void;
  };
  loginError: string;
  isSubmitting: boolean;
  onSubmit: () => void;
};

describe('LoginPageComponent (Vitest)', () => {
  let component: LoginPageLike;
  let authServiceMock: { loginWithApi: ReturnType<typeof vi.fn> };
  let routerMock: { navigateByUrl: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    authServiceMock = {
      loginWithApi: vi.fn()
    };

    authServiceMock.loginWithApi.mockImplementation((username: string, password: string) => {
      if (username === 'demo' && password === 'secret1423') {
        return of(void 0);
      }

      return throwError(() => new Error('Invalid credentials'));
    });

    routerMock = {
      navigateByUrl: vi.fn()
    };

    const injector = Injector.create({
      providers: [
        { provide: FormBuilder, useValue: new FormBuilder() },
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    });

    component = runInInjectionContext(injector, () => new LoginPageComponent()) as unknown as LoginPageLike;
  });

  it('shows validation error and does not call login when form is invalid', () => {
    component.onSubmit();

    expect(authServiceMock.loginWithApi).not.toHaveBeenCalled();
    expect(component.loginError).toBe('Please enter a username and password.');
    expect(component.isSubmitting).toBe(false);
  });

  it('submits valid credentials and navigates to home on success', () => {
    component.loginForm.setValue({ username: 'demo', password: 'secret1423' });
    const response$ = new Subject<void>();
    authServiceMock.loginWithApi.mockReturnValue(response$.asObservable());

    component.onSubmit();

    expect(authServiceMock.loginWithApi).toHaveBeenCalledWith('demo', 'secret1423');
    expect(component.isSubmitting).toBe(true);
    expect(component.loginError).toBe('');

    response$.next();
    response$.complete();


    expect(component.isSubmitting).toBe(false);
    expect(routerMock.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('shows login error and does not navigate when API fails', () => {
    component.loginForm.setValue({ username: 'demo', password: 'wrong' });

    component.onSubmit();

    expect(routerMock.navigateByUrl).not.toHaveBeenCalled();
    expect(component.isSubmitting).toBe(false);
    expect(component.loginError).toBe('Login failed. Please check your credentials.');
  });

  it('clears old error before retrying with valid input', () => {
    component.loginError = 'Previous error';
    component.loginForm.setValue({ username: 'demo', password: 'secret1423' });

    component.onSubmit();

    expect(component.loginError).toBe('');
  });
});
