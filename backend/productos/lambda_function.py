"""malvitec-productos: catálogo y detalle de productos."""

from malvitec_comun import (
    ErrorApi,
    conexion,
    manejar,
    metodo,
    parametro,
    respuesta,
)


def listar_productos(cursor):
    """Obtiene todos los productos activos del catálogo."""

    cursor.execute(
        """
        SELECT
            p.id,
            p.slug,
            p.titulo,
            p.descripcion,
            p.precio_actual,
            p.precio_anterior,
            p.descuento_pct,
            p.stock,
            p.imagen_url,
            p.tipo_envio,
            p.garantia_meses,
            p.calificacion_prom,
            p.num_opiniones,
            p.tipo_accesorio,
            pr.nombre_comercial AS proveedor,
            c.nombre AS categoria
        FROM productos p
        LEFT JOIN proveedores pr
            ON pr.id = p.proveedor_id
        LEFT JOIN categorias c
            ON c.id = p.categoria_id
        WHERE p.activo = 1
        ORDER BY p.titulo
        """
    )

    return cursor.fetchall()


def obtener_producto(cursor, slug):
    """Obtiene un producto activo mediante su slug."""

    if not isinstance(slug, str) or not slug.strip():
        raise ErrorApi(400, "Falta el slug del producto")

    cursor.execute(
        """
        SELECT
            p.id,
            p.slug,
            p.titulo,
            p.descripcion,
            p.precio_actual,
            p.precio_anterior,
            p.descuento_pct,
            p.stock,
            p.imagen_url,
            p.tipo_envio,
            p.garantia_meses,
            p.calificacion_prom,
            p.num_opiniones,
            p.tipo_accesorio,
            pr.nombre_comercial AS proveedor,
            c.nombre AS categoria
        FROM productos p
        LEFT JOIN proveedores pr
            ON pr.id = p.proveedor_id
        LEFT JOIN categorias c
            ON c.id = p.categoria_id
        WHERE p.slug = %s
          AND p.activo = 1
        """,
        (slug.strip(),),
    )

    producto = cursor.fetchone()

    if not producto:
        raise ErrorApi(404, "El producto no existe")

    producto["imagenes"] = obtener_imagenes(cursor, producto["id"])
    producto["especificaciones"] = obtener_especificaciones(
        cursor,
        producto["id"]
    )

    return producto


def obtener_imagenes(cursor, producto_id):
    """Obtiene la galería de imágenes del producto."""

    cursor.execute(
        """
        SELECT
            url,
            orden
        FROM producto_imagenes
        WHERE producto_id = %s
        ORDER BY orden, id
        """,
        (producto_id,),
    )

    return cursor.fetchall()


def obtener_especificaciones(cursor, producto_id):
    """Obtiene las características técnicas del producto."""

    cursor.execute(
        """
        SELECT
            clave,
            valor,
            orden
        FROM producto_especificaciones
        WHERE producto_id = %s
        ORDER BY orden, id
        """,
        (producto_id,),
    )

    return cursor.fetchall()


@manejar
def lambda_handler(event, context):
    accion = metodo(event)
    slug = parametro(event, "slug")

    with conexion() as cursor:

        # GET /productos
        if accion == "GET" and not slug:
            return respuesta(
                200,
                listar_productos(cursor)
            )

        # GET /productos/{slug}
        if accion == "GET" and slug:
            return respuesta(
                200,
                obtener_producto(cursor, slug)
            )

        raise ErrorApi(404, "Ruta no encontrada")