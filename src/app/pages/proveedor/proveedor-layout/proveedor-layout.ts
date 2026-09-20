import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-proveedor-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './proveedor-layout.html',
  styleUrl: './proveedor-layout.css'
})
export class ProveedorLayout {}