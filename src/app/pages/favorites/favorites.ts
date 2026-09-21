import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-favorites',
  imports: [RouterLink],
  templateUrl: './favorites.html',
  styleUrl: './favorites.css',
})
export class Favorites implements OnInit {

  private readonly FAV_KEY = 'malvitec_favorites';

  favoritos: {
    id: string;
    title: string;
    price: number;
    img: string;
  }[] = [];

  ngOnInit(): void {
    this.cargarFavoritos();
  }

  cargarFavoritos(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    const datos = localStorage.getItem(this.FAV_KEY);

    if (!datos) {
      this.favoritos = [];
      return;
    }

    try {
      const favoritosGuardados = JSON.parse(datos);

      this.favoritos = Array.isArray(favoritosGuardados)
        ? favoritosGuardados
        : [];

    } catch {
      this.favoritos = [];
    }
  }

  eliminarFavorito(id: string): void {
    this.favoritos = this.favoritos.filter(
      producto => producto.id !== id
    );

    localStorage.setItem(
      this.FAV_KEY,
      JSON.stringify(this.favoritos)
    );
  }
}
