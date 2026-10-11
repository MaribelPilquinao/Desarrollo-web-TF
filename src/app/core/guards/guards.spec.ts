import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { Route, Router, UrlSegment, UrlTree, provideRouter } from '@angular/router';

import { soloProveedor } from './guards';
import { SesionService } from './services/sesion.service';

// Un token con exp en el futuro para que SesionService lo considere vigente.
function token(): string {
  const cuerpo = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000)  3600 }));
  return `a.${cuerpo}.c`;
}

function sesionGuardada(rol: 'cliente' | 'proveedor'): void {
  localStorage.setItem(
    'malvitec_sesion',
    JSON.stringify({ token: token(), usuario: { id: 8, nombre: 'T', apellidos: null, correo: 't@x.pe', rol } })
  );
}

describe('soloProveedor', () => {
  const ejecutar = () =>
    TestBed.runInInjectionContext(() => soloProveedor({} as Route, [] as UrlSegment[]));

  beforeEach(() => {
    localStorage.clear();
  });

  function preparar(): Router {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    return TestBed.inject(Router);
  }

  it('sin sesión lleva al login', () => {
    const router = preparar();
    const resultado = ejecutar() as UrlTree;
    expect(router.serializeUrl(resultado)).toBe('/login');
  });

  it('un cliente vuelve al inicio', () => {
    sesionGuardada('cliente');
    const router = preparar();
    expect(router.serializeUrl(ejecutar() as UrlTree)).toBe('/home');
  });

  it('un proveedor entra', () => {
    sesionGuardada('proveedor');
    preparar();
    expect(ejecutar()).toBe(true);
  });
});