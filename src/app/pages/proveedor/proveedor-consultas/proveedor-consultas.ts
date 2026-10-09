import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { mensajeDeError } from '../../../core/api';
import { Consulta } from '../../../core/models/consulta.model';
import { ProveedorService } from '../../../core/services/proveedor.service';

type Filtro = 'Todas' | 'Nueva' | 'Respondida';
 
 @Component({
  selector: 'app-proveedor-consultas',
  imports: [DatePipe],
  templateUrl: './proveedor-consultas.html',
  styleUrl: './proveedor-consultas.css'
 })

export class ProveedorConsultas implements OnInit {
  private readonly api = inject(ProveedorService);

  readonly filtros: { valor: Filtro; texto: string }[] = [
    { valor: 'Todas', texto: 'Todas' },
    { valor: 'Nueva', texto: 'Nuevas' },
    { valor: 'Respondida', texto: 'Respondidas' }
  ];
  readonly consultas = signal<Consulta[]>([]);
  readonly cargando = signal(true);
  readonly error = signal('');
  readonly enviando = signal<number | null>(null);
  readonly filtro = signal<Filtro>('Todas');

  readonly visibles = computed(() =>
    this.consultas().filter(c => this.filtro() === 'Todas' || c.estado === this.filtro())
  );

  ngOnInit(): void {
    void this.cargar();
  }

  cantidad(filtro: Filtro): number {
    return this.consultas().filter(c => filtro === 'Todas' || c.estado === filtro).length;
  }

  async cargar(): Promise<void> {
    this.cargando.set(true);
    this.error.set('');
    try {
      this.consultas.set(await this.api.consultas());
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.cargando.set(false);
    }
  }

  async responder(consulta: Consulta, texto: string): Promise<void> {
    const respuesta = texto.trim();
    if (!respuesta) {
      this.error.set('Escribe una respuesta antes de enviarla.');
      return;
    }
    if (this.enviando()) {
      return;
    }

    this.enviando.set(consulta.id);
    this.error.set('');
    try {
      const enviada = await this.api.responderConsulta(consulta.id, respuesta);
      this.consultas.update(lista =>
        lista.map(c =>
          c.id === enviada.id
            ? { ...c, respuesta: enviada.respuesta, estado: 'Respondida', respondida_en: new Date().toISOString() }
            : c
        )
      );
    } catch (error) {
      this.error.set(mensajeDeError(error));
    } finally {
      this.enviando.set(null);
    }
  }
}