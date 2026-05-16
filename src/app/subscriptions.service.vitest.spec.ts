import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SubscriptionsService } from './subscriptions.service';

describe('SubscriptionsService (Vitest)', () => {
  let service: SubscriptionsService;

  const httpMock = {
    get: vi.fn(),
    delete: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();

    const injector = Injector.create({
      providers: [
        { provide: HttpClient, useValue: httpMock },
        { provide: SubscriptionsService, useClass: SubscriptionsService }
      ]
    });

    service = runInInjectionContext(injector, () => injector.get(SubscriptionsService));
  });

  it('loads and normalizes subscribed channels', () => {
    httpMock.get.mockReturnValue(of({ channels: [{ channelName: '  Music Lab  ' }, 'Code TV', { channelName: '' }] }));
    const next = vi.fn();

    service.getUserSubscribedChannels(4).subscribe(next);

    expect(httpMock.get).toHaveBeenCalledWith('http://localhost:3000/users/4/subscribed-channels');
    expect(next).toHaveBeenCalledWith(['Music Lab', 'Code TV']);
  });

  it('calls unsubscribe endpoint with encoded channel name', () => {
    httpMock.delete.mockReturnValue(of(void 0));
    const next = vi.fn();

    service.unsubscribeChannel(9, 'Code TV').subscribe(next);

    expect(httpMock.delete).toHaveBeenCalledWith('http://localhost:3000/users/9/subscribed-channels/Code%20TV');
    expect(next).toHaveBeenCalled();
  });
});

