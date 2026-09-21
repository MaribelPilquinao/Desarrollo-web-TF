import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';
import { DemoAuthService } from './core/services/demo-auth.service';
describe('Navegación del sprint 1',()=>{
 it('conecta los módulos y actualiza el cierre de sesión',async()=>{sessionStorage.clear();await TestBed.configureTestingModule({imports:[App],providers:[provideRouter([])]}).compileComponents();const f=TestBed.createComponent(App);await f.whenStable();expect(f.nativeElement.querySelector('a[href="/login"]')).toBeTruthy();expect(f.nativeElement.querySelector('a[href="/malvino-chatbot"]')).toBeTruthy();f.componentInstance.menuOpen.set(true);await f.whenStable();expect(f.nativeElement.querySelector('#navbarMain').classList.contains('show')).toBe(true);f.componentInstance.menuOpen.set(false);TestBed.inject(DemoAuthService).login('demo@malvitec.com','Malvitec123!');await f.whenStable();expect(f.nativeElement.textContent).toContain('Cerrar sesión');TestBed.inject(DemoAuthService).logout();await f.whenStable();expect(f.nativeElement.querySelector('a[href="/login"]')).toBeTruthy();});
});
