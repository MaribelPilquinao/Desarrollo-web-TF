import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { mensajeDeError } from '../../core/api';
import { DatosRegistro, SesionService } from '../../core/services/sesion.service';
import { DEMO_CODE } from '../login/login';
function matching(control:AbstractControl):ValidationErrors|null {return control.get('password')?.value===control.get('confirm')?.value ? null : {mismatch:true};}
@Component({selector:'app-registro',imports:[ReactiveFormsModule,RouterLink],templateUrl:'./registro.html',styleUrl:'../acceso.css'})
export class Registro {
  private readonly sesion=inject(SesionService);
  readonly code=DEMO_CODE;
  readonly step=signal<'form'|'verify'|'done'>('form');readonly error=signal('');readonly loading=signal(false);
  private pending:Omit<DatosRegistro,'codigo'>|null=null;
  readonly form=new FormGroup({
    name:new FormControl('',{nonNullable:true,validators:[Validators.required,Validators.minLength(2),Validators.pattern(/.*\S.*/)]}),
    email:new FormControl('',{nonNullable:true,validators:[Validators.required,Validators.email]}),
    phone:new FormControl('',{nonNullable:true,validators:[Validators.required,Validators.pattern(/^9\d{8}$/)]}),
    password:new FormControl('',{nonNullable:true,validators:[Validators.required,Validators.minLength(8),Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)]}),
    confirm:new FormControl('',{nonNullable:true,validators:[Validators.required]}),
    address:new FormControl('',{nonNullable:true}),payment:new FormControl('',{nonNullable:true})
  },{validators:matching});
  readonly verification=new FormControl('',{nonNullable:true,validators:[Validators.required,Validators.pattern(/^\d{6}$/)]});
  invalid(field:keyof typeof this.form.controls):boolean {const c=this.form.controls[field];return c.touched && c.invalid;}
  submit():void {
    this.error.set('');
    for(const field of ['name','email','phone'] as const)this.form.controls[field].setValue(this.form.controls[field].value.trim());
    this.form.markAllAsTouched();
    if(this.form.invalid){this.error.set('Revisa los campos indicados y confirma que ambas contraseñas coincidan.');return;}
    const value=this.form.getRawValue();
    // La dirección todavía no se guarda en el backend.
    this.pending={nombre:value.name,correo:value.email,telefono:value.phone,contrasena:value.password,preferencia_pago:value.payment.toLowerCase()};
    this.verification.reset();this.step.set('verify');
  }
  async verify():Promise<void> {
    this.verification.markAsTouched();
    if(!this.pending || this.loading()) return;
    if(this.verification.invalid){this.error.set('Ingresa el código de 6 dígitos.');return;}
    this.loading.set(true);
    try { await this.sesion.registrar({...this.pending,codigo:this.verification.value}); }
    catch(error) { this.error.set(mensajeDeError(error)); return; }
    finally { this.loading.set(false); }
    this.error.set('');this.form.reset();this.pending=null;this.step.set('done');
  }
  back():void {this.pending=null;this.error.set('');this.step.set('form');}
}
