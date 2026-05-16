import { Routes } from '@angular/router';
import { HomePageComponent } from './home-page/home-page';
import { LoginPageComponent } from './login-page/login-page';
import { LogoutPageComponent } from './logout-page/logout-page';
import { VideoDetailsComponent } from './video-details/video-details';
import { LikedVideosPageComponent } from './liked-videos-page/liked-videos-page';
import { RegisterPageComponent } from './register-page/register-page';
import { PlaylistsPageComponent } from './playlists-page/playlists-page';
import { WatchHistoryPageComponent } from './watch-history-page/watch-history-page';
import { SettingsPageComponent } from './settings-page/settings-page';
import { SubscriptionsPageComponent } from './subscriptions-page/subscriptions-page';
import { MyVideosPageComponent } from './my-videos-page/my-videos-page';

export const appRoutes: Routes = [
  { path: '', component: HomePageComponent },
  { path: 'video/:id', component: VideoDetailsComponent },
  { path: 'liked-videos', component: LikedVideosPageComponent },
  { path: 'playlists', component: PlaylistsPageComponent },
  { path: 'watch-history', component: WatchHistoryPageComponent },
  { path: 'subscriptions', component: SubscriptionsPageComponent },
  { path: 'my-videos', component: MyVideosPageComponent },
  { path: 'login', component: LoginPageComponent },
  { path: 'register', component: RegisterPageComponent },
  { path: 'logout', component: LogoutPageComponent },
  { path: 'settings', component: SettingsPageComponent }
];
