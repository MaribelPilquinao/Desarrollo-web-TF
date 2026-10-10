"""malvitec-productos: catálogo, búsqueda y detalle de productos."""

from malvitec_comun import (
    ErrorApi,
    conexion,
    manejar,
    metodo,
    parametro,
    respuesta,
)


def parametro_consulta(event, nombre):
    """
    Obtiene un parámetro de consulta.

    Ejemplo:
    /productos?buscar=iphone&orden=precio_asc
    """
    parametros = event.get("queryStringParameters") or {}
    valor = parametros.get(nombre)

    if not isinstance(valor, str):
        return None

    valor = valor.strip()

    return valor if valor else None


def listar_productos(cursor, event):
    """
    Lista los productos activos.

    Permite:
    ?buscar=texto
    ?orden=precio_asc
    ?orden=precio_desc
    ?orden=valoracion
    ?orden=relevancia
    """

    buscar = parametro_consulta(event, "buscar")
    orden = parametro_consulta(event, "orden") or "relevancia"

    ordenes_validos = {
        "precio_asc",
        "precio_desc",
        "valoracion",
        "relevancia",
    }

    if orden not in ordenes_validos:
        raise ErrorApi(
            400,
            "Orden no válido"
        )

    sql = """
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
    """

    parametros = []

    # Búsqueda
    if buscar:
        texto = f"%{buscar}%"

        sql += """
            AND (
                p.titulo LIKE %s
                OR p.descripcion LIKE %s
                OR pr.nombre_comercial LIKE %s
            )
        """

        parametros.extend([
            texto,
            texto,
            texto,
        ])

    # Ordenamiento
    if orden == "precio_asc":

        sql += """
            ORDER BY p.precio_actual ASC, p.titulo ASC
        """

    elif orden == "precio_desc":

        sql += """
            ORDER BY p.precio_actual DESC, p.titulo ASC
        """

    elif orden == "valoracion":

        sql += """
            ORDER BY
                p.calificacion_prom DESC,
                p.num_opiniones DESC,
                p.titulo ASC
        """

    elif buscar:
        # Relevancia:
        # 1. título exactamente igual
        # 2. título que comienza con la búsqueda
        # 3. proveedor relacionado
        # 4. resto de coincidencias

        sql += """
            ORDER BY
                CASE
                    WHEN p.titulo = %s THEN 0
                    WHEN p.titulo LIKE %s THEN 1
                    WHEN pr.nombre_comercial LIKE %s THEN 2
                    ELSE 3
                END,
                p.calificacion_prom DESC,
                p.titulo ASC
        """

        parametros.extend([
            buscar,
            f"{buscar}%",
            f"%{buscar}%",
        ])

    else:

        sql += """
            ORDER BY p.titulo ASC
        """

    cursor.execute(
        sql,
        tuple(parametros)
    )

    return cursor.fetchall()


def obtener_producto(cursor, slug):
    """Obtiene el detalle de un producto mediante su slug."""

    if not isinstance(slug, str) or not slug.strip():
        raise ErrorApi(
            400,
            "Falta el slug del producto"
        )

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
        raise ErrorApi(
            404,
            "El producto no existe"
        )

    producto["imagenes"] = obtener_imagenes(
        cursor,
        producto["id"]
    )

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
    """Obtiene las especificaciones técnicas del producto."""

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
        # GET /productos?buscar=...
        if accion == "GET" and not slug:
            return respuesta(
                200,
                listar_productos(cursor, event)
            )

        # GET /productos/{slug}
        if accion == "GET" and slug:
            return respuesta(
                200,
                obtener_producto(cursor, slug)
            )

        raise ErrorApi(
            404,
            "Ruta no encontrada"
        )