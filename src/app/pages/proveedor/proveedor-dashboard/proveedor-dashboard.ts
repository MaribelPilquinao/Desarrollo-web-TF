import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { mensajeDeError } from '../../../core/api';
import { ResumenProveedor } from '../../../core/models/proveedor.model';
import { ProveedorService } from '../../../core/services/proveedor.service';
import { claseEstado } from '../proveedor-ui';
 
 @Component({
   selector: 'app-proveedor-dashboard',
  imports: [RouterLink, DatePipe, DecimalPipe],
   templateUrl: './proveedor-dashboard.html',
   styleUrl: './proveedor-dashboard.css'
 })
 export class ProveedorDashboard implements OnInit {
  private readonly api = inject(ProveedorService);

  readonly resumen = signal<ResumenProveedor | null>(null);
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly claseEstado = claseEstado;
 
  ngOnInit(): void {
    void this.cargar();
  }
 
  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      this.resumen.set(await this.api.resumen());
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
   }

}