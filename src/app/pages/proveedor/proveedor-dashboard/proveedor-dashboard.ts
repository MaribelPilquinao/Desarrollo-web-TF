import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProveedorContextService } from '../../../core/services/proveedor-context.service';
import { PedidoService } from '../../../core/services/pedido.service';
import { Pedido } from '../../../core/models/pedido.model';
import { Producto } from '../../../core/models/producto.model';
import { ProductoService } from '../../../core/services/producto.service';

@Component({
  selector: 'app-proveedor-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './proveedor-dashboard.html',
  styleUrl: './proveedor-dashboard.css'
})
export class ProveedorDashboard implements OnInit {
  private ctx = inject(ProveedorContextService);
  private pedidoService = inject(PedidoService);
  private productoService = inject(ProductoService);

  proveedor$ = this.ctx.getProveedorActual();
  pedidos : Pedido[] = [];
  pedidosPendientes : Pedido[] = [];
  productos : Producto[] = [];
  sinStock : Producto[] = [];

  ngOnInit() {
    this.pedidos = this.pedidoService.listarUltimos();
    this.pedidosPendientes = this.pedidoService.listarPendientes();
    this.productos = this.productoService.listarPorProveedor("mock-1");
    this.sinStock = this.productos.filter(producto => producto.stock === 0);
  }
  
}