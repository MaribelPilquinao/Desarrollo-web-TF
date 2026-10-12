"""malvitec-malvino: chat de Malvino por palabras clave, sin IA. Busca en el catálogo, muestra los pedidos del usuario y envía preguntas al proveedor. Rutas en backend/README.md."""

import re
import unicodedata

from malvitec_comun import ErrorApi, conexion, cuerpo, manejar, metodo, parametro, respuesta, usuario_actual

IMAGEN_POR_DEFECTO = "imagenes/malvitec-logo.png"

PALABRAS_PEDIDO = ("pedido", "rastreo", "mi compra", "mis compras")

# Palabra del mensaje -> slug de la categoría (tabla categorias).
CATEGORIAS = {
    "laptop": "laptops", "notebook": "laptops",
    "celular": "celulares", "smartphone": "celulares", "telefono": "celulares",
    "audifono": "audio", "parlante": "audio", "audio": "audio",
    "reloj": "wearables", "smartwatch": "wearables", "wearable": "wearables",
    "teclado": "perifericos", "mouse": "perifericos", "periferico": "perifericos",
    "tablet": "tablets",
    "case": "accesorios", "funda": "accesorios", "protector": "accesorios", "cargador": "accesorios",
    "bateria": "accesorios", "accesorio": "accesorios",
    "camara": "camaras",
}

# Palabras que no identifican un producto: no se buscan en los títulos.
PALABRAS_VACIAS = {
    "hola", "buenas", "buenos", "dias", "tardes", "gracias", "favor", "ayuda", "quiero", "quisiera", "busco",
    "necesito", "tienen", "tiene", "tengo", "para", "como", "cual", "cuales", "cuanto", "cuesta", "este", "esta",
    "estos", "estas", "sirve", "sirven", "precio", "precios", "comprar", "algun", "alguna", "sobre", "donde",
    "desde", "hasta", "pero", "porque", "compatible", "compatibles", "barato", "barata", "mejor", "nuevo", "nueva",
}


def texto(datos, campo):
    valor = datos.get(campo)
    return valor.strip() if isinstance(valor, str) else ""


def sin_tildes(valor):
    return "".join(c for c in unicodedata.normalize("NFD", valor.lower()) if unicodedata.category(c) != "Mn")


def usuario_opcional(event):
    # El chat es público: sin sesión, o con la sesión vencida, se responde como visitante.
    try:
        return usuario_actual(event)
    except ErrorApi:
        return None


def formatear_productos(filas):
    return [
        {
            "id": p["id"],
            "slug": p["slug"],
            "nombre": p["titulo"],
            "precio": p["precio_actual"],
            "stock": p["stock"],
            "imagen_url": p["imagen_url"] or IMAGEN_POR_DEFECTO,
        }
        for p in filas
    ]


def buscar_por_titulo(cursor, palabras):
    # El filtro solo repite "titulo LIKE %s"; las palabras van siempre como parámetros.
    filtro = " AND ".join(["titulo LIKE %s"] * len(palabras))
    cursor.execute(
        f"""
        SELECT TOP 3 id, slug, titulo, precio_actual, stock, imagen_url
        FROM productos
        WHERE activo = 1 AND stock > 0 AND {filtro}
        ORDER BY precio_actual
        """,
        tuple(f"%{palabra}%" for palabra in palabras),
    )
    return cursor.fetchall()


def buscar_por_categoria(cursor, slug):
    cursor.execute(
        """
        SELECT TOP 3 p.id, p.slug, p.titulo, p.precio_actual, p.stock, p.imagen_url, c.nombre AS categoria
        FROM productos p
        JOIN categorias c ON c.id = p.categoria_id
        WHERE c.slug = %s AND p.activo = 1 AND p.stock > 0
        ORDER BY p.precio_actual
        """,
        (slug,),
    )
    return cursor.fetchall()


def pedidos_recientes(cursor, usuario_id):
    cursor.execute(
        "SELECT TOP 3 id, codi, total FROM pedidos WHERE usuario_id = %s ORDER BY creado_en DESC, id DESC",
        (usuario_id,),
    )
    pedidos = cursor.fetchall()
    if not pedidos:
        return "Todavía no tienes pedidos en Malvitec."

    # El estado va por ítem, porque cada proveedor atiende los suyos.
    marcadores = ", ".join(["%s"] * len(pedidos))
    cursor.execute(
        f"SELECT pedido_id, titulo, estado FROM pedido_items WHERE pedido_id IN ({marcadores}) ORDER BY id",
        tuple(p["id"] for p in pedidos),
    )
    items = {}
    for item in cursor.fetchall():
        items.setdefault(item["pedido_id"], []).append(f"{item['titulo']} ({item['estado']})")

    lineas = [
        f"• Pedido {p['codi']} — Total: S/ {p['total']:.2f} — {', '.join(items.get(p['id'], []))}" for p in pedidos
    ]
    return "Tus pedidos más recientes:\n" + "\n".join(lineas)


def procesar_mensaje(cursor, mensaje, usuario):
    """Devuelve (respuesta, productos, puede_escalar)."""
    normalizado = sin_tildes(mensaje)

    # 1. Pedidos del usuario
    if any(palabra in normalizado for palabra in PALABRAS_PEDIDO):
        if not usuario:
            return ("Para consultar el estado de tus compras, inicia sesión primero.", [], False)
        return (pedidos_recientes(cursor, usuario["usuario_id"]), [], False)

    # 2. Productos cuyo título tiene todas las palabras del mensaje
    palabras = [
        palabra
        for palabra in re.findall(r"[a-z0-9áéíóúüñ]+", mensaje.lower())
        if (len(palabra) > 3 or any(c.isdigit() for c in palabra)) and sin_tildes(palabra) not in PALABRAS_VACIAS
    ][:6]
    if palabras:
        productos = buscar_por_titulo(cursor, palabras)
        if productos:
            return ("Encontré estos productos relacionados:", formatear_productos(productos), True)

    # 3. Categoría del catálogo
    for palabra, slug in CATEGORIAS.items():
        if palabra in normalizado:
            productos = buscar_por_categoria(cursor, slug)
            if productos:
                return (
                    f"Opciones disponibles en {productos[0]['categoria']}:",
                    formatear_productos(productos),
                    True,
                )

    # 4. Productos que tienen alguna de las palabras
    for palabra in palabras:
        productos = buscar_por_titulo(cursor, [palabra])
        if productos:
            return ("Encontré estos productos relacionados:", formatear_productos(productos), True)

    # 5. Sin respuesta. Una consulta va siempre a un producto, así que sin producto no hay a quién enviarla.
    return (
        "No encontré productos para tu consulta. Escribe el nombre o la categoría del producto "
        "(por ejemplo, «case iPhone 13» o «laptops») y podrás enviar tu pregunta a su proveedor. "
        "También puedo mostrarte tus pedidos.",
        [],
        False,
    )


def consultar(cursor, usuario, datos):
    mensaje = texto(datos, "mensaje")
    if not mensaje:
        raise ErrorApi(400, "El mensaje no puede estar vacío")
    if len(mensaje) > 500:
        raise ErrorApi(400, "El mensaje no puede tener más de 500 caracteres")

    respuesta_texto, productos, puede_escalar = procesar_mensaje(cursor, mensaje, usuario)
    return respuesta(
        200,
        {
            "respuesta": respuesta_texto,
            "productos": productos,
            "puede_escalar": puede_escalar,
            "pregunta_original": mensaje if puede_escalar else None,
        },
    )


def escalar(cursor, usuario_id, datos):
    """Guarda la pregunta en consultas, para que la responda el proveedor del producto."""
    pregunta = texto(datos, "pregunta")
    if not pregunta:
        raise ErrorApi(400, "Falta la pregunta")
    if len(pregunta) > 500:
        raise ErrorApi(400, "La pregunta no puede tener más de 500 caracteres")

    id_producto = datos.get("id_producto")
    if not isinstance(id_producto, int) or isinstance(id_producto, bool):
        raise ErrorApi(400, "Falta el producto de la consulta")

    cursor.execute("SELECT id FROM productos WHERE id = %s AND activo = 1", (id_producto,))
    if not cursor.fetchone():
        raise ErrorApi(404, "El producto no existe")

    cursor.execute(
        "INSERT INTO consultas (producto_id, usuario_id, mensaje) VALUES (%s, %s, %s)",
        (id_producto, usuario_id, pregunta),
    )
    return respuesta(
        201,
        {
            "mensaje": "Tu consulta quedó registrada. El proveedor del producto te responderá a la brevedad.",
            "escalado_exitoso": True,
        },
    )


@manejar
def lambda_handler(event, context):
    if metodo(event) != "POST" or parametro(event, "slug"):
        raise ErrorApi(404, "Ruta no encontrada")

    datos = cuerpo(event)
    accion = datos.get("accion", "consultar")

    if accion == "escalar":
        # Igual que en malvitec-consultas: solo los clientes preguntan a un proveedor.
        usuario_id = usuario_actual(event, "cliente")["usuario_id"]
        with conexion() as cursor:
            return escalar(cursor, usuario_id, datos)

    if accion != "consultar":
        raise ErrorApi(400, "Acción no válida")

    usuario = usuario_opcional(event)
    with conexion() as cursor:
        return consultar(cursor, usuario, datos)
