"""malvitec-favoritos: favoritos del usuario con sesión iniciada. Rutas en backend/README.md."""

from malvitec_comun import ErrorApi, conexion, cuerpo, manejar, metodo, parametro, respuesta, usuario_actual


def listar(cursor, usuario_id):
    # Un producto desactivado por su proveedor deja de aparecer.
    cursor.execute(
        """
        SELECT p.slug, p.titulo, p.precio_actual, p.imagen_url
        FROM favoritos f
        JOIN productos p ON p.id = f.producto_id
        WHERE f.usuario_id = %s AND p.activo = 1
        ORDER BY f.creado_en DESC
        """,
        (usuario_id,),
    )
    return cursor.fetchall()


def agregar(cursor, usuario_id, slug):
    if not isinstance(slug, str) or not slug.strip():
        raise ErrorApi(400, "Falta el slug del producto")

    cursor.execute(
        "SELECT id, slug, titulo, precio_actual, imagen_url FROM productos WHERE slug = %s AND activo = 1",
        (slug.strip(),),
    )
    producto = cursor.fetchone()
    if not producto:
        raise ErrorApi(404, "El producto no existe")

    producto_id = producto.pop("id")
    cursor.execute(
        "SELECT 1 AS existe FROM favoritos WHERE usuario_id = %s AND producto_id = %s",
        (usuario_id, producto_id),
    )
    # Agregar dos veces no es error: responde 200 sin duplicar.
    if cursor.fetchone():
        return respuesta(200, producto)

    cursor.execute(
        "INSERT INTO favoritos (usuario_id, producto_id) VALUES (%s, %s)",
        (usuario_id, producto_id),
    )
    return respuesta(201, producto)


def quitar(cursor, usuario_id, slug):
    cursor.execute(
        """
        DELETE f
        FROM favoritos f
        JOIN productos p ON p.id = f.producto_id
        WHERE f.usuario_id = %s AND p.slug = %s
        """,
        (usuario_id, slug),
    )
    return respuesta(200, {"mensaje": "Producto quitado de favoritos"})


@manejar
def lambda_handler(event, context):
    usuario_id = usuario_actual(event)["usuario_id"]
    accion = metodo(event)
    slug = parametro(event, "slug")

    with conexion() as cursor:
        if accion == "GET" and not slug:
            return respuesta(200, listar(cursor, usuario_id))
        if accion == "POST" and not slug:
            return agregar(cursor, usuario_id, cuerpo(event).get("slug"))
        if accion == "DELETE" and slug:
            return quitar(cursor, usuario_id, slug)

    raise ErrorApi(404, "Ruta no encontrada")
