import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { DemoAuthService } from './core/services/demo-auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  readonly menuOpen = signal(false);
  readonly demoAuth = inject(DemoAuthService);
  private readonly router = inject(Router);
  logout(): void { this.menuOpen.set(false); this.demoAuth.logout(); void this.router.navigate(['/login']); }

  protected readonly title = signal('desarrollo-web-TF');
}
