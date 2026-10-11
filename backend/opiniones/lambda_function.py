"""malvitec-opiniones: opiniones de un producto. Verlas es público; opinar pide sesión de cliente. Rutas en backend/README.md."""

from malvitec_comun import ErrorApi, conexion, cuerpo, manejar, metodo, parametro, respuesta, usuario_actual


def buscar_producto(cursor, slug):
    cursor.execute("SELECT id FROM productos WHERE slug = %s AND activo = 1", (slug,))
    producto = cursor.fetchone()
    if not producto:
        raise ErrorApi(404, "El producto no existe")
    return producto["id"]


def listar(cursor, slug):
    producto_id = buscar_producto(cursor, slug)
    # ' ' + NULL da NULL y CONCAT lo toma como vacío: sin apellidos no queda un espacio de más.
    cursor.execute(
        """
        SELECT o.id, CONCAT(u.nombre, ' ' + u.apellidos) AS autor, o.calificacion, o.comentario, o.creado_en
        FROM opiniones o
        JOIN usuarios u ON u.id = o.usuario_id
        WHERE o.producto_id = %s
        ORDER BY o.creado_en DESC, o.id DESC
        """,
        (producto_id,),
    )
    return respuesta(200, cursor.fetchall())


def opinar(cursor, usuario_id, slug, datos):
    calificacion = datos.get("calificacion")
    if isinstance(calificacion, bool) or not isinstance(calificacion, int) or not 1 <= calificacion <= 5:
        raise ErrorApi(400, "La calificación debe ser un número del 1 al 5")

    comentario = datos.get("comentario")
    comentario = comentario.strip() if isinstance(comentario, str) else ""
    if len(comentario) > 500:
        raise ErrorApi(400, "El comentario no puede tener más de 500 caracteres")

    producto_id = buscar_producto(cursor, slug)
    cursor.execute(
        "SELECT id FROM opiniones WHERE producto_id = %s AND usuario_id = %s",
        (producto_id, usuario_id),
    )
    anterior = cursor.fetchone()

    # Cada usuario tiene una sola opinión por producto: si vuelve a opinar, se reemplaza.
    if anterior:
        cursor.execute(
            "UPDATE opiniones SET calificacion = %s, comentario = %s, creado_en = SYSDATETIME() WHERE id = %s",
            (calificacion, comentario or None, anterior["id"]),
        )
    else:
        cursor.execute(
            "INSERT INTO opiniones (producto_id, usuario_id, calificacion, comentario) VALUES (%s, %s, %s, %s)",
            (producto_id, usuario_id, calificacion, comentario or None),
        )

    # calificacion_prom y num_opiniones son una copia que lee el catálogo; se recalculan en la misma transacción.
    cursor.execute(
        """
        UPDATE productos
        SET num_opiniones = (SELECT COUNT(*) FROM opiniones WHERE producto_id = %s),
            calificacion_prom = (
                SELECT CAST(ROUND(AVG(CAST(calificacion AS DECIMAL(4,2))), 1) AS DECIMAL(2,1))
                FROM opiniones WHERE producto_id = %s
            )
        WHERE id = %s
        """,
        (producto_id, producto_id, producto_id),
    )
    cursor.execute(
        "SELECT calificacion_prom, num_opiniones FROM productos WHERE id = %s",
        (producto_id,),
    )
    return respuesta(200 if anterior else 201, cursor.fetchone())


@manejar
def lambda_handler(event, context):
    accion = metodo(event)
    slug = parametro(event, "slug")
    if not slug or accion not in ("GET", "POST"):
        raise ErrorApi(404, "Ruta no encontrada")

    if accion == "GET":
        with conexion() as cursor:
            return listar(cursor, slug)

    usuario_id = usuario_actual(event, "cliente")["usuario_id"]
    with conexion() as cursor:
        return opinar(cursor, usuario_id, slug, cuerpo(event))
