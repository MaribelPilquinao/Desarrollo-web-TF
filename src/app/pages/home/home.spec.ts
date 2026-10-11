import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';

import { Home } from './home';
import { API_URL } from '../../core/api';
import { BusquedaService } from '../../core/services/busqueda.service';

const PRODUCTO = {
  id: 3, slug: 'sony-wh-1000xm5', titulo: 'Audífonos Sony WH-1000XM5', descripcion: '', precio_actual: 1349, precio_anterior: 1799,
  descuento_pct: 25, stock: 20, imagen_url: 'https://x/a.png', tipo_envio: 'gratis', garantia_meses: 12, calificacion_prom: 4.5,
  num_opiniones: 2, tipo_accesorio: null, proveedor: 'GamerZone Perú', categoria: 'Audio'
};

async function asentar(f: { whenStable(): Promise<unknown> }): Promise<void> {
  await new Promise(resolver => setTimeout(resolver));
  await f.whenStable();
}

describe('Home', () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
      imports: [Home],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('muestra los productos del backend', async () => {
    const f = TestBed.createComponent(Home);
    f.detectChanges();
    http.expectOne(`${API_URL}/productos?orden=relevancia`).flush([PRODUCTO]);
    await asentar(f);
    const texto = f.nativeElement.textContent;
    expect(texto).toContain('Audífonos Sony WH-1000XM5');
    expect(texto).toContain('25% OFF');
    expect(texto).toContain('S/ 1,349');
    expect(f.nativeElement.querySelector('a[href="/producto-detalle/sony-wh-1000xm5"]')).toBeTruthy();
  });

  it('la búsqueda de la barra superior consulta el backend y vuelve a todas las categorías', async () => {
    const f = TestBed.createComponent(Home);
    f.detectChanges();
    http.expectOne(`${API_URL}/productos?orden=relevancia`).flush([]);

    f.componentInstance.seleccionarCategoria('laptops');
    http.expectOne(`${API_URL}/productos?categoria=laptops&orden=relevancia`).flush([]);

    const busqueda = TestBed.inject(BusquedaService);
    busqueda.actualizarTermino('sony');
    busqueda.buscar();
    f.detectChanges();
    http.expectOne(`${API_URL}/productos?buscar=sony&orden=relevancia`).flush([PRODUCTO]);
    await asentar(f);
    expect(f.componentInstance.categoriaSeleccionada).toBe('all');
    expect(f.nativeElement.textContent).toContain('Resultados de "sony"');
    expect(f.nativeElement.textContent).toContain('Audífonos Sony WH-1000XM5');
  });

  it('avisa cuando no hay resultados', async () => {
    const f = TestBed.createComponent(Home);
    f.detectChanges();
    http.expectOne(`${API_URL}/productos?orden=relevancia`).flush([]);
    await asentar(f);
    expect(f.nativeElement.textContent).toContain('No encontramos productos');
  });
});
