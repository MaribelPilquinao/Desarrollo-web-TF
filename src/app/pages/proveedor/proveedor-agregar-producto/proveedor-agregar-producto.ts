import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-proveedor-agregar-producto',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './proveedor-agregar-producto.html',
  styleUrl: './proveedor-agregar-producto.css'
})
export class ProveedorAgregarProducto {
    constructor() {
    
    }
}