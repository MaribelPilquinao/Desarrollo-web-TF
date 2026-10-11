export const CATEGORIAS = [
  { slug: 'laptops', nombre: 'Laptops' },
  { slug: 'celulares', nombre: 'Celulares' },
  { slug: 'audio', nombre: 'Audio' },
  { slug: 'wearables', nombre: 'Wearables' },
  { slug: 'perifericos', nombre: 'Periféricos' },
  { slug: 'tablets', nombre: 'Tablets' },
  { slug: 'accesorios', nombre: 'Accesorios' },
  { slug: 'camaras', nombre: 'Cámaras' }
];

export function soles(monto: number): string {
  return `S/ ${monto.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function estrellas(calificacion: number | null): string {
  const llenas = Math.max(0, Math.min(5, Math.round(calificacion ?? 0)));
  return '⭐'.repeat(llenas) + '☆'.repeat(5 - llenas);
}
