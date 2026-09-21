import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { Login } from './login';
import { DemoAuthService } from '../../core/services/demo-auth.service';
describe('Login',()=>{
 beforeEach(async()=>{sessionStorage.clear();await TestBed.configureTestingModule({imports:[Login],providers:[provideRouter([])]}).compileComponents();});
 it('muestra errores al enviar vacío y rechaza credenciales incorrectas',async()=>{const f=TestBed.createComponent(Login);f.componentInstance.submit();await f.whenStable();expect(f.nativeElement.textContent).toContain('Ingresa un correo electrónico válido.');f.componentInstance.form.setValue({email:'demo@malvitec.com',password:'incorrecta'});f.componentInstance.submit();expect(f.componentInstance.error()).toContain('incorrectos');expect(TestBed.inject(DemoAuthService).stateView().loggedIn).toBe(false);});
 it('ingresa al inicio y borra la contraseña del formulario',()=>{const c=TestBed.createComponent(Login).componentInstance;const nav=vi.spyOn(TestBed.inject(Router),'navigate').mockResolvedValue(true);c.form.setValue({email:'demo@malvitec.com',password:'Malvitec123!'});c.submit();expect(nav).toHaveBeenCalledWith(['/home']);expect(c.form.controls.password.value).toBe('');});
 it('muestra y oculta la contraseña',async()=>{const f=TestBed.createComponent(Login);await f.whenStable();const button=f.nativeElement.querySelector('.password-row button') as HTMLButtonElement;button.click();await f.whenStable();expect(f.nativeElement.querySelector('#login-password').type).toBe('text');button.click();await f.whenStable();expect(f.nativeElement.querySelector('#login-password').type).toBe('password');});
 it('recuperación simulada verifica correo y código',()=>{const c=TestBed.createComponent(Login).componentInstance;c.recoveryForm.setValue({email:'otro@example.com',code:'123456'});c.recover();expect(c.recovered()).toBe(false);c.recoveryForm.setValue({email:'demo@malvitec.com',code:'123456'});c.recover();expect(c.recovered()).toBe(true);});
});
