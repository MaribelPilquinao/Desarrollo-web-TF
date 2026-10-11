import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { mensajeDeError } from '../../core/api';
import { Accesorio, MalvinoService, ModeloCelular } from '../../core/services/malvino.service';
@Component({selector:'app-malvino',imports:[FormsModule],templateUrl:'./malvino-chatbot.html',styleUrl:'./malvino-chatbot.css'})
export class MalvinoChatbot {
  private readonly service=inject(MalvinoService);
  @ViewChild('history') history?:ElementRef<HTMLElement>;
  // Accesorios y modelos del catálogo; se cargan del backend al abrir la página.
  readonly accessories=signal<Accesorio[]>([]);readonly models=signal<ModeloCelular[]>([]);
  readonly catalogError=signal('');readonly checking=signal(false);
  accessory='';model='';text='';
  readonly messages=signal([{role:'assistant',text:'¡Hola! Soy Malvino. Consulta el acceso de prueba o comprueba si un accesorio del catálogo sirve para tu celular.'}]);
  constructor(){void this.loadCatalog();}
  private async loadCatalog():Promise<void> {
    try {const c=await this.service.catalogo();this.accessories.set(c.accesorios);this.models.set(c.modelos);this.accessory=c.accesorios[0]?.slug??'';this.model=c.modelos[0]?.slug??'';}
    catch(error) {this.catalogError.set(mensajeDeError(error));}
  }
  private append(question:string,answer:string):void {this.messages.update(m=>[...m.slice(-38),{role:'user',text:question},{role:'assistant',text:answer}]);setTimeout(()=>{const e=this.history?.nativeElement;if(e)e.scrollTop=e.scrollHeight;});}
  send(value=this.text):void {const q=value.trim().slice(0,500);if(!q)return;this.append(q,this.service.answer(q));this.text='';}
  async check():Promise<void> {
    const accessory=this.accessories().find(a=>a.slug===this.accessory);const model=this.models().find(m=>m.slug===this.model);
    if(!accessory||!model||this.checking())return;
    this.checking.set(true);
    let answer:string;
    try {answer=await this.service.comprobar(accessory.slug,model.slug);}
    catch(error) {answer=mensajeDeError(error);}
    finally {this.checking.set(false);}
    this.append(`Comprobar ${accessory.titulo} con ${model.nombre}`,answer);
  }
  clear():void {this.messages.set([{role:'assistant',text:'Conversación borrada. ¿En qué puedo ayudarte?'}]);}
}
