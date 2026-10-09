import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';

import { API_URL } from '../../core/api';
import { ProveedorAgregarProducto } from './proveedor-agregar-producto/proveedor-agregar-producto';
import { ProveedorConsultas } from './proveedor-consultas/proveedor-consultas';
import { ProveedorDashboard } from './proveedor-dashboard/proveedor-dashboard';
import { ProveedorPedidos } from './proveedor-pedidos/proveedor-pedidos';
import { ProveedorProductos } from './proveedor-productos/proveedor-productos';

const base = `${API_URL}/proveedor`;

const PRODUCTO = {
  slug: 'mouse-gamer', titulo: 'Mouse Gamer', descripcion: null, categoria: 'perifericos', categoria_nombre: 'Periféricos',
  precio_actual: 189, precio_anterior: null, descuento_pct: 0, stock: 0, imagen_url: null, tipo_envio: 'estandar',
  garantia_meses: 12, tipo_accesorio: null, activo: true, actualizado_en: '2026-10-01T10:00:00'
};
const PEDIDO = {
  id: 3, codi: 'MALV-4514', fecha: '2026-09-29T11:05:00', cliente: 'Luis Torres', telefono: '900000004',
  departamento: 'Piura', distrito: 'Castilla', direccion: 'Jr. Ejemplo 321', referencia: null, metodo_pago: 'contra_entrega',
  producto: 'Mouse Gamer', cantidad: 1, precio_unitario: 189, total: 189, estado: 'Pendiente'
};
const CONSULTA = {
  id: 7, producto: 'Mouse Gamer', producto_slug: 'mouse-gamer', cliente: 'Juan Pérez', mensaje: '¿Sirve para PS5?',
  respuesta: null, estado: 'Nueva', fecha: '2026-10-01T09:00:00', respondida_en: null
};

// Deja que se resuelvan las promesas de firstValueFrom y que Angular repinte la pantalla.
async function asentar(f: { whenStable(): Promise<unknown> }): Promise<void> {
  await new Promise(resolver => setTimeout(resolver));
  await f.whenStable();
}

describe('Panel de proveedor', () => {
  let http: HttpTestingController;

  function preparar(extra: object[] = []): void {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), ...extra]
    });
    http = TestBed.inject(HttpTestingController);
  }

  afterEach(() => http.verify());

  it('el dashboard muestra el resumen del backend', async () => {
    preparar();
    const f = TestBed.createComponent(ProveedorDashboard);
    f.detectChanges();
    http.expectOne(`${base}/resumen`).flush({
      nombre_comercial: 'TechPower Store', productos_publicados: 4, sin_stock: 1, pedidos_pendientes: 2,
      consultas_nuevas: 2, ventas: 1007, ultimos_pedidos: [PEDIDO], productos_sin_stock: [{ slug: 'mouse-gamer', titulo: 'Mouse Gamer' }]
    });
    await asentar(f);
    const texto = f.nativeElement.textContent;
    expect(texto).toContain('TechPower Store');
    expect(texto).toContain('1,007.00');
    expect(texto).toContain('MALV-4514');
    expect(texto).toContain('Sin stock:');
  });

  it('el dashboard muestra el error y permite reintentar', async () => {
    preparar();
    const f = TestBed.createComponent(ProveedorDashboard);
    f.detectChanges();
    http.expectOne(`${base}/resumen`).flush({ error: 'Tu cuenta no tiene un perfil de proveedor' }, { status: 403, statusText: 'Forbidden' });
    await asentar(f);
    expect(f.nativeElement.textContent).toContain('no tiene un perfil de proveedor');
    expect(f.nativeElement.querySelector('button.btn-outline-danger')).toBeTruthy();
  });

  it('productos: lista, oculta un producto y actualiza la fila', async () => {
    preparar();
    const f = TestBed.createComponent(ProveedorProductos);
    f.detectChanges();
    http.expectOne(`${base}/productos`).flush([PRODUCTO]);
    await asentar(f);
    expect(f.nativeElement.textContent).toContain('Mouse Gamer');
    expect(f.nativeElement.textContent).toContain('Sin stock');

    const envio = f.componentInstance.alternarPublicacion(f.componentInstance.productos()[0]);
    const req = http.expectOne(`${base}/productos/mouse-gamer`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ activo: false });
    req.flush({ ...PRODUCTO, activo: false });
    await envio;
    await asentar(f);
    expect(f.nativeElement.textContent).toContain('Oculto');
  });

  it('productos: valida el stock antes de llamar al backend y muestra errores del servidor', async () => {
    preparar();
    const f = TestBed.createComponent(ProveedorProductos);
    f.detectChanges();
    http.expectOne(`${base}/productos`).flush([PRODUCTO]);
    await asentar(f);

    await f.componentInstance.guardarStock(PRODUCTO as never, '-3');
    expect(f.componentInstance.error()).toContain('entero');

    const envio = f.componentInstance.guardarStock(PRODUCTO as never, '8');
    http.expectOne(`${base}/productos/mouse-gamer`).flush({ error: 'El stock debe ser un número entero entre 0 y 100000' }, { status: 400, statusText: 'Bad Request' });
    await envio;
    expect(f.componentInstance.error()).toContain('entre 0 y 100000');
  });

  it('pedidos: marca en camino, y cancelar pide confirmación', async () => {
    preparar();
    const f = TestBed.createComponent(ProveedorPedidos);
    f.detectChanges();
    http.expectOne(`${base}/pedidos`).flush([PEDIDO]);
    await asentar(f);
    expect(f.nativeElement.textContent).toContain('Luis Torres');

    const envio = f.componentInstance.cambiarEstado(PEDIDO as never, 'En camino');
    const req = http.expectOne(`${base}/pedidos/3`);
    expect(req.request.body).toEqual({ estado: 'En camino' });
    req.flush({ ...PEDIDO, estado: 'En camino' });
    await envio;
    expect(f.componentInstance.pedidos()[0].estado).toBe('En camino');

    const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(false);
    await f.componentInstance.cambiarEstado(PEDIDO as never, 'Cancelado');
    expect(confirmar).toHaveBeenCalled();
    http.expectNone(`${base}/pedidos/3`);
    confirmar.mockRestore();
  });

  it('pedidos: filtra por estado y agrupa Completado con Entregado', async () => {
    preparar();
    const f = TestBed.createComponent(ProveedorPedidos);
    f.detectChanges();
    http.expectOne(`${base}/pedidos`).flush([PEDIDO, { ...PEDIDO, id: 4, estado: 'Completado' }]);
    await asentar(f);
    f.componentInstance.filtro.set('Entregado');
    expect(f.componentInstance.visibles().map(p => p.id)).toEqual([4]);
    f.componentInstance.filtro.set('Pendiente');
    expect(f.componentInstance.visibles().map(p => p.id)).toEqual([3]);
  });

  it('consultas: responde y pasa a Respondida; no envía respuestas vacías', async () => {
    preparar();
    const f = TestBed.createComponent(ProveedorConsultas);
    f.detectChanges();
    http.expectOne(`${base}/consultas`).flush([CONSULTA]);
    await asentar(f);
    expect(f.nativeElement.textContent).toContain('¿Sirve para PS5?');

    await f.componentInstance.responder(CONSULTA as never, '   ');
    expect(f.componentInstance.error()).toContain('Escribe una respuesta');
    http.expectNone(`${base}/consultas/7`);

    const envio = f.componentInstance.responder(CONSULTA as never, ' Sí, es compatible. ');
    const req = http.expectOne(`${base}/consultas/7`);
    expect(req.request.body).toEqual({ respuesta: 'Sí, es compatible.' });
    req.flush({ id: 7, respuesta: 'Sí, es compatible.', estado: 'Respondida' });
    await envio;
    await asentar(f);
    expect(f.componentInstance.consultas()[0].estado).toBe('Respondida');
    expect(f.nativeElement.textContent).toContain('Sí, es compatible.');
  });

  it('agregar producto: valida y envía los datos limpios', async () => {
    preparar();
    const f = TestBed.createComponent(ProveedorAgregarProducto);
    f.detectChanges();
    http.expectOne(`${base}/categorias`).flush([{ slug: 'perifericos', nombre: 'Periféricos' }, { slug: 'accesorios', nombre: 'Accesorios' }]);
    await asentar(f);
    const c = f.componentInstance;
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    await c.guardar();
    http.expectNone(`${base}/productos`);
    expect(c.form.invalid).toBe(true);

    c.form.patchValue({ titulo: '  Mouse Pro ', categoria: 'perifericos', precio_actual: 120, precio_anterior: 100, stock: 5 });
    await c.guardar();
    http.expectNone(`${base}/productos`); // anterior <= actual
    expect(c.form.hasError('precioAnterior')).toBe(true);

    c.form.patchValue({ precio_anterior: 150, tipo_accesorio: 'case' });
    const envio = c.guardar();
    const req = http.expectOne(`${base}/productos`);
    expect(req.request.body).toEqual({
      titulo: 'Mouse Pro', descripcion: null, categoria: 'perifericos', precio_actual: 120, precio_anterior: 150, stock: 5,
      imagen_url: null, tipo_envio: 'estandar', garantia_meses: 12, tipo_accesorio: null
    });
    req.flush({ slug: 'mouse-pro' }, { status: 201, statusText: 'Created' });
    await envio;
    expect(navegar).toHaveBeenCalledWith(['/proveedor/productos']);
  });

  it('agregar producto: muestra el error del backend y no navega', async () => {
    preparar();
    const f = TestBed.createComponent(ProveedorAgregarProducto);
    f.detectChanges();
    http.expectOne(`${base}/categorias`).flush([{ slug: 'perifericos', nombre: 'Periféricos' }]);
    await asentar(f);
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    f.componentInstance.form.patchValue({ titulo: 'Mouse', categoria: 'perifericos', precio_actual: 10, stock: 1 });
    const envio = f.componentInstance.guardar();
    http.expectOne(`${base}/productos`).flush({ error: 'Elige una categoría válida' }, { status: 400, statusText: 'Bad Request' });
    await envio;
    expect(f.componentInstance.error()).toBe('Elige una categoría válida');
    expect(f.componentInstance.guardando()).toBe(false);
    expect(navegar).not.toHaveBeenCalled();
  });

  it('editar producto: carga los datos y los guarda con PUT', async () => {
    preparar([{ provide: ActivatedRoute, useValue: { snapshot: { paramMap: new Map([['slug', 'mouse-gamer']]) } } }]);
    const f = TestBed.createComponent(ProveedorAgregarProducto);
    f.detectChanges();
    http.expectOne(`${base}/categorias`).flush([{ slug: 'perifericos', nombre: 'Periféricos' }]);
    await Promise.resolve();
    http.expectOne(`${base}/productos/mouse-gamer`).flush({ ...PRODUCTO, stock: 4 });
    await asentar(f);
    expect(f.componentInstance.editando).toBe(true);
    expect(f.componentInstance.form.controls.titulo.value).toBe('Mouse Gamer');
    expect(f.componentInstance.form.controls.stock.value).toBe(4);

    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    f.componentInstance.form.patchValue({ stock: 9 });
    const envio = f.componentInstance.guardar();
    const req = http.expectOne(`${base}/productos/mouse-gamer`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body.stock).toBe(9);
    req.flush(PRODUCTO);
    await envio;
  });
});