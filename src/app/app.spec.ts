import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { API_URL } from './core/api';
import { SesionService } from './core/services/sesion.service';
describe('Navegación',()=>{
 it('conecta los módulos y actualiza el cierre de sesión',async()=>{localStorage.clear();await TestBed.configureTestingModule({imports:[App],providers:[provideRouter([]),provideHttpClient(),provideHttpClientTesting()]}).compileComponents();const f=TestBed.createComponent(App);await f.whenStable();expect(f.nativeElement.querySelector('a[href="/login"]')).toBeTruthy();expect(f.nativeElement.querySelector('a[href="/malvino-chatbot"]')).toBeTruthy();f.componentInstance.menuOpen.set(true);await f.whenStable();expect(f.nativeElement.querySelector('#navbarMain').classList.contains('show')).toBe(true);f.componentInstance.menuOpen.set(false);
  const http=TestBed.inject(HttpTestingController);const sesion=TestBed.inject(SesionService);
  const ingreso=sesion.iniciarSesion('demo@malvitec.com','Malvitec123!');http.expectOne(`${API_URL}/auth/login`).flush({token:'t',usuario:{id:1,nombre:'Demo',apellidos:null,correo:'demo@malvitec.com',rol:'cliente'}});await ingreso;await f.whenStable();expect(f.nativeElement.textContent).toContain('Cerrar sesión');
  http.expectOne(`${API_URL}/carrito`).flush({items:[{slug:'hp-omen-16',titulo:'HP',imagen_url:'',precio_actual:10,cantidad:3,stock:5}],subtotal:30,costo_envio:15,total:45});http.expectOne(`${API_URL}/favoritos`).flush([]);await new Promise(r=>setTimeout(r));await f.whenStable();expect(f.nativeElement.querySelector('a[href="/cart"] .badge').textContent).toContain('3');
  sesion.cerrarSesion();await f.whenStable();expect(f.nativeElement.querySelector('a[href="/login"]')).toBeTruthy();expect(f.nativeElement.querySelector('a[href="/cart"] .badge')).toBeNull();});
});
