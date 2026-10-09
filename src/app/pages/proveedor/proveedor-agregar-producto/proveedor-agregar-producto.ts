import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
 
import { mensajeDeError } from '../../../core/api';
import { Categoria, DatosProducto, TipoAccesorio, TipoEnvio } from '../../../core/models/producto.model';
import { ProveedorService } from '../../../core/services/proveedor.service';

// Misma regla que el backend: el precio anterior (tachado) tiene que ser mayor que el actual.
function preciosCoherentes(grupo: AbstractControl): ValidationErrors | null {
  const actual = grupo.get('precio_actual')?.value;
  const anterior = grupo.get('precio_anterior')?.value;
  return typeof actual === 'number' && typeof anterior === 'number' && anterior <= actual
    ? { precioAnterior: true }
    : null;
}

/** Sirve para crear (/proveedor/agregar-producto) y para editar (/proveedor/editar-producto/:slug). */
@Component({
  selector: 'app-proveedor-agregar-producto',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './proveedor-agregar-producto.html',
  styleUrl: './proveedor-agregar-producto.css'
 })

export class ProveedorAgregarProducto implements OnInit {
  private readonly api = inject(ProveedorService);
  private readonly router = inject(Router);

  readonly slug = inject(ActivatedRoute).snapshot.paramMap.get('slug');
  readonly editando = this.slug !== null;

  readonly categorias = signal<Categoria[]>([]);
  readonly cargando = signal(true);
  readonly cargaFallida = signal(false);
  readonly guardando = signal(false);
  readonly error = signal('');

  readonly form = new FormGroup(
    {
      titulo: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(3), Validators.maxLength(200), Validators.pattern(/.*\S.*/)] }),
      categoria: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      descripcion: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(4000)] }),
      precio_actual: new FormControl<number | null>(null, [Validators.required, Validators.min(0.01), Validators.max(99999999.99), Validators.pattern(/^\d(\.\d{1,2})?$/)]),
      precio_anterior: new FormControl<number | null>(null, [Validators.min(0.01), Validators.max(99999999.99), Validators.pattern(/^\d(\.\d{1,2})?$/)]),
      stock: new FormControl<number | null>(0, [Validators.required, Validators.min(0), Validators.max(100000), Validators.pattern(/^\d$/)]),
      imagen_url: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(500), Validators.pattern(/^\s*(https?:\/\/\S)?\s*$/i)] }),
      tipo_envio: new FormControl<TipoEnvio>('estandar', { nonNullable: true }),
      garantia_meses: new FormControl<number | null>(12, [Validators.required, Validators.min(0), Validators.max(60), Validators.pattern(/^\d$/)]),
      tipo_accesorio: new FormControl<TipoAccesorio | ''>('', { nonNullable: true })
    },
    { validators: preciosCoherentes }
  );

  private readonly categoriaElegida = toSignal(this.form.controls.categoria.valueChanges, { initialValue: '' });
  readonly esAccesorio = computed(() => this.categoriaElegida() === 'accesorios');
  private readonly imagen = toSignal(this.form.controls.imagen_url.valueChanges, { initialValue: '' });
  readonly vistaPrevia = computed(() => (this.form.controls.imagen_url.valid ? this.imagen().trim() : ''));

  async ngOnInit(): Promise<void> {
    try {
      this.categorias.set(await this.api.categorias());
      if (this.slug) {
        const p = await this.api.producto(this.slug);
        this.form.patchValue({
          titulo: p.titulo,
          categoria: p.categoria,
          descripcion: p.descripcion ?? '',
          precio_actual: p.precio_actual,
          precio_anterior: p.precio_anterior,
          stock: p.stock,
          imagen_url: p.imagen_url ?? '',
          tipo_envio: p.tipo_envio,
          garantia_meses: p.garantia_meses,
          tipo_accesorio: p.tipo_accesorio ?? ''
        });
      }
    } catch (error) {
      this.error.set(mensajeDeError(error));
      this.cargaFallida.set(true);
    } finally {
      this.cargando.set(false);
    }
  }

  invalido(campo: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[campo];
    return control.touched && control.invalid;
  }

  async guardar(): Promise<void> {
    this.error.set('');
    this.form.markAllAsTouched();
    if (this.form.invalid || this.guardando() || this.cargaFallida()) {
      return;
    }

    const v = this.form.getRawValue();
    const datos: DatosProducto = {
      titulo: v.titulo.trim(),
      descripcion: v.descripcion.trim() || null,
      categoria: v.categoria,
      precio_actual: Number(v.precio_actual),
      precio_anterior: v.precio_anterior === null ? null : Number(v.precio_anterior),
      stock: Number(v.stock),
      imagen_url: v.imagen_url.trim() || null,
      tipo_envio: v.tipo_envio,
      garantia_meses: Number(v.garantia_meses),
      tipo_accesorio: v.categoria === 'accesorios' && v.tipo_accesorio ? v.tipo_accesorio : null
    };

    this.guardando.set(true);
    try {
      if (this.slug) {
        await this.api.editarProducto(this.slug, datos);
      } else {
        await this.api.crearProducto(datos);
      }
    } catch (error) {
      this.error.set(mensajeDeError(error));
      return;
    } finally {
      this.guardando.set(false);
     }

    void this.router.navigate(['/proveedor/productos']);
  }
}