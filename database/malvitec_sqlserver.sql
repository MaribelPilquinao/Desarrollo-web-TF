  CREATE DATABASE malvitec;

SET NOCOUNT ON;
SET XACT_ABORT ON;

-- ---------------------------------------------------------------------
-- USUARIOS Y PROVEEDORES
-- ---------------------------------------------------------------------
-- nombre guarda lo que envía el registro (un solo campo "Nombre"). apellidos es opcional:
-- el registro no lo pide; se completa desde el checkout, que sí separa nombres y apellidos.
-- Valores de rol: 'cliente', 'proveedor'. Valores de preferencia_pa : 'tarjeta', 'yape_plin', 'contra_entrega'.
CREATE TABLE usuarios (
  id               INT           NOT NULL IDENTITY(1,1),
  nombre           NVARCHAR(100) NOT NULL,
  apellidos        NVARCHAR(100) NULL,
  correo           NVARCHAR(150) NOT NULL,
  telefono         CHAR(9)       NULL,
  contrasena_hash  VARCHAR(100)  NOT NULL,
  rol              VARCHAR(10)   NOT NULL CONSTRAINT df_usuarios_rol DEFAULT 'cliente',
  preferencia_pa  VARCHAR(15)   NULL,
  activo           BIT           NOT NULL CONSTRAINT df_usuarios_activo DEFAULT 1,
  creado_en        DATETIME2(0)  NOT NULL CONSTRAINT df_usuarios_creado_en DEFAULT SYSDATETIME(),
  CONSTRAINT pk_usuarios PRIMARY KEY (id),
  CONSTRAINT uq_usuarios_correo UNIQUE (correo),
  CONSTRAINT ck_usuarios_rol CHECK (rol IN ('cliente','proveedor')),
  CONSTRAINT ck_usuarios_preferencia_pa  CHECK (preferencia_pa  IN ('tarjeta','yape_plin','contra_entrega')),
  CONSTRAINT ck_usuarios_telefono CHECK (telefono IS NULL OR telefono LIKE '9[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]')
);

CREATE TABLE proveedores (
  id               INT           NOT NULL IDENTITY(1,1),
  usuario_id       INT           NOT NULL,
  nombre_comercial NVARCHAR(120) NOT NULL,
  descripcion      NVARCHAR(255) NULL,
  creado_en        DATETIME2(0)  NOT NULL CONSTRAINT df_proveedores_creado_en DEFAULT SYSDATETIME(),
  CONSTRAINT pk_proveedores PRIMARY KEY (id),
  CONSTRAINT uq_proveedores_usuario UNIQUE (usuario_id),
  CONSTRAINT fk_proveedores_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
);

-- ---------------------------------------------------------------------
-- CATÁLO 
-- ---------------------------------------------------------------------
CREATE TABLE categorias (
  id     TINYINT      NOT NULL IDENTITY(1,1),
  slug   VARCHAR(40)  NOT NULL,
  nombre NVARCHAR(60) NOT NULL,
  CONSTRAINT pk_categorias PRIMARY KEY (id),
  CONSTRAINT uq_categorias_slug UNIQUE (slug)
);

-- ck_productos_stock: un descuento que deje el stock negativo falla en vez de corromper datos.
-- calificacion_prom / num_opiniones son caché de la tabla opiniones: el backend los recalcula
-- al insertar una opinión (misma consulta que la del final de este script).
-- titulo y descripcion usan collation CI_AI: buscar "audifonos" con LIKE encuentra "Audífonos".
-- actualizado_en no se actualiza solo: el backend debe poner actualizado_en = SYSDATETIME() en cada UPDATE.
-- Valores de tipo_envio: 'gratis', 'estandar'. Valores de tipo_accesorio: 'case', 'protector', 'bateria', 'cargador'.
CREATE TABLE productos (
  id                INT            NOT NULL IDENTITY(1,1),
  slug              VARCHAR(120)   NOT NULL,
  proveedor_id      INT            NOT NULL,
  categoria_id      TINYINT        NOT NULL,
  titulo            NVARCHAR(200)  COLLATE Modern_Spanish_CI_AI NOT NULL,
  descripcion       NVARCHAR(MAX)  COLLATE Modern_Spanish_CI_AI NULL,
  precio_actual     DECIMAL(10,2)  NOT NULL,
  precio_anterior   DECIMAL(10,2)  NULL,
  descuento_pct     TINYINT        NOT NULL CONSTRAINT df_productos_descuento_pct DEFAULT 0,
  stock             INT            NOT NULL CONSTRAINT df_productos_stock DEFAULT 0,
  imagen_url        VARCHAR(500)   NULL,
  tipo_envio        VARCHAR(10)    NOT NULL CONSTRAINT df_productos_tipo_envio DEFAULT 'estandar',
  garantia_meses    TINYINT        NOT NULL CONSTRAINT df_productos_garantia_meses DEFAULT 12,
  calificacion_prom DECIMAL(2,1)   NOT NULL CONSTRAINT df_productos_calificacion_prom DEFAULT 0.0,
  num_opiniones     INT            NOT NULL CONSTRAINT df_productos_num_opiniones DEFAULT 0,
  tipo_accesorio    VARCHAR(10)    NULL,
  activo            BIT            NOT NULL CONSTRAINT df_productos_activo DEFAULT 1,
  creado_en         DATETIME2(0)   NOT NULL CONSTRAINT df_productos_creado_en DEFAULT SYSDATETIME(),
  actualizado_en    DATETIME2(0)   NOT NULL CONSTRAINT df_productos_actualizado_en DEFAULT SYSDATETIME(),
  CONSTRAINT pk_productos PRIMARY KEY (id),
  CONSTRAINT uq_productos_slug UNIQUE (slug),
  CONSTRAINT fk_productos_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores (id),
  CONSTRAINT fk_productos_categoria FOREIGN KEY (categoria_id) REFERENCES categorias (id),
  CONSTRAINT ck_productos_precio_actual CHECK (precio_actual >= 0),
  CONSTRAINT ck_productos_descuento_pct CHECK (descuento_pct <= 100),
  CONSTRAINT ck_productos_stock CHECK (stock >= 0),
  CONSTRAINT ck_productos_tipo_envio CHECK (tipo_envio IN ('gratis','estandar')),
  CONSTRAINT ck_productos_calificacion_prom CHECK (calificacion_prom BETWEEN 0 AND 5),
  CONSTRAINT ck_productos_num_opiniones CHECK (num_opiniones >= 0),
  CONSTRAINT ck_productos_tipo_accesorio CHECK (tipo_accesorio IN ('case','protector','bateria','cargador')),
  INDEX ix_productos_categoria (categoria_id, activo),
  INDEX ix_productos_proveedor (proveedor_id, activo)
);

CREATE TABLE producto_imagenes (
  id          INT          NOT NULL IDENTITY(1,1),
  producto_id INT          NOT NULL,
  url         VARCHAR(500) NOT NULL,
  orden       TINYINT      NOT NULL CONSTRAINT df_producto_imagenes_orden DEFAULT 1,
  CONSTRAINT pk_producto_imagenes PRIMARY KEY (id),
  CONSTRAINT fk_producto_imagenes_producto FOREIGN KEY (producto_id) REFERENCES productos (id) ON DELETE CASCADE,
  INDEX ix_producto_imagenes_producto (producto_id, orden)
);

CREATE TABLE producto_especificaciones (
  id          INT           NOT NULL IDENTITY(1,1),
  producto_id INT           NOT NULL,
  clave       NVARCHAR(60)  NOT NULL,
  valor       NVARCHAR(150) NOT NULL,
  orden       TINYINT       NOT NULL CONSTRAINT df_producto_especificaciones_orden DEFAULT 1,
  CONSTRAINT pk_producto_especificaciones PRIMARY KEY (id),
  CONSTRAINT uq_especificaciones_producto_clave UNIQUE (producto_id, clave),
  CONSTRAINT fk_producto_especificaciones_producto FOREIGN KEY (producto_id) REFERENCES productos (id) ON DELETE CASCADE
);

CREATE TABLE opiniones (
  id           INT           NOT NULL IDENTITY(1,1),
  producto_id  INT           NOT NULL,
  usuario_id   INT           NOT NULL,
  calificacion TINYINT       NOT NULL,
  comentario   NVARCHAR(500) NULL,
  creado_en    DATETIME2(0)  NOT NULL CONSTRAINT df_opiniones_creado_en DEFAULT SYSDATETIME(),
  CONSTRAINT pk_opiniones PRIMARY KEY (id),
  CONSTRAINT uq_opiniones_producto_usuario UNIQUE (producto_id, usuario_id),
  CONSTRAINT fk_opiniones_producto FOREIGN KEY (producto_id) REFERENCES productos (id) ON DELETE CASCADE,
  CONSTRAINT fk_opiniones_usuario    FOREIGN KEY (usuario_id)    REFERENCES usuarios (id),
  CONSTRAINT ck_opiniones_calificacion CHECK (calificacion BETWEEN 1 AND 5)
);

-- ---------------------------------------------------------------------
-- FAVORITOS, CARRITO Y DIRECCIONES
-- ---------------------------------------------------------------------
CREATE TABLE favoritos (
  usuario_id  INT          NOT NULL,
  producto_id INT          NOT NULL,
  creado_en   DATETIME2(0) NOT NULL CONSTRAINT df_favoritos_creado_en DEFAULT SYSDATETIME(),
  CONSTRAINT pk_favoritos PRIMARY KEY (usuario_id, producto_id),
  CONSTRAINT fk_favoritos_usuario    FOREIGN KEY (usuario_id)    REFERENCES usuarios (id) ON DELETE CASCADE,
  CONSTRAINT fk_favoritos_producto FOREIGN KEY (producto_id) REFERENCES productos (id) ON DELETE CASCADE
);

-- actualizado_en: igual que en productos, lo actualiza el backend.
CREATE TABLE carrito_items (
  usuario_id     INT          NOT NULL,
  producto_id    INT          NOT NULL,
  cantidad       SMALLINT     NOT NULL CONSTRAINT df_carrito_items_cantidad DEFAULT 1,
  actualizado_en DATETIME2(0) NOT NULL CONSTRAINT df_carrito_items_actualizado_en DEFAULT SYSDATETIME(),
  CONSTRAINT pk_carrito_items PRIMARY KEY (usuario_id, producto_id),
  CONSTRAINT fk_carrito_items_usuario    FOREIGN KEY (usuario_id)    REFERENCES usuarios (id) ON DELETE CASCADE,
  CONSTRAINT fk_carrito_items_producto FOREIGN KEY (producto_id) REFERENCES productos (id) ON DELETE CASCADE,
  CONSTRAINT ck_carrito_items_cantidad CHECK (cantidad BETWEEN 1 AND 99)
);

CREATE TABLE direcciones (
  id           INT           NOT NULL IDENTITY(1,1),
  usuario_id   INT           NOT NULL,
  departamento NVARCHAR(40)  NOT NULL,
  distrito     NVARCHAR(80)  NOT NULL,
  direccion    NVARCHAR(200) NOT NULL,
  referencia   NVARCHAR(200) NULL,
  es_principal BIT           NOT NULL CONSTRAINT df_direcciones_es_principal DEFAULT 0,
  creado_en    DATETIME2(0)  NOT NULL CONSTRAINT df_direcciones_creado_en DEFAULT SYSDATETIME(),
  CONSTRAINT pk_direcciones PRIMARY KEY (id),
  CONSTRAINT fk_direcciones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE,
  INDEX ix_direcciones_usuario (usuario_id)
);

-- ---------------------------------------------------------------------
-- PEDIDOS
-- uq_pedidos_idempotencia evita pedidos duplicados por doble clic o reintento (header Idempotency-Key).
-- Los datos de entrega y los precios se copian al pedido (snapshot): un cambio posterior
-- del producto o de la dirección no altera pedidos ya hechos.
-- El estado vive en pedido_items porque cada proveedor atiende sus propios ítems.
-- Valores de metodo_pa : 'tarjeta', 'yape_plin', 'contra_entrega'.
-- ---------------------------------------------------------------------
CREATE TABLE pedidos (
  id                   INT           NOT NULL IDENTITY(1,1),
  codi                VARCHAR(30)   NOT NULL,
  usuario_id           INT           NOT NULL,
  clave_idempotencia   VARCHAR(64)   NOT NULL,
  metodo_pa           VARCHAR(15)   NOT NULL,
  subtotal             DECIMAL(10,2) NOT NULL,
  costo_envio          DECIMAL(10,2) NOT NULL CONSTRAINT df_pedidos_costo_envio DEFAULT 0.00,
  total                DECIMAL(10,2) NOT NULL,
  entrega_nombres      NVARCHAR(100) NOT NULL,
  entrega_apellidos    NVARCHAR(100) NOT NULL,
  entrega_correo       NVARCHAR(150) NOT NULL,
  entrega_telefono     VARCHAR(15)   NOT NULL,
  entrega_departamento NVARCHAR(40)  NOT NULL,
  entrega_distrito     NVARCHAR(80)  NOT NULL,
  entrega_direccion    NVARCHAR(200) NOT NULL,
  entrega_referencia   NVARCHAR(200) NULL,
  creado_en            DATETIME2(0)  NOT NULL CONSTRAINT df_pedidos_creado_en DEFAULT SYSDATETIME(),
  CONSTRAINT pk_pedidos PRIMARY KEY (id),
  CONSTRAINT uq_pedidos_codi  UNIQUE (codi ),
  CONSTRAINT uq_pedidos_idempotencia UNIQUE (usuario_id, clave_idempotencia),
  CONSTRAINT fk_pedidos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
  CONSTRAINT ck_pedidos_metodo_pa  CHECK (metodo_pa  IN ('tarjeta','yape_plin','contra_entrega')),
  CONSTRAINT ck_pedidos_total CHECK (total = subtotal + costo_envio),
  INDEX ix_pedidos_usuario (usuario_id, creado_en)
);

-- Valores de estado: 'Pendiente', 'En camino', 'Completado', 'Entregado', 'Cancelado'.
CREATE TABLE pedido_items (
  id              INT           NOT NULL IDENTITY(1,1),
  pedido_id       INT           NOT NULL,
  producto_id     INT           NOT NULL,
  proveedor_id    INT           NOT NULL,
  titulo          NVARCHAR(200) NOT NULL,
  precio_unitario DECIMAL(10,2) NOT NULL,
  cantidad        SMALLINT      NOT NULL,
  estado          VARCHAR(12)   NOT NULL CONSTRAINT df_pedido_items_estado DEFAULT 'Pendiente',
  CONSTRAINT pk_pedido_items PRIMARY KEY (id),
  CONSTRAINT fk_pedido_items_pedido    FOREIGN KEY (pedido_id)    REFERENCES pedidos (id) ON DELETE CASCADE,
  CONSTRAINT fk_pedido_items_producto  FOREIGN KEY (producto_id)  REFERENCES productos (id),
  CONSTRAINT fk_pedido_items_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores (id),
  CONSTRAINT ck_pedido_items_cantidad CHECK (cantidad > 0),
  CONSTRAINT ck_pedido_items_estado CHECK (estado IN ('Pendiente','En camino','Completado','Entregado','Cancelado')),
  INDEX ix_pedido_items_pedido (pedido_id),
  INDEX ix_pedido_items_proveedor_estado (proveedor_id, estado)
);

-- ---------------------------------------------------------------------
-- CONSULTAS CLIENTE -> PROVEEDOR
-- Valores de estado: 'Nueva', 'Respondida'.
-- ---------------------------------------------------------------------
CREATE TABLE consultas (
  id            INT           NOT NULL IDENTITY(1,1),
  producto_id   INT           NOT NULL,
  usuario_id    INT           NOT NULL,
  mensaje       NVARCHAR(500) NOT NULL,
  respuesta     NVARCHAR(500) NULL,
  estado        VARCHAR(12)   NOT NULL CONSTRAINT df_consultas_estado DEFAULT 'Nueva',
  creado_en     DATETIME2(0)  NOT NULL CONSTRAINT df_consultas_creado_en DEFAULT SYSDATETIME(),
  respondida_en DATETIME2(0)  NULL,
  CONSTRAINT pk_consultas PRIMARY KEY (id),
  CONSTRAINT fk_consultas_producto FOREIGN KEY (producto_id) REFERENCES productos (id) ON DELETE CASCADE,
  CONSTRAINT fk_consultas_usuario    FOREIGN KEY (usuario_id)    REFERENCES usuarios (id),
  CONSTRAINT ck_consultas_estado CHECK (estado IN ('Nueva','Respondida')),
  INDEX ix_consultas_producto (producto_id, estado)
);

-- ---------------------------------------------------------------------
-- MALVINO: compatibilidad accesorio <-> modelo de celular
-- ---------------------------------------------------------------------
CREATE TABLE modelos_celular (
  id     SMALLINT     NOT NULL IDENTITY(1,1),
  slug   VARCHAR(40)  NOT NULL,
  nombre NVARCHAR(60) NOT NULL,
  CONSTRAINT pk_modelos_celular PRIMARY KEY (id),
  CONSTRAINT uq_modelos_celular_slug UNIQUE (slug)
);

CREATE TABLE compatibilidad (
  producto_id INT      NOT NULL,
  modelo_id   SMALLINT NOT NULL,
  CONSTRAINT pk_compatibilidad PRIMARY KEY (producto_id, modelo_id),
  CONSTRAINT fk_compatibilidad_producto     FOREIGN KEY (producto_id)     REFERENCES productos (id) ON DELETE CASCADE,
  CONSTRAINT fk_compatibilidad_modelo FOREIGN KEY (modelo_id) REFERENCES modelos_celular (id) ON DELETE CASCADE,
  INDEX ix_compatibilidad_modelo (modelo_id)
);
 

-- =====================================================================
-- DATOS DE EJEMPLO
-- =====================================================================
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @pwd VARCHAR(100) = '$2b$10$JL/4esIFxo.MnnrN.Dw7cOd3lId0oSln8Rqi1fiY3hazkMRTe5EKO';

-- Usuarios 11-13: autores de las opiniones demostrativas de producto-detalle.html.
SET IDENTITY_INSERT usuarios ON;
INSERT INTO usuarios (id, nombre, apellidos, correo, telefono, contrasena_hash, rol, preferencia_pa ) VALUES
 (1,  N'Usuario de prueba',  NULL,        N'demo@malvitec.com',          '999888777', @pwd, 'cliente',   'yape_plin'),
 (2,  N'José',               N'Ramírez',  N'jose.ramirez@example.com',   '900000002', @pwd, 'cliente',   NULL),
 (3,  N'Camila',             N'López',    N'camila.lopez@example.com',   '900000003', @pwd, 'cliente',   NULL),
 (4,  N'Luis',               N'Torres',   N'luis.torres@example.com',    '900000004', @pwd, 'cliente',   NULL),
 (5,  N'Juan',               N'Pérez',    N'juan.perez@example.com',     '900000005', @pwd, 'cliente',   NULL),
 (6,  N'Camila',             N'Torres',   N'camila.torres@example.com',  '900000006', @pwd, 'cliente',   NULL),
 (7,  N'Die ',              N'Ramos',    N'die .ramos@example.com',    '900000007', @pwd, 'cliente',   NULL),
 (8,  N'TechPower Store',    NULL,        N'techpower@malvitec.com',     '900000008', @pwd, 'proveedor', NULL),
 (9,  N'GamerZone Perú',     NULL,        N'gamerzone@malvitec.com',     '900000009', @pwd, 'proveedor', NULL),
 (10, N'Accesorios Express', NULL,        N'accesorios@malvitec.com',    '900000010', @pwd, 'proveedor', NULL),
 (11, N'Carlos',             N'Mendoza',  N'carlos.mendoza@example.com', '900000011', @pwd, 'cliente',   NULL),
 (12, N'Lucía',              N'Paredes',  N'lucia.paredes@example.com',  '900000012', @pwd, 'cliente',   NULL),
 (13, N'Juan',               N'Rojas',    N'juan.rojas@example.com',     '900000013', @pwd, 'cliente',   NULL);
SET IDENTITY_INSERT usuarios OFF;

SET IDENTITY_INSERT proveedores ON;
INSERT INTO proveedores (id, usuario_id, nombre_comercial, descripcion) VALUES
 (1, 8,  N'TechPower Store',    N'Laptops, celulares, tablets, cámaras y periféricos'),
 (2, 9,  N'GamerZone Perú',     N'Periféricos y audio gamer'),
 (3, 10, N'Accesorios Express', N'Cases, protectores, baterías y cargadores');
SET IDENTITY_INSERT proveedores OFF;

SET IDENTITY_INSERT categorias ON;
INSERT INTO categorias (id, slug, nombre) VALUES
 (1, 'laptops',     N'Laptops'),
 (2, 'celulares',   N'Celulares'),
 (3, 'audio',       N'Audio'),
 (4, 'wearables',   N'Wearables'),
 (5, 'perifericos', N'Periféricos'),
 (6, 'tablets',     N'Tablets'),
 (7, 'accesorios',  N'Accesorios'),
 (8, 'camaras',     N'Cámaras');
SET IDENTITY_INSERT categorias OFF;

-- calificacion_prom y num_opiniones no se cargan aquí: se calculan más abajo a partir de opiniones.
SET IDENTITY_INSERT productos ON;
INSERT INTO productos
 (id, slug, proveedor_id, categoria_id, titulo, descripcion, precio_actual, precio_anterior, descuento_pct,
  stock, imagen_url, tipo_envio, garantia_meses, tipo_accesorio) VALUES
 (1, 'hp-omen-16', 1, 1,
  N'Laptop Gaming HP OMEN 16 - Intel Core i7, 16GB RAM, RTX 3070',
  N'La HP OMEN 16 es una laptop gamer diseñada para ofrecer alto rendimiento en jue s exigentes y tareas de productividad. Cuenta con procesador Intel Core i7, 16GB de RAM y tarjeta gráfica NVIDIA RTX 3070. Pantalla 16" Full HD 144Hz, teclado retroiluminado RGB y sistema de refrigeración optimizado. Diseñada para gaming y creación de contenido.',
  5547.00, 7299.00, 24, 15,
  'https://images.pexels.com/photos/18105/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=800',
  'gratis', 12, NULL),
 (2, 'iphone-15-pro-max', 1, 2,
  N'iPhone 15 Pro Max 256GB - Titanio Natural', N'iPhone 15 Pro Max de 256GB en titanio natural.',
  5784.00, 6499.00, 11, 8,
  'https://images.pexels.com/photos/47261/pexels-photo-47261.jpeg?auto=compress&cs=tinysrgb&w=800',
  'gratis', 12, NULL),
 (3, 'sony-wh-1000xm5', 2, 3,
  N'Audífonos Sony WH-1000XM5 - Cancelación de ruido', N'Audífonos inalámbricos Sony WH-1000XM5 con cancelación de ruido.',
  1349.00, 1799.00, 25, 20,
  'https://images.pexels.com/photos/3394664/pexels-photo-3394664.jpeg?auto=compress&cs=tinysrgb&w=800',
  'gratis', 12, NULL),
 (4, 'apple-watch-series-9', 1, 4,
  N'Apple Watch Series 9 GPS 45mm - Medianoche', N'Apple Watch Series 9 GPS de 45mm en color medianoche.',
  1919.00, 2399.00, 20, 12,
  'https://plazavea.vteximg.com.br/arquivos/ids/28839799-418-418/imageUrl_4.jpg',
  'gratis', 12, NULL),
 (5, 'logitech-g-pro-x', 2, 5,
  N'Teclado Mecánico Logitech G Pro X - RGB, Switches GX Blue', N'Teclado mecánico Logitech G Pro X con iluminación RGB y switches GX Blue.',
  417.00, 549.00, 24, 25,
  'https://oechsle.vteximg.com.br/arquivos/ids/7324469-1000-1000/imageUrl_2.jpg?v=637810641594700000',
  'gratis', 12, NULL),
 (6, 'ipad-air-m2', 1, 6,
  N'iPad Air 11 M2 256GB - Azul', N'iPad Air de 11 pulgadas con chip M2 y 256GB, color azul.',
  2738.00, 3299.00, 17, 10,
  'https://images.pexels.com/photos/1334597/pexels-photo-1334597.jpeg?auto=compress&cs=tinysrgb&w=800',
  'gratis', 12, NULL),
 (7, 'logitech-mx-master-3s', 2, 5,
  N'Mouse Logitech MX Master 3S - Inalámbrico', N'Mouse inalámbrico Logitech MX Master 3S.',
  364.00, 429.00, 15, 30,
  'https://images.pexels.com/photos/735911/pexels-photo-735911.jpeg?auto=compress&cs=tinysrgb&w=800',
  'gratis', 12, NULL),
 (8, 'sony-alpha-a7-iv', 1, 8,
  N'Cámara Sony Alpha A7 IV - Full Frame 33MP', N'Cámara mirrorless Sony Alpha A7 IV, sensor full frame de 33MP.',
  7829.00, 8999.00, 13, 4,
  'https://images.pexels.com/photos/279906/pexels-photo-279906.jpeg?auto=compress&cs=tinysrgb&w=800',
  'gratis', 12, NULL),
 -- Productos que aparecen en los datos mock del panel de proveedor (precio de ejemplo cuando no existía).
 -- Sus imágenes y las de los accesorios son marcadores de posición (placehold.co), no fotos reales.
 (9,  'mouse-gamer-logitech-g502', 1, 5, N'Mouse Gamer Logitech G502', N'Mouse gamer Logitech G502.',
  189.00, NULL, 0, 40, 'https://placehold.co/800x800/png?text=Mouse+Gamer+G502', 'estandar', 12, NULL),
 (10, 'teclado-mecanico-rgb', 1, 5, N'Teclado Mecánico RGB', N'Teclado mecánico con iluminación RGB.',
  229.00, NULL, 0, 18, 'https://placehold.co/800x800/png?text=Teclado+Mecanico+RGB', 'estandar', 12, NULL),
 (11, 'sony-wh-xb910n', 1, 3, N'Audífonos Sony WH-XB910', N'Audífonos inalámbricos Sony WH-XB910.',
  589.00, NULL, 0, 9, 'https://placehold.co/800x800/png?text=Sony+WH-XB910', 'estandar', 12, NULL),
 (12, 'teclado-mecanico-redra n', 1, 5, N'Teclado Mecánico Redra n', N'Teclado mecánico Redra n con switches red.',
  179.00, NULL, 0, 22, 'https://placehold.co/800x800/png?text=Teclado+Redra n', 'estandar', 12, NULL),
 (13, 'audifonos-hyperx-cloud-ii', 1, 3, N'Audífonos HyperX Cloud II', N'Audífonos gamer HyperX Cloud II.',
  349.00, NULL, 0, 0, 'https://placehold.co/800x800/png?text=HyperX+Cloud+II', 'estandar', 12, NULL),
 -- Accesorios para Malvino (fichas del chatbot)
 (14, 'case-iphone-13', 3, 7, N'Case para iPhone 13', N'Case protector para iPhone 13.',
  29.90, NULL, 0, 50, 'https://placehold.co/800x800/png?text=Case+iPhone+13', 'estandar', 3, 'case'),
 (15, 'case-iphone-14', 3, 7, N'Case para iPhone 14', N'Case protector para iPhone 14.',
  29.90, NULL, 0, 50, 'https://placehold.co/800x800/png?text=Case+iPhone+14', 'estandar', 3, 'case'),
 (16, 'protector-pantalla-iphone-13', 3, 7, N'Protector de pantalla para iPhone 13', N'Protector de vidrio templado para iPhone 13.',
  19.90, NULL, 0, 80, 'https://placehold.co/800x800/png?text=Protector+iPhone+13', 'estandar', 3, 'protector'),
 (17, 'bateria-samsung-a32-4g', 3, 7, N'Batería para Samsung A32 4G', N'Batería de repuesto para Samsung A32 4G.',
  59.90, NULL, 0, 15, 'https://placehold.co/800x800/png?text=Bateria+A32+4G', 'estandar', 6, 'bateria'),
 (18, 'bateria-samsung-a32-5g', 3, 7, N'Batería para Samsung A32 5G', N'Batería de repuesto para Samsung A32 5G.',
  64.90, NULL, 0, 12, 'https://placehold.co/800x800/png?text=Bateria+A32+5G', 'estandar', 6, 'bateria'),
 (19, 'kit-cargador-iphone-13', 3, 7, N'Kit cargador para iPhone 13', N'Kit de cargador para iPhone 13.',
  79.90, NULL, 0, 25, 'https://placehold.co/800x800/png?text=Cargador+iPhone+13', 'estandar', 6, 'cargador');
SET IDENTITY_INSERT productos OFF;

INSERT INTO producto_imagenes (producto_id, url, orden) VALUES
 (1, 'https://images.pexels.com/photos/18105/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=1200', 1),
 (1, 'https://images.pexels.com/photos/374074/pexels-photo-374074.jpeg?auto=compress&cs=tinysrgb&w=1200', 2),
 (1, 'https://images.pexels.com/photos/177598/pexels-photo-177598.jpeg?auto=compress&cs=tinysrgb&w=1200', 3);

INSERT INTO producto_especificaciones (producto_id, clave, valor, orden) VALUES
 (1, N'Procesador',        N'Intel Core i7 (12ª gen)',    1),
 (1, N'Memoria RAM',       N'16GB DDR5',                  2),
 (1, N'Almacenamiento',    N'1TB SSD NVMe',               3),
 (1, N'Gráficos',          N'NVIDIA GeForce RTX 3070',    4),
 (1, N'Pantalla',          N'16" FHD 144Hz',              5),
 (1, N'Sistema operativo', N'Windows 11',                 6),
 (1, N'Conectividad',      N'Wi-Fi 6, Bluetooth 5.2',     7),
 (1, N'Puertos',           N'USB-C, USB-A, HDMI, RJ-45',  8),
 (1, N'Peso',              N'2.3 kg aprox.',              9),
 (1, N'Color',             N'Negro sombra',               10);

SET IDENTITY_INSERT modelos_celular ON;
INSERT INTO modelos_celular (id, slug, nombre) VALUES
 (1, 'iphone-13',      N'iPhone 13'),
 (2, 'iphone-14',      N'iPhone 14'),
 (3, 'samsung-a32-4g', N'Samsung A32 4G'),
 (4, 'samsung-a32-5g', N'Samsung A32 5G');
SET IDENTITY_INSERT modelos_celular OFF;

INSERT INTO compatibilidad (producto_id, modelo_id) VALUES
 (14, 1), (15, 2), (16, 1), (17, 3), (18, 4), (19, 1);

-- Opiniones demostrativas. Las 3 primeras son las de producto-detalle.html (Carlos M., Lucía P., Juan R.).
-- Cada producto del home tiene al menos una, con la misma cantidad de estrellas que muestra home.ts;
-- la HP OMEN promedia 4.5, igual que la pestaña Opiniones del detalle.
INSERT INTO opiniones (producto_id, usuario_id, calificacion, comentario, creado_en) VALUES
 (1, 11, 5, N'Rinde muy bien con jue s exigentes y la pantalla ofrece una buena calidad.', '2026-09-20T18:30:00'),
 (1, 12, 5, N'Muy rápida para edición de video y trabajos pesados.',                        '2026-09-21T10:05:00'),
 (1, 13, 4, N'Buena relación entre rendimiento y precio.',                                  '2026-09-22T21:10:00'),
 (1, 2,  4, N'Buena laptop, se calienta un poco con carga alta.',                           '2026-09-23T08:40:00'),
 (2, 4,  5, N'Excelente cámara y batería.',                                                 '2026-09-25T09:45:00'),
 (3, 3,  5, N'La cancelación de ruido es excelente.',                                       '2026-09-24T17:15:00'),
 (4, 6,  4, N'Buen reloj, aunque la batería dura apenas un día.',                           '2026-09-24T20:30:00'),
 (5, 7,  5, N'Las teclas responden muy bien y se siente sólido.',                           '2026-09-25T13:20:00'),
 (6, 3,  5, N'Pantalla nítida y muy fluida para estudiar y dibujar.',                       '2026-09-26T11:00:00'),
 (7, 5,  5, N'Muy cómodo para trabajar todo el día.',                                       '2026-09-26T12:00:00'),
 (8, 4,  4, N'Gran calidad de imagen; el menú toma tiempo en aprenderse.',                  '2026-09-27T15:35:00');

-- Caché de calificaciones calculado desde opiniones (el backend repite esta consulta al insertar una opinión).
UPDATE p
   SET p.num_opiniones     = a.num_opiniones,
       p.calificacion_prom = a.calificacion_prom
  FROM productos p
  JOIN (SELECT producto_id,
               COUNT(*) AS num_opiniones,
               CAST(ROUND(AVG(CAST(calificacion AS DECIMAL(4,2))), 1) AS DECIMAL(2,1)) AS calificacion_prom
          FROM opiniones
         GROUP BY producto_id) a ON a.producto_id = p.id;

SET IDENTITY_INSERT direcciones ON;
INSERT INTO direcciones (id, usuario_id, departamento, distrito, direccion, referencia, es_principal) VALUES
 (1, 1, N'Lima', N'Miraflores', N'Av. Ejemplo 123', N'Frente al parque', 1);
SET IDENTITY_INSERT direcciones OFF;

INSERT INTO favoritos (usuario_id, producto_id) VALUES (1, 1), (1, 7);
INSERT INTO carrito_items (usuario_id, producto_id, cantidad) VALUES (1, 5, 1), (1, 9, 2);

-- Pedidos: los 3 primeros reproducen los datos mock del dashboard (#4512, #4513, #4514).
-- El 4.º sirve para probar la regla de envío (< S/ 50 cobra S/ 15) con un pedido de la cuenta demo.
SET IDENTITY_INSERT pedidos ON;
INSERT INTO pedidos
 (id, codi , usuario_id, clave_idempotencia, metodo_pa , subtotal, costo_envio, total,
  entrega_nombres, entrega_apellidos, entrega_correo, entrega_telefono,
  entrega_departamento, entrega_distrito, entrega_direccion, entrega_referencia, creado_en) VALUES
 (1, 'MALV-4512', 2, '11111111-1111-4111-8111-111111111111', 'tarjeta',        229.00, 0.00,  229.00,
  N'José',   N'Ramírez', N'jose.ramirez@example.com', '900000002', N'Lima',     N'San Isidro', N'Av. Ejemplo 456',   NULL, '2026-09-28T10:15:00'),
 (2, 'MALV-4513', 3, '22222222-2222-4222-8222-222222222222', 'yape_plin',      589.00, 0.00,  589.00,
  N'Camila', N'López',   N'camila.lopez@example.com', '900000003', N'Arequipa', N'Cayma',      N'Calle Ejemplo 789', NULL, '2026-09-27T16:40:00'),
 (3, 'MALV-4514', 4, '33333333-3333-4333-8333-333333333333', 'contra_entrega', 189.00, 0.00,  189.00,
  N'Luis',   N'Torres',  N'luis.torres@example.com',  '900000004', N'Piura',    N'Castilla',   N'Jr. Ejemplo 321',   NULL, '2026-09-29T11:05:00'),
 (4, 'MALV-4515', 1, '44444444-4444-4444-8444-444444444444', 'yape_plin',       49.80, 15.00,  64.80,
  N'Usuario', N'de prueba', N'demo@malvitec.com',     '999888777', N'Lima',     N'Miraflores', N'Av. Ejemplo 123',   N'Frente al parque', '2026-09-15T19:20:00');
SET IDENTITY_INSERT pedidos OFF;

INSERT INTO pedido_items (pedido_id, producto_id, proveedor_id, titulo, precio_unitario, cantidad, estado) VALUES
 (1, 10, 1, N'Teclado Mecánico RGB',                 229.00, 1, 'Pendiente'),
 (2, 11, 1, N'Audífonos Sony WH-XB910',              589.00, 1, 'Completado'),
 (3, 9,  1, N'Mouse Gamer Logitech G502',            189.00, 1, 'Pendiente'),
 (4, 14, 3, N'Case para iPhone 13',                   29.90, 1, 'Entregado'),
 (4, 16, 3, N'Protector de pantalla para iPhone 13',  19.90, 1, 'Entregado');

INSERT INTO consultas (producto_id, usuario_id, mensaje, respuesta, estado, creado_en, respondida_en) VALUES
 (9,  5, N'¿Este mouse es compatible con PS5?',  NULL,                           'Nueva',      '2026-10-01T09:00:00', NULL),
 (12, 6, N'¿Incluye switches red?',              N'Sí, switches red incluidos.', 'Respondida', '2026-09-30T15:20:00', '2026-09-30T17:00:00'),
 (13, 7, N'¿Tiene cancelación de ruido activa?', NULL,                           'Nueva',      '2026-10-02T08:30:00', NULL);

-- Verificación rápida
SELECT 'usuarios' AS tabla, COUNT(*) AS filas FROM usuarios UNION ALL SELECT 'proveedores', COUNT(*) FROM proveedores
UNION ALL SELECT 'categorias', COUNT(*) FROM categorias UNION ALL SELECT 'productos', COUNT(*) FROM productos
UNION ALL SELECT 'opiniones', COUNT(*) FROM opiniones
UNION ALL SELECT 'pedidos', COUNT(*) FROM pedidos UNION ALL SELECT 'pedido_items', COUNT(*) FROM pedido_items
UNION ALL SELECT 'consultas', COUNT(*) FROM consultas UNION ALL SELECT 'compatibilidad', COUNT(*) FROM compatibilidad;
 
