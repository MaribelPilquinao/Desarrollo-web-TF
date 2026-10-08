import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { mensajeDeError } from '../../core/api';
import { SesionService } from '../../core/services/sesion.service';
export const DEMO_EMAIL = 'demo@malvitec.com';
export const DEMO_PASSWORD = 'Malvitec123!';
export const DEMO_CODE = '123456';
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;
@Component({selector:'app-login',imports:[ReactiveFormsModule,RouterLink],templateUrl:'./login.html',styleUrl:'../acceso.css'})
export class Login {
  private readonly sesion = inject(SesionService); private readonly router = inject(Router);
  readonly email = DEMO_EMAIL; readonly password = DEMO_PASSWORD; readonly code = DEMO_CODE;
  readonly visible = signal(false); readonly error = signal(''); readonly loading = signal(false);
  readonly recovery = signal(false); readonly recovered = signal(false); readonly recoveryError = signal('');
  readonly form = new FormGroup({email:new FormControl('',{nonNullable:true,validators:[Validators.required,Validators.email]}),password:new FormControl('',{nonNullable:true,validators:[Validators.required,Validators.minLength(8)]})});
  readonly recoveryForm = new FormGroup({
    email:new FormControl('',{nonNullable:true,validators:[Validators.required,Validators.email]}),
    code:new FormControl('',{nonNullable:true,validators:[Validators.required,Validators.pattern(/^\d{6}$/)]}),
    password:new FormControl('',{nonNullable:true,validators:[Validators.required,Validators.minLength(8),Validators.pattern(PASSWORD_PATTERN)]})
  });
  async submit(): Promise<void> {
    this.error.set('');this.form.controls.email.setValue(this.form.controls.email.value.trim());this.form.markAllAsTouched();
    if(this.form.invalid || this.loading()) return;
    const {email,password}=this.form.getRawValue();
    this.loading.set(true);
    try { await this.sesion.iniciarSesion(email,password); }
    catch(error) { this.error.set(mensajeDeError(error)); return; }
    finally { this.loading.set(false); }
    this.form.controls.password.reset();void this.router.navigate(['/home']);
  }
  async recover(): Promise<void> {
    this.recovered.set(false);this.recoveryError.set('');this.recoveryForm.markAllAsTouched();
    if(this.recoveryForm.invalid){this.recoveryError.set('Ingresa tu correo, el código de 6 dígitos y una contraseña nueva válida.');return;}
    const value=this.recoveryForm.getRawValue();
    try { await this.sesion.recuperar(value.email.trim(),value.code,value.password); }
    catch(error) { this.recoveryError.set(mensajeDeError(error)); return; }
    this.recoveryForm.reset();this.recovered.set(true);
  }
}
