import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MalvinoService, MensajeChat, ProductoRecomendado } from '../../core/services/malvino.service';
import { CarritoService } from '../../core/services/carrito.service';
import { SesionService } from '../../core/services/sesion.service';

@Component({
  selector: 'app-malvino-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './malvino-chatbot.html',
  styleUrls: ['./malvino-chatbot.css']
})
export class MalvinoChatbotComponent implements OnInit {
  mensajes: MensajeChat[] = [];
  mensajeActual: string = '';
  cargando: boolean = false;
  escalando: boolean = false;

  constructor(
    private malvinoService: MalvinoService,
    private carritoService: CarritoService,
    private sesionService: SesionService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.mensajes.push({
      remitente: 'malvino',
      texto: '¡Hola! Soy Malvino. Si tienes dudas de compatibilidad o componentes, cuéntame y te ayudo.',
      hora: this.obtenerHoraActual()
    });
  }

  enviar(): void {
    if (!this.mensajeActual.trim() || this.cargando) return;

    const texto = this.mensajeActual.trim();
    this.mensajes.push({
      remitente: 'usuario',
      texto,
      hora: this.obtenerHoraActual()
    });
    this.mensajeActual = '';
    this.cargando = true;

    this.malvinoService.enviarMensaje(texto).subscribe({
      next: (res) => {
        this.mensajes.push({
          remitente: 'malvino',
          texto: res.respuesta,
          hora: this.obtenerHoraActual(),
          productos: res.productos,
          puede_escalar: res.puede_escalar,
          pregunta_original: res.pregunta_original
        });
        this.cargando = false;
      },
      error: () => {
        this.mensajes.push({
          remitente: 'malvino',
          texto: 'Ocurrió un error al procesar tu consulta.',
          hora: this.obtenerHoraActual()
        });
        this.cargando = false;
      }
    });
  }

  escalarDuda(m: MensajeChat): void {
    if (!this.sesionService.estaAutenticado()) {
      this.mensajes.push({
        remitente: 'sistema',
        texto: 'Para enviar esta duda a un asesor o proveedor, necesitas iniciar sesión.',
        hora: this.obtenerHoraActual()
      });
      this.router.navigate(['/login']);
      return;
    }

    this.escalando = true;
    const preguntaAEscalar = m.pregunta_original || m.texto;

    this.malvinoService.escalarConsulta(preguntaAEscalar).subscribe({
      next: (res) => {
        m.puede_escalar = false;
        m.escalado_enviado = true;
        this.mensajes.push({
          remitente: 'sistema',
          texto: '✅ Tu pregunta ha sido enviada al módulo de consultas. Un proveedor te responderá pronto.',
          hora: this.obtenerHoraActual()
        });
        this.escalando = false;
      },
      error: (err) => {
        this.mensajes.push({
          remitente: 'sistema',
          texto: 'No se pudo enviar la consulta al proveedor. Intenta más tarde.',
          hora: this.obtenerHoraActual()
        });
        this.escalando = false;
      }
    });
  }

  verProducto(id: number): void {
    this.router.navigate(['/producto', id]);
  }

  agregarAlCarrito(prod: ProductoRecomendado): void {
    this.carritoService.agregarProducto({
      id_producto: prod.id,
      nombre: prod.nombre,
      precio: prod.precio,
      imagen_url: prod.imagen_url,
      cantidad: 1
    } as any);
  }

  private obtenerHoraActual(): string {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}