import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class BusquedaService {

  termino = signal('');
  consulta = signal('');

  actualizarTermino(valor: string): void {
    this.termino.set(valor);
  }

  buscar(): void {
    this.consulta.set(this.termino().trim());
  }
}