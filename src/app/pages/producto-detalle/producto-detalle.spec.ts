import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';

import { ProductoDetalle } from './producto-detalle';
import { API_URL } from '../../core/api';

const PRODUCTO = {
  id: 1, slug: 'hp-omen-16', titulo: 'Laptop HP OMEN 16', descripcion: 'Laptop gamer.', precio_actual: 5547, precio_anterior: 7299,
  descuento_pct: 24, stock: 15, imagen_url: 'https://x/a.png', tipo_envio: 'gratis', garantia_meses: 12, calificacion_prom: 4.5,
  num_opiniones: 2, tipo_accesorio: null, proveedor: 'TechPower Store', categoria: 'Laptops', imagenes: [], especificaciones: [],
  configuraciones: [
    { slug: 'hp-omen-16', nombre: '16GB RAM • 1TB SSD', precio_actual: 5547, stock: 15 },
    { slug: 'hp-omen-16-32gb-1tb', nombre: '32GB RAM • 1TB SSD', precio_actual: 5947, stock: 6 }
  ]
};

async function asentar(f: { whenStable(): Promise<unknown> }): Promise<void> {
  await new Promise(resolver => setTimeout(resolver));
  await f.whenStable();
}

describe('ProductoDetalle', () => {
  let component: ProductoDetalle;
  let fixture: ComponentFixture<ProductoDetalle>;
  let http: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ slug: 'hp-omen-16' })) } }
      ],
      imports: [ProductoDetalle],
    }).compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ProductoDetalle);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('muestra el producto, sus opiniones y sus configuraciones, y al elegir otra abre ese producto', async () => {
    http.expectOne(`${API_URL}/productos/hp-omen-16`).flush(PRODUCTO);
    http.expectOne(`${API_URL}/opiniones/hp-omen-16`).flush([
      { id: 1, autor: 'Carlos Mendoza', calificacion: 5, comentario: 'Rinde muy bien.', creado_en: '2026-09-20T18:30:00' }
    ]);
    await asentar(fixture);

    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('Laptop HP OMEN 16');
    expect(texto).toContain('Carlos Mendoza');
    expect(texto).toContain('Inicia sesión');

    const opciones = [...fixture.nativeElement.querySelectorAll('.config-option')] as HTMLButtonElement[];
    expect(opciones.map(o => o.textContent?.trim())).toEqual(['16GB RAM • 1TB SSD', '32GB RAM • 1TB SSD']);
    expect(opciones[0].classList.contains('active')).toBe(true);

    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    opciones[0].click();
    expect(navegar).not.toHaveBeenCalled();
    opciones[1].click();
    expect(navegar).toHaveBeenCalledWith(['/producto-detalle', 'hp-omen-16-32gb-1tb']);
  });

  it('no muestra el bloque de configuración si el producto no tiene variantes', async () => {
    http.expectOne(`${API_URL}/productos/hp-omen-16`).flush({ ...PRODUCTO, num_opiniones: 0, configuraciones: [] });
    http.expectOne(`${API_URL}/opiniones/hp-omen-16`).flush([]);
    await asentar(fixture);
    expect(fixture.nativeElement.querySelector('.config-option')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('todavía no tiene opiniones');
  });
});
