import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { API_URL } from '../api';
import { ProveedorService } from './proveedor.service';

describe('ProveedorService', () => {
  let servicio: ProveedorService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    servicio = TestBed.inject(ProveedorService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('pide el resumen, los productos, los pedidos y las consultas a /proveedor', async () => {
    const resumen = servicio.resumen();
    http.expectOne(`${API_URL}/proveedor/resumen`).flush({});
    await resumen;

    const productos = servicio.productos();
    http.expectOne(`${API_URL}/proveedor/productos`).flush([]);
    expect(await productos).toEqual([]);

    const pedidos = servicio.pedidos();
    http.expectOne(`${API_URL}/proveedor/pedidos`).flush([]);
    await pedidos;

    const consultas = servicio.consultas();
    http.expectOne(`${API_URL}/proveedor/consultas`).flush([]);
    await consultas;
  });

  it('crea y edita productos con el slug codificado en la ruta', async () => {
    const datos = {
      titulo: 'Mouse', descripcion: null, categoria: 'perifericos', precio_actual: 10, precio_anterior: null,
      stock: 3, imagen_url: null, tipo_envio: 'estandar' as const, garantia_meses: 12, tipo_accesorio: null
    };
    const alta = servicio.crearProducto(datos);
    const reqAlta = http.expectOne(`${API_URL}/proveedor/productos`);
    expect(reqAlta.request.method).toBe('POST');
    expect(reqAlta.request.body).toEqual(datos);
    reqAlta.flush({ slug: 'mouse' });
    await alta;

    const edicion = servicio.editarProducto('mouse gamer/x', { activo: false });
    const reqEdicion = http.expectOne(`${API_URL}/proveedor/productos/mouse%20gamer%2Fx`);
    expect(reqEdicion.request.method).toBe('PUT');
    expect(reqEdicion.request.body).toEqual({ activo: false });
    reqEdicion.flush({});
    await edicion;
  });

  it('cambia el estado de un pedido y responde una consulta', async () => {
    const pedido = servicio.cambiarEstadoPedido(3, 'En camino');
    const reqPedido = http.expectOne(`${API_URL}/proveedor/pedidos/3`);
    expect(reqPedido.request.method).toBe('PUT');
    expect(reqPedido.request.body).toEqual({ estado: 'En camino' });
    reqPedido.flush({});
    await pedido;

    const consulta = servicio.responderConsulta(7, 'Sí');
    const reqConsulta = http.expectOne(`${API_URL}/proveedor/consultas/7`);
    expect(reqConsulta.request.body).toEqual({ respuesta: 'Sí' });
    reqConsulta.flush({ id: 7, respuesta: 'Sí', estado: 'Respondida' });
    await consulta;
  });
});