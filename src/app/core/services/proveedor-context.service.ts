
import { Injectable } from '@angular/core';
import { of, Observable } from 'rxjs';
import { Proveedor } from '../models/proveedor.model';

@Injectable({ providedIn: 'root' })
export class ProveedorContextService {
  getProveedorActual(): Observable<Proveedor> {
    return of({ id: 'mock-1', nombre: 'Tienda TechPower' });
  }
}