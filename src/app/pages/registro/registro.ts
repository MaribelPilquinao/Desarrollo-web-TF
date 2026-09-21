import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DemoAuthService, DEMO_EMAIL, DEMO_PASSWORD, DEMO_CODE, DemoProfile } from '../../core/services/demo-auth.service';
function matching(control:AbstractControl):ValidationErrors|null {return control.get('password')?.value===control.get('confirm')?.value ? null : {mismatch:true};}
@Component({selector:'app-registro',imports:[ReactiveFormsModule,RouterLink],templateUrl:'./registro.html',styleUrl:'../acceso.css'})
export class Registro {
  private readonly auth=inject(DemoAuthService);
  readonly email=DEMO_EMAIL;readonly password=DEMO_PASSWORD;readonly code=DEMO_CODE;
  readonly step=signal<'form'|'verify'|'done'>('form');readonly error=signal('');
  private pending:DemoProfile|null=null;
  readonly form=new FormGroup({
    name:new FormControl('',{nonNullable:true,validators:[Validators.required,Validators.minLength(2),Validators.pattern(/.*\S.*/)]}),
    email:new FormControl('',{nonNullable:true,validators:[Validators.required,Validators.email]}),
    phone:new FormControl('',{nonNullable:true,validators:[Validators.required,Validators.pattern(/^9\d{8}$/)]}),
    password:new FormControl('',{nonNullable:true,validators:[Validators.required,Validators.minLength(8),Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/)]}),
    confirm:new FormControl('',{nonNullable:true,validators:[Validators.required]}),
    address:new FormControl('',{nonNullable:true}),payment:new FormControl('',{nonNullable:true})
  },{validators:matching});
  readonly verification=new FormControl('',{nonNullable:true,validators:[Validators.required,Validators.pattern(/^\d{6}$/)]});
  fillDemo():void {this.form.setValue({name:'Anthony (prueba)',email:DEMO_EMAIL,phone:'999888777',password:DEMO_PASSWORD,confirm:DEMO_PASSWORD,address:'',payment:''});this.error.set('');}
  invalid(field:keyof typeof this.form.controls):boolean {const c=this.form.controls[field];return c.touched && c.invalid;}
  submit():void {
    this.error.set('');
    for(const field of ['name','email','phone'] as const)this.form.controls[field].setValue(this.form.controls[field].value.trim());
    this.form.markAllAsTouched();
    if(this.form.invalid){this.error.set('Revisa los campos indicados y confirma que ambas contraseñas coincidan.');return;}
    const value=this.form.getRawValue();
    if(value.email.toLowerCase()!==DEMO_EMAIL || value.password!==DEMO_PASSWORD){this.error.set('Esta entrega trabaja con un único usuario. Usa el correo y la contraseña de prueba indicados.');return;}
    this.pending={name:value.name,phone:value.phone,address:value.address,payment:value.payment};this.verification.reset();this.step.set('verify');
  }
  verify():void {
    this.verification.markAsTouched();
    if(!this.pending || !this.auth.register(this.pending,DEMO_EMAIL,DEMO_PASSWORD,this.verification.value)){this.error.set('Código incorrecto. Usa el código de demostración 123456.');return;}
    this.error.set('');this.form.reset();this.pending=null;this.step.set('done');
  }
  back():void {this.pending=null;this.error.set('');this.step.set('form');}
}
