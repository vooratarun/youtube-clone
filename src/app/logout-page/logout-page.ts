import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-logout-page',
  imports: [RouterLink],
  templateUrl: './logout-page.html',
  styleUrl: './logout-page.css'
})
export class LogoutPageComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    const confirmed = window.confirm('Are you sure you want to logout?');
    if (confirmed) {
      this.authService.logout();
    } else {
      this.router.navigate(['/']);
    }
  }
}

