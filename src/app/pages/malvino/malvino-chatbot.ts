import { Component, ElementRef, OnInit, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { mensajeDeError } from '../../core/api';
import {
  Accesorio,
  MalvinoService,
  MensajeChat,
  ModeloCelular,
  ProductoRecomendado
} from '../../core/services/malvino.service';
import { CarritoService } from '../../core/services/carrito.service';
import { SesionService } from '../../core/services/sesion.service';

@Component({
  selector: 'app-malvino-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './malvino-chatbot.html',
  styleUrls: ['./malvino-chatbot.css']
})
export class MalvinoChatbot implements OnInit {
  @ViewChild('historial') historial?: ElementRef<HTMLElement>;

  // La app no usa zone.js: lo que cambia al llegar una respuesta va en signals para que la vista se entere.
  readonly mensajes = signal<MensajeChat[]>([]);
  readonly cargando = signal(false);
  readonly escalando = signal(false);
  mensajeActual: string = '';

  // Comprobador de compatibilidad: accesorios y modelos del catálogo, cargados del backend.
  readonly accesorios = signal<Accesorio[]>([]);
  readonly modelos = signal<ModeloCelular[]>([]);
  readonly errorCatalogo = signal('');
  readonly comprobando = signal(false);
  accesorio: string = '';
  modelo: string = '';

  constructor(
    private malvinoService: MalvinoService,
    private carritoService: CarritoService,
    private sesionService: SesionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.agregarMensaje({
      remitente: 'malvino',
      texto: '¡Hola! Soy Malvino. Dime qué producto buscas, pregunta por tus pedidos o comprueba si un accesorio sirve para tu celular.',
      hora: this.obtenerHoraActual()
    });
    void this.cargarCatalogo();
  }

  private async cargarCatalogo(): Promise<void> {
    try {
      const catalogo = await this.malvinoService.catalogo();
      this.accesorios.set(catalogo.accesorios);
      this.modelos.set(catalogo.modelos);
      this.accesorio = catalogo.accesorios[0]?.slug ?? '';
      this.modelo = catalogo.modelos[0]?.slug ?? '';
    } catch (error) {
      this.errorCatalogo.set(mensajeDeError(error));
    }
  }

  enviar(): void {
    const texto = this.mensajeActual.trim().slice(0, 500);
    if (!texto || this.cargando()) return;

    this.agregarMensaje({
      remitente: 'usuario',
      texto,
      hora: this.obtenerHoraActual()
    });
    this.mensajeActual = '';
    this.cargando.set(true);

    this.malvinoService.enviarMensaje(texto).subscribe({
      next: (res) => {
        this.agregarMensaje({
          remitente: 'malvino',
          texto: res.respuesta,
          hora: this.obtenerHoraActual(),
          productos: res.productos,
          puede_escalar: res.puede_escalar,
          pregunta_original: res.pregunta_original
        });
        this.cargando.set(false);
      },
      error: (err) => {
        this.agregarMensaje({
          remitente: 'malvino',
          texto: mensajeDeError(err),
          hora: this.obtenerHoraActual()
        });
        this.cargando.set(false);
      }
    });
  }

  async comprobar(): Promise<void> {
    const accesorio = this.accesorios().find(a => a.slug === this.accesorio);
    const modelo = this.modelos().find(m => m.slug === this.modelo);
    if (!accesorio || !modelo || this.comprobando()) return;

    this.comprobando.set(true);
    let respuesta: string;
    try {
      respuesta = await this.malvinoService.comprobar(accesorio.slug, modelo.slug);
    } catch (error) {
      respuesta = mensajeDeError(error);
    } finally {
      this.comprobando.set(false);
    }
    this.agregarMensaje({
      remitente: 'usuario',
      texto: `Comprobar ${accesorio.titulo} con ${modelo.nombre}`,
      hora: this.obtenerHoraActual()
    });
    this.agregarMensaje({
      remitente: 'malvino',
      texto: respuesta,
      hora: this.obtenerHoraActual()
    });
  }

  // La pregunta se envía al proveedor del producto elegido y queda en Mis consultas.
  escalarDuda(m: MensajeChat, prod: ProductoRecomendado): void {
    if (this.escalando()) return;

    if (!this.sesionService.conectado()) {
      this.agregarMensaje({
        remitente: 'sistema',
        texto: 'Para enviar esta duda a un proveedor, necesitas iniciar sesión.',
        hora: this.obtenerHoraActual()
      });
      this.router.navigate(['/login']);
      return;
    }

    this.escalando.set(true);
    const preguntaAEscalar = m.pregunta_original || m.texto;

    this.malvinoService.escalarConsulta(preguntaAEscalar, prod.id).subscribe({
      next: () => {
        this.mensajes.update(lista =>
          lista.map(x => (x === m ? { ...x, puede_escalar: false, escalado_enviado: true } : x))
        );
        this.agregarMensaje({
          remitente: 'sistema',
          texto: `✅ Tu pregunta fue enviada al proveedor de ${prod.nombre}. Verás la respuesta en Mi cuenta, en Mis consultas.`,
          hora: this.obtenerHoraActual()
        });
        this.escalando.set(false);
      },
      error: (err) => {
        this.agregarMensaje({
          remitente: 'sistema',
          texto: mensajeDeError(err),
          hora: this.obtenerHoraActual()
        });
        this.escalando.set(false);
      }
    });
  }

  verProducto(slug: string): void {
    this.router.navigate(['/producto-detalle', slug]);
  }

  async agregarAlCarrito(prod: ProductoRecomendado): Promise<void> {
    // Sin sesión, el carrito lleva al login.
    const agregado = await this.carritoService.agregar({
      id: prod.slug,
      title: prod.nombre,
      price: prod.precio,
      img: prod.imagen_url
    });
    if (agregado) {
      this.agregarMensaje({
        remitente: 'sistema',
        texto: `🛒 ${prod.nombre} se agregó a tu carrito.`,
        hora: this.obtenerHoraActual()
      });
    } else if (this.carritoService.error()) {
      this.agregarMensaje({
        remitente: 'sistema',
        texto: this.carritoService.error(),
        hora: this.obtenerHoraActual()
      });
    }
  }

  borrar(): void {
    this.mensajes.set([{
      remitente: 'malvino',
      texto: 'Conversación borrada. ¿En qué puedo ayudarte?',
      hora: this.obtenerHoraActual()
    }]);
  }

  private agregarMensaje(mensaje: MensajeChat): void {
    this.mensajes.update(lista => [...lista.slice(-39), mensaje]);
    setTimeout(() => {
      const e = this.historial?.nativeElement;
      if (e) e.scrollTop = e.scrollHeight;
    });
  }

  private obtenerHoraActual(): string {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}
