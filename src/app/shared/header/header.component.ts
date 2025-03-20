import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  constructor(private router: Router) {}

  // Método para determinar si Phase 2 debe estar activo
  isPhase2Active(): boolean {
    const currentRoute = this.router.url;
    return currentRoute !== '/'; // Activo en todas las rutas excepto en la raíz
  }
}