import '@angular/compiler';
import { Injector, runInInjectionContext } from '@angular/core';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../auth.service';
import { SubscriptionsService } from '../subscriptions.service';
import { SubscriptionsPageComponent } from './subscriptions-page';

type SubscriptionsPageLike = {
  ngOnInit: () => void;
  onUnsubscribe: (channelName: string) => void;
  channels: () => string[];
  isLoading: () => boolean;
  errorMessage: () => string;
  unsubscribingChannel: () => string | null;
};

describe('SubscriptionsPageComponent (Vitest)', () => {
  let component: SubscriptionsPageLike;
  let currentUser: { id: number; username: string } | null;

  const subscriptionsServiceMock = {
    getUserSubscribedChannels: vi.fn(),
    unsubscribeChannel: vi.fn()
  };

  const authServiceMock = {
    isLoggedIn: vi.fn(() => Boolean(currentUser)),
    currentUser: vi.fn(() => currentUser)
  };

  beforeEach(() => {
    vi.clearAllMocks();
    currentUser = null;

    const injector = Injector.create({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: SubscriptionsService, useValue: subscriptionsServiceMock }
      ]
    });

    component = runInInjectionContext(injector, () => new SubscriptionsPageComponent()) as unknown as SubscriptionsPageLike;
  });

  it('shows login error when user is not logged in', () => {
    component.ngOnInit();

    expect(subscriptionsServiceMock.getUserSubscribedChannels).not.toHaveBeenCalled();
    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toBe('You must be logged in to view subscriptions.');
  });

  it('loads subscribed channels for logged in user', () => {
    currentUser = { id: 5, username: 'demo' };
    subscriptionsServiceMock.getUserSubscribedChannels.mockReturnValue(of(['Music Lab', 'Code TV']));

    component.ngOnInit();

    expect(subscriptionsServiceMock.getUserSubscribedChannels).toHaveBeenCalledWith(5);
    expect(component.channels()).toEqual(['Music Lab', 'Code TV']);
    expect(component.errorMessage()).toBe('');
    expect(component.isLoading()).toBe(false);
  });

  it('shows API error when subscriptions request fails', () => {
    currentUser = { id: 5, username: 'demo' };
    subscriptionsServiceMock.getUserSubscribedChannels.mockReturnValue(throwError(() => new Error('failed')));

    component.ngOnInit();

    expect(component.channels()).toEqual([]);
    expect(component.errorMessage()).toBe('Unable to load subscriptions.');
    expect(component.isLoading()).toBe(false);
  });

  it('unsubscribes from channel and removes it from list', () => {
    currentUser = { id: 5, username: 'demo' };
    subscriptionsServiceMock.getUserSubscribedChannels.mockReturnValue(of(['Music Lab', 'Code TV']));
    subscriptionsServiceMock.unsubscribeChannel.mockReturnValue(of(void 0));

    component.ngOnInit();
    component.onUnsubscribe('Code TV');

    expect(subscriptionsServiceMock.unsubscribeChannel).toHaveBeenCalledWith(5, 'Code TV');
    expect(component.channels()).toEqual(['Music Lab']);
    expect(component.unsubscribingChannel()).toBeNull();
    expect(component.errorMessage()).toBe('');
  });

  it('shows error when unsubscribe request fails', () => {
    currentUser = { id: 5, username: 'demo' };
    subscriptionsServiceMock.getUserSubscribedChannels.mockReturnValue(of(['Code TV']));
    subscriptionsServiceMock.unsubscribeChannel.mockReturnValue(throwError(() => new Error('failed')));

    component.ngOnInit();
    component.onUnsubscribe('Code TV');

    expect(component.channels()).toEqual(['Code TV']);
    expect(component.unsubscribingChannel()).toBeNull();
    expect(component.errorMessage()).toBe('Unable to unsubscribe from this channel.');
  });
});

