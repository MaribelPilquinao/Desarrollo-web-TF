import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { MiCuenta } from './mi-cuenta';
import { API_URL } from '../../core/api';

// El front descarta tokens vencidos, así que se arma uno que vence en una hora.
const TOKEN = `x.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 }))}.x`;
const SESION = {
  token: TOKEN,
  usuario: { id: 1, nombre: 'Demo', apellidos: null, correo: 'demo@malvitec.com', rol: 'cliente' }
};

describe('MiCuenta', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
      imports: [MiCuenta],
    }).compileComponents();
  });

  it('lleva al login si no hay sesión', () => {
    const nav = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    TestBed.createComponent(MiCuenta);
    expect(nav).toHaveBeenCalledWith(['/login']);
    TestBed.inject(HttpTestingController).expectNone(`${API_URL}/perfil`);
  });

  it('muestra los datos del perfil que devuelve el backend', async () => {
    localStorage.setItem('malvitec_sesion', JSON.stringify(SESION));
    const f = TestBed.createComponent(MiCuenta);
    TestBed.inject(HttpTestingController).expectOne(`${API_URL}/perfil`).flush({
      nombre: 'Usuario de prueba',
      apellidos: null,
      correo: 'demo@malvitec.com',
      telefono: '999888777',
      rol: 'cliente',
      preferencia_pago: 'yape_plin',
      creado_en: '2026-01-15T10:00:00',
      direccion: { departamento: 'Lima', distrito: 'Miraflores', direccion: 'Av. Ejemplo 123', referencia: 'Frente al parque' }
    });
    TestBed.inject(HttpTestingController).expectOne(`${API_URL}/pedidos`).flush([{
      id: 5, codi: 'MALV-ABC123', subtotal: 60, costo_envio: 0, total: 60, metodo_pago: 'tarjeta', fecha: '2026-10-10T12:00:00',
      items: [{ id: 9, titulo: 'Mouse Gamer', precio: 30, cantidad: 2, estado: 'En camino' }]
    }]);
    await new Promise(r => setTimeout(r));
    await f.whenStable();
    const texto = f.nativeElement.textContent;
    expect(texto).toContain('MALV-ABC123');
    expect(texto).toContain('Mouse Gamer');
    expect(texto).toContain('En camino');
    expect(texto).toContain('demo@malvitec.com');
    expect(texto).toContain('999888777');
    expect(texto).toContain('Yape / Plin');
    expect(texto).toContain('Av. Ejemplo 123');
  });
});
