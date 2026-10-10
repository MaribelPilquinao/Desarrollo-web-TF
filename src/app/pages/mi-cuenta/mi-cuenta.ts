import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';

import { mensajeDeError } from '../../core/api';
import { Perfil, PerfilService } from '../../core/services/perfil.service';
import { SesionService } from '../../core/services/sesion.service';

const METODOS_PAGO: Record<string, string> = {
  tarjeta: 'Tarjeta',
  yape_plin: 'Yape / Plin',
  contra_entrega: 'Contra entrega'
};

@Component({
  selector: 'app-mi-cuenta',
  imports: [DatePipe],
  templateUrl: './mi-cuenta.html',
  styleUrl: './mi-cuenta.css',
})
export class MiCuenta {
  private readonly perfilService = inject(PerfilService);

  // signals: cambian después de la respuesta HTTP y la app no usa zone.js.
  readonly perfil = signal<Perfil | null>(null);
  readonly cargando = signal(true);
  readonly error = signal('');

  constructor() {
    if (!inject(SesionService).conectado()) {
      void inject(Router).navigate(['/login']);
      return;
    }
    void this.cargar();
  }

  metodoPago(valor: string | null): string {
    return valor ? METODOS_PAGO[valor] ?? valor : 'Sin preferencia';
  }

  private async cargar() {
    try {
      this.perfil.set(await this.perfilService.obtener());
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }
}
