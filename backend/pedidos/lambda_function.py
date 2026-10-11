"""malvitec-pedidos: crea el pedido desde el carrito, lista los pedidos y cambia su estado. Rutas en backend/README.md."""

from decimal import Decimal
from uuid import uuid4

from malvitec_comun import ErrorApi, conexion, cuerpo, manejar, metodo, parametro, respuesta, usuario_actual

ENVIO_GRATIS_DESDE = Decimal("50")
COSTO_ENVIO = Decimal("15")
METODOS_PAGO = ("tarjeta", "yape_plin", "contra_entrega")

# Campo del cuerpo -> (nombre para el mensaje, largo máximo de la columna en pedidos).
CAMPOS = {
    "nombres": ("el nombre", 100),
    "apellidos": ("los apellidos", 100),
    "correo": ("el correo", 150),
    "telefono": ("el teléfono", 15),
    "departamento": ("el departamento", 40),
    "distrito": ("el distrito", 80),
    "direccion": ("la dirección", 200),
}


def texto(datos, campo):
    valor = datos.get(campo)
    return valor.strip() if isinstance(valor, str) else ""


def leer_entrega(datos):
    entrega = {}
    for campo, (nombre, largo) in CAMPOS.items():
        valor = texto(datos, campo)
        if not valor:
            raise ErrorApi(400, f"Falta {nombre}")
        if len(valor) > largo:
            raise ErrorApi(400, f"{nombre[0].upper()}{nombre[1:]} no puede tener más de {largo} caracteres")
        entrega[campo] = valor

    if "@" not in entrega["correo"]:
        raise ErrorApi(400, "El correo no es válido")

    referencia = texto(datos, "referencia")
    if len(referencia) > 200:
        raise ErrorApi(400, "La referencia no puede tener más de 200 caracteres")
    entrega["referencia"] = referencia or None
    return entrega


def leer_clave(datos):
    # La genera el front una vez por compra: si el pedido se envía dos veces (doble clic, reintento),
    # se devuelve el mismo pedido en lugar de cobrar de nuevo.
    clave = texto(datos, "clave")
    if not clave:
        return str(uuid4())
    if len(clave) > 64:
        raise ErrorApi(400, "La clave del pedido no es válida")
    return clave


def buscar_pedido(cursor, usuario_id, clave):
    cursor.execute(
        """
        SELECT id, codi, subtotal, costo_envio, total
        FROM pedidos
        WHERE usuario_id = %s AND clave_idempotencia = %s
        """,
        (usuario_id, clave),
    )
    return cursor.fetchone()


def crear(cursor, usuario_id, datos):
    entrega = leer_entrega(datos)
    metodo_pago = texto(datos, "metodo_pago")
    if metodo_pago not in METODOS_PAGO:
        raise ErrorApi(400, "Método de pago no válido")
    clave = leer_clave(datos)

    anterior = buscar_pedido(cursor, usuario_id, clave)
    if anterior:
        return respuesta(200, anterior)

    # UPDLOCK bloquea las filas leídas hasta el commit: dos compras a la vez no pueden vender el mismo stock.
    cursor.execute(
        """
        SELECT p.id AS producto_id, p.proveedor_id, p.titulo, p.precio_actual, p.stock, c.cantidad
        FROM carrito_items c WITH (UPDLOCK)
        JOIN productos p WITH (UPDLOCK) ON p.id = c.producto_id
        WHERE c.usuario_id = %s AND p.activo = 1
        ORDER BY p.id
        """,
        (usuario_id,),
    )
    items = cursor.fetchall()
    if not items:
        raise ErrorApi(409, "Tu carrito está vacío")

    for item in items:
        if item["cantidad"] > item["stock"]:
            if item["stock"] == 0:
                raise ErrorApi(409, f"{item['titulo']} está agotado")
            raise ErrorApi(409, f"Solo hay {item['stock']} unidades de {item['titulo']}")

    subtotal = sum((item["precio_actual"] * item["cantidad"] for item in items), Decimal("0"))
    costo_envio = Decimal("0") if subtotal >= ENVIO_GRATIS_DESDE else COSTO_ENVIO

    cursor.execute(
        """
        INSERT INTO pedidos (
            codi, usuario_id, clave_idempotencia, metodo_pa, subtotal, costo_envio, total,
            entrega_nombres, entrega_apellidos, entrega_correo, entrega_telefono,
            entrega_departamento, entrega_distrito, entrega_direccion, entrega_referencia
        )
        OUTPUT INSERTED.id, INSERTED.codi, INSERTED.subtotal, INSERTED.costo_envio, INSERTED.total
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """,
        (
            "MALV-" + uuid4().hex[:10].upper(),
            usuario_id,
            clave,
            metodo_pago,
            subtotal,
            costo_envio,
            subtotal + costo_envio,
            entrega["nombres"],
            entrega["apellidos"],
            entrega["correo"],
            entrega["telefono"],
            entrega["departamento"],
            entrega["distrito"],
            entrega["direccion"],
            entrega["referencia"],
        ),
    )
    pedido = cursor.fetchone()

    for item in items:
        cursor.execute(
            """
            INSERT INTO pedido_items (pedido_id, producto_id, proveedor_id, titulo, precio_unitario, cantidad, estado)
            VALUES (%s, %s, %s, %s, %s, %s, 'Pendiente')
            """,
            (
                pedido["id"],
                item["producto_id"],
                item["proveedor_id"],
                item["titulo"],
                item["precio_actual"],
                item["cantidad"],
            ),
        )
        cursor.execute(
            "UPDATE productos SET stock = stock - %s WHERE id = %s",
            (item["cantidad"], item["producto_id"]),
        )

    # Todo va en la misma transacción: si algo falla, no queda pedido sin descontar stock ni carrito a medias.
    cursor.execute("DELETE FROM carrito_items WHERE usuario_id = %s", (usuario_id,))
    return respuesta(201, pedido)


def listar_pedidos_cliente(cursor, usuario_id):
    cursor.execute(
        """
        SELECT
            p.id AS pedido_id,
            p.codi,
            p.subtotal,
            p.costo_envio,
            p.total,
            p.metodo_pa,
            p.creado_en,
            pi.id AS item_id,
            pi.titulo,
            pi.precio_unitario,
            pi.cantidad,
            pi.estado
        FROM pedidos p
        JOIN pedido_items pi
            ON pi.pedido_id = p.id
        WHERE p.usuario_id = %s
        ORDER BY
            p.creado_en DESC,
            pi.id
        """,
        (usuario_id,),
    )

    filas = cursor.fetchall()

    pedidos = []
    encontrados = {}

    for fila in filas:
        pedido_id = fila["pedido_id"]

        if pedido_id not in encontrados:
            pedido = {
                "id": pedido_id,
                "codi": fila["codi"],
                "subtotal": fila["subtotal"],
                "costo_envio": fila["costo_envio"],
                "total": fila["total"],
                "metodo_pago": fila["metodo_pa"],
                "fecha": fila["creado_en"],
                "items": [],
            }

            encontrados[pedido_id] = pedido
            pedidos.append(pedido)

        encontrados[pedido_id]["items"].append(
            {
                "id": fila["item_id"],
                "titulo": fila["titulo"],
                "precio": fila["precio_unitario"],
                "cantidad": fila["cantidad"],
                "estado": fila["estado"],
            }
        )

    return pedidos


def listar_pedidos_proveedor(cursor, usuario_id):
    cursor.execute(
        """
        SELECT
            pi.id AS item_id,
            p.id AS pedido_id,
            p.codi,
            p.entrega_nombres,
            p.entrega_apellidos,
            p.entrega_telefono,
            p.entrega_departamento,
            p.entrega_distrito,
            p.entrega_direccion,
            p.entrega_referencia,
            p.creado_en,
            pi.titulo,
            pi.precio_unitario,
            pi.cantidad,
            (pi.precio_unitario * pi.cantidad) AS total_item,
            pi.estado
        FROM pedido_items pi
        JOIN pedidos p
            ON p.id = pi.pedido_id
        JOIN proveedores pr
            ON pr.id = pi.proveedor_id
        WHERE pr.usuario_id = %s
        ORDER BY
            p.creado_en DESC,
            pi.id DESC
        """,
        (usuario_id,),
    )

    return cursor.fetchall()


def cambiar_estado(cursor, usuario_id, item_id, datos):
    nuevo_estado = texto(datos, "estado")

    if nuevo_estado not in (
        "En camino",
        "Entregado",
    ):
        raise ErrorApi(
            400,
            "Estado no válido"
        )

    cursor.execute(
        """
        SELECT
            pi.estado
        FROM pedido_items pi
        JOIN proveedores pr
            ON pr.id = pi.proveedor_id
        WHERE
            pi.id = %s
            AND pr.usuario_id = %s
        """,
        (
            item_id,
            usuario_id,
        ),
    )

    item = cursor.fetchone()

    if not item:
        raise ErrorApi(
            404,
            "Pedido no encontrado"
        )

    estado_actual = item["estado"]

    if (
        estado_actual == "Pendiente"
        and nuevo_estado != "En camino"
    ):
        raise ErrorApi(
            409,
            "El pedido primero debe pasar a En camino"
        )

    if (
        estado_actual == "En camino"
        and nuevo_estado != "Entregado"
    ):
        raise ErrorApi(
            409,
            "El siguiente estado debe ser Entregado"
        )

    if estado_actual in (
        "Entregado",
        "Completado",
        "Cancelado",
    ):
        raise ErrorApi(
            409,
            f"El pedido ya se encuentra en estado {estado_actual}"
        )

    cursor.execute(
        """
        UPDATE pi
        SET estado = %s
        FROM pedido_items pi
        JOIN proveedores pr
            ON pr.id = pi.proveedor_id
        WHERE
            pi.id = %s
            AND pr.usuario_id = %s
        """,
        (
            nuevo_estado,
            item_id,
            usuario_id,
        ),
    )

    return {
        "mensaje": "Estado actualizado",
        "item_id": item_id,
        "estado": nuevo_estado,
    }


@manejar
def lambda_handler(event, context):
    accion = metodo(event)
    # En API Gateway el parámetro de la ruta se llama {slug}, igual que en las demás Lambdas.
    item_id = parametro(event, "id") or parametro(event, "slug")

    # GET /pedidos: el cliente ve sus compras; el proveedor, los ítems que le toca atender.
    if accion == "GET" and not item_id:
        usuario = usuario_actual(event)
        with conexion() as cursor:
            if usuario["rol"] == "cliente":
                return respuesta(200, listar_pedidos_cliente(cursor, usuario["usuario_id"]))
            if usuario["rol"] == "proveedor":
                return respuesta(200, listar_pedidos_proveedor(cursor, usuario["usuario_id"]))
        raise ErrorApi(403, "No tienes permiso para ver pedidos")

    # POST /pedidos
    if accion == "POST" and not item_id:
        usuario = usuario_actual(event, "cliente")
        with conexion() as cursor:
            return crear(cursor, usuario["usuario_id"], cuerpo(event))

    # PUT /pedidos/{id}: el id es el del ítem, porque cada proveedor atiende sus propios ítems.
    if accion == "PUT" and item_id:
        usuario = usuario_actual(event, "proveedor")
        try:
            item_id = int(item_id)
        except (TypeError, ValueError):
            raise ErrorApi(400, "Id de pedido no válido")
        with conexion() as cursor:
            return respuesta(200, cambiar_estado(cursor, usuario["usuario_id"], item_id, cuerpo(event)))

    raise ErrorApi(404, "Ruta no encontrada")
