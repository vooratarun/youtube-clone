import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../auth.service';
import { LogoutPageComponent } from './logout-page';

describe('LogoutPageComponent (Vitest)', () => {
  let component: LogoutPageComponent;
  let authServiceMock: { logout: ReturnType<typeof vi.fn> };
  let routerMock: { navigate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.stubGlobal('window', {
      confirm: vi.fn()
    });

    authServiceMock = {
      logout: vi.fn()
    };

    routerMock = {
      navigate: vi.fn()
    };

    const injector = Injector.create({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock }
      ]
    });

    component = runInInjectionContext(injector, () => new LogoutPageComponent());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('logs out when user confirms', () => {
    const confirmMock = vi.mocked(window.confirm);
    confirmMock.mockReturnValue(true);

    component.ngOnInit();

    expect(confirmMock).toHaveBeenCalledWith('Are you sure you want to logout?');
    expect(authServiceMock.logout).toHaveBeenCalledTimes(1);
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('navigates home when user cancels', () => {
    const confirmMock = vi.mocked(window.confirm);
    confirmMock.mockReturnValue(false);

    component.ngOnInit();

    expect(confirmMock).toHaveBeenCalledWith('Are you sure you want to logout?');
    expect(authServiceMock.logout).not.toHaveBeenCalled();
    expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
  });
});
