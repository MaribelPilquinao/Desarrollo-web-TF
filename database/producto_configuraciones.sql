-- =====================================================================
-- CONFIGURACIONES DE PRODUCTO (por ejemplo "16GB RAM • 1TB SSD")
--
-- Cada configuración es un producto propio, con su slug, precio y stock.
-- Esta tabla solo dice qué productos son variantes del mismo modelo y con
-- qué nombre se muestra cada una. Así el carrito, los pedidos y el stock
-- funcionan sin cambios: al elegir una configuración se abre ese producto.
--
-- Se ejecuta sobre la base malvitec, después de malvitec_sqlserver.sql.
-- No usa variables ni bloques: cada sentencia funciona sola, así que sirve
-- igual en DBeaver, SSMS o sqlcmd. Si se vuelve a ejecutar no duplica nada.
-- =====================================================================

-- Cierra una transacción que haya quedado abierta por un intento anterior.
IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;

-- grupo_id es el producto base del modelo: todas las variantes de un mismo
-- modelo comparten el mismo grupo_id (la base también tiene su fila).
IF OBJECT_ID('producto_configuraciones', 'U') IS NULL
CREATE TABLE producto_configuraciones (
  producto_id INT          NOT NULL,
  grupo_id    INT          NOT NULL,
  nombre      NVARCHAR(60) NOT NULL,
  orden       TINYINT      NOT NULL CONSTRAINT df_producto_configuraciones_orden DEFAULT 1,
  CONSTRAINT pk_producto_configuraciones PRIMARY KEY (producto_id),
  CONSTRAINT fk_producto_configuraciones_producto FOREIGN KEY (producto_id) REFERENCES productos (id) ON DELETE CASCADE,
  CONSTRAINT fk_producto_configuraciones_grupo FOREIGN KEY (grupo_id) REFERENCES productos (id),
  CONSTRAINT uq_producto_configuraciones_nombre UNIQUE (grupo_id, nombre),
  INDEX ix_producto_configuraciones_grupo (grupo_id, orden)
);

-- Variante de 32GB y 1TB: copia de la HP OMEN 16 con su propio precio y stock.
INSERT INTO productos
  (slug, proveedor_id, categoria_id, titulo, descripcion, precio_actual, precio_anterior, descuento_pct,
   stock, imagen_url, tipo_envio, garantia_meses, tipo_accesorio)
SELECT 'hp-omen-16-32gb-1tb', proveedor_id, categoria_id,
       N'Laptop Gaming HP OMEN 16 - Intel Core i7, 32GB RAM, 1TB SSD, RTX 3070',
       REPLACE(descripcion, N'16GB de RAM', N'32GB de RAM'),
       5947.00, 7699.00, 23, 6, imagen_url, tipo_envio, garantia_meses, tipo_accesorio
FROM productos
WHERE slug = 'hp-omen-16'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE slug = 'hp-omen-16-32gb-1tb');

-- Variante de 32GB y 2TB.
INSERT INTO productos
  (slug, proveedor_id, categoria_id, titulo, descripcion, precio_actual, precio_anterior, descuento_pct,
   stock, imagen_url, tipo_envio, garantia_meses, tipo_accesorio)
SELECT 'hp-omen-16-32gb-2tb', proveedor_id, categoria_id,
       N'Laptop Gaming HP OMEN 16 - Intel Core i7, 32GB RAM, 2TB SSD, RTX 3070',
       REPLACE(descripcion, N'16GB de RAM', N'32GB de RAM'),
       6447.00, 8199.00, 21, 3, imagen_url, tipo_envio, garantia_meses, tipo_accesorio
FROM productos
WHERE slug = 'hp-omen-16'
  AND NOT EXISTS (SELECT 1 FROM productos WHERE slug = 'hp-omen-16-32gb-2tb');

-- Las variantes llevan la misma galería que la base.
INSERT INTO producto_imagenes (producto_id, url, orden)
SELECT v.id, i.url, i.orden
FROM producto_imagenes i
JOIN productos b ON b.id = i.producto_id AND b.slug = 'hp-omen-16'
CROSS JOIN productos v
WHERE v.slug IN ('hp-omen-16-32gb-1tb', 'hp-omen-16-32gb-2tb')
  AND NOT EXISTS (SELECT 1 FROM producto_imagenes x WHERE x.producto_id = v.id);

-- Y las mismas especificaciones, cambiando la memoria y el almacenamiento.
INSERT INTO producto_especificaciones (producto_id, clave, valor, orden)
SELECT v.id, e.clave,
       CASE
         WHEN e.clave = N'Memoria RAM' THEN N'32GB DDR5'
         WHEN e.clave = N'Almacenamiento' AND v.slug = 'hp-omen-16-32gb-2tb' THEN N'2TB SSD NVMe'
         ELSE e.valor
       END,
       e.orden
FROM producto_especificaciones e
JOIN productos b ON b.id = e.producto_id AND b.slug = 'hp-omen-16'
CROSS JOIN productos v
WHERE v.slug IN ('hp-omen-16-32gb-1tb', 'hp-omen-16-32gb-2tb')
  AND NOT EXISTS (SELECT 1 FROM producto_especificaciones x WHERE x.producto_id = v.id);

-- El grupo: las tres filas apuntan a la HP OMEN 16 base.
INSERT INTO producto_configuraciones (producto_id, grupo_id, nombre, orden)
SELECT p.id, b.id, c.nombre, c.orden
FROM (VALUES
  ('hp-omen-16',          N'16GB RAM • 1TB SSD', 1),
  ('hp-omen-16-32gb-1tb', N'32GB RAM • 1TB SSD', 2),
  ('hp-omen-16-32gb-2tb', N'32GB RAM • 2TB SSD', 3)
) AS c (slug, nombre, orden)
JOIN productos p ON p.slug = c.slug
CROSS JOIN productos b
WHERE b.slug = 'hp-omen-16'
  AND NOT EXISTS (SELECT 1 FROM producto_configuraciones x WHERE x.producto_id = p.id);

-- Comprobación: deben salir 3 filas.
SELECT c.orden, c.nombre, p.slug, p.precio_actual, p.stock
FROM producto_configuraciones c
JOIN productos p ON p.id = c.producto_id
ORDER BY c.grupo_id, c.orden;
