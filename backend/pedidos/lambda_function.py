"""malvitec-pedidos: crea el pedido a partir del carrito del usuario con sesión iniciada. Rutas en backend/README.md."""

from decimal import Decimal
from uuid import uuid4

from malvitec_comun import ErrorApi, conexion, cuerpo, manejar, metodo, respuesta, usuario_actual

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


@manejar
def lambda_handler(event, context):
    usuario_id = usuario_actual(event)["usuario_id"]

    if metodo(event) != "POST":
        raise ErrorApi(404, "Ruta no encontrada")

    with conexion() as cursor:
        return crear(cursor, usuario_id, cuerpo(event))
