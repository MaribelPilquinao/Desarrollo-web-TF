"""malvitec-carrito: carrito del usuario con sesión iniciada. Rutas en backend/README.md."""

from decimal import Decimal

from malvitec_comun import ErrorApi, conexion, cuerpo, manejar, metodo, parametro, respuesta, usuario_actual

CANTIDAD_MAXIMA = 99
ENVIO_GRATIS_DESDE = Decimal("50")
COSTO_ENVIO = Decimal("15")


def leer_carrito(cursor, usuario_id):
    # El precio se lee siempre de productos, no se guarda en el carrito.
    # Se ordena por título para que los ítems no cambien de lugar al modificar una cantidad.
    cursor.execute(
        """
        SELECT p.slug, p.titulo, p.imagen_url, p.precio_actual, c.cantidad, p.stock
        FROM carrito_items c
        JOIN productos p ON p.id = c.producto_id
        WHERE c.usuario_id = %s AND p.activo = 1
        ORDER BY p.titulo, p.id
        """,
        (usuario_id,),
    )
    items = cursor.fetchall()

    subtotal = sum((item["precio_actual"] * item["cantidad"] for item in items), Decimal("0"))
    costo_envio = Decimal("0") if subtotal == 0 or subtotal >= ENVIO_GRATIS_DESDE else COSTO_ENVIO
    return {
        "items": items,
        "subtotal": subtotal,
        "costo_envio": costo_envio,
        "total": subtotal + costo_envio,
    }


def leer_cantidad(valor):
    # bool es subclase de int en Python: true no cuenta como cantidad.
    if isinstance(valor, bool) or not isinstance(valor, int):
        raise ErrorApi(400, "La cantidad debe ser un número entero")
    return valor


def buscar_producto(cursor, slug):
    if not isinstance(slug, str) or not slug.strip():
        raise ErrorApi(400, "Falta el slug del producto")
    cursor.execute("SELECT id, stock FROM productos WHERE slug = %s AND activo = 1", (slug.strip(),))
    producto = cursor.fetchone()
    if not producto:
        raise ErrorApi(404, "El producto no existe")
    return producto


def validar_limites(cantidad, stock):
    if cantidad > CANTIDAD_MAXIMA:
        raise ErrorApi(409, f"No puedes llevar más de {CANTIDAD_MAXIMA} unidades de un producto")
    if cantidad > stock:
        if stock == 0:
            raise ErrorApi(409, "El producto está agotado")
        raise ErrorApi(409, f"Solo hay {stock} unidades disponibles")


def agregar(cursor, usuario_id, datos):
    cantidad = leer_cantidad(datos.get("cantidad", 1))
    if not 1 <= cantidad <= CANTIDAD_MAXIMA:
        raise ErrorApi(400, f"La cantidad debe estar entre 1 y {CANTIDAD_MAXIMA}")
    producto = buscar_producto(cursor, datos.get("slug"))

    cursor.execute(
        "SELECT cantidad FROM carrito_items WHERE usuario_id = %s AND producto_id = %s",
        (usuario_id, producto["id"]),
    )
    item = cursor.fetchone()

    nueva = cantidad + (item["cantidad"] if item else 0)
    validar_limites(nueva, producto["stock"])

    if item:
        cursor.execute(
            """
            UPDATE carrito_items SET cantidad = %s, actualizado_en = SYSDATETIME()
            WHERE usuario_id = %s AND producto_id = %s
            """,
            (nueva, usuario_id, producto["id"]),
        )
    else:
        cursor.execute(
            "INSERT INTO carrito_items (usuario_id, producto_id, cantidad) VALUES (%s, %s, %s)",
            (usuario_id, producto["id"], nueva),
        )


def cambiar_cantidad(cursor, usuario_id, slug, datos):
    if "cantidad" not in datos:
        raise ErrorApi(400, "Falta la cantidad")
    cantidad = leer_cantidad(datos["cantidad"])

    # Cantidad menor que 1 quita el producto, igual que en el front.
    if cantidad < 1:
        quitar(cursor, usuario_id, slug)
        return

    producto = buscar_producto(cursor, slug)
    validar_limites(cantidad, producto["stock"])
    cursor.execute(
        """
        UPDATE carrito_items SET cantidad = %s, actualizado_en = SYSDATETIME()
        WHERE usuario_id = %s AND producto_id = %s
        """,
        (cantidad, usuario_id, producto["id"]),
    )
    if cursor.rowcount == 0:
        raise ErrorApi(404, "El producto no está en el carrito")


def quitar(cursor, usuario_id, slug):
    cursor.execute(
        """
        DELETE c
        FROM carrito_items c
        JOIN productos p ON p.id = c.producto_id
        WHERE c.usuario_id = %s AND p.slug = %s
        """,
        (usuario_id, slug),
    )


def vaciar(cursor, usuario_id):
    cursor.execute("DELETE FROM carrito_items WHERE usuario_id = %s", (usuario_id,))


@manejar
def lambda_handler(event, context):
    usuario_id = usuario_actual(event)["usuario_id"]
    accion = metodo(event)
    slug = parametro(event, "slug")

    with conexion() as cursor:
        if accion == "GET" and not slug:
            pass
        elif accion == "POST" and not slug:
            agregar(cursor, usuario_id, cuerpo(event))
        elif accion == "PUT" and slug:
            cambiar_cantidad(cursor, usuario_id, slug, cuerpo(event))
        elif accion == "DELETE" and slug:
            quitar(cursor, usuario_id, slug)
        elif accion == "DELETE":
            vaciar(cursor, usuario_id)
        else:
            raise ErrorApi(404, "Ruta no encontrada")
        return respuesta(200, leer_carrito(cursor, usuario_id))
