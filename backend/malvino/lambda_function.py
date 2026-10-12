import json
import os
import re
from malvitec_comun.conexion import obtener_conexion
from malvitec_comun.api import respuesta_exitosa, respuesta_error, respuesta_cors
from malvitec_comun.sesion import obtener_usuario_sesion

def lambda_handler(event, context):
    metodo = event.get('httpMethod', '')
    
    if metodo == 'OPTIONS':
        return respuesta_cors()

    if metodo != 'POST':
        return respuesta_error("Método no permitido", 405)

    try:
        cuerpo = json.loads(event.get('body') or '{}')
        mensaje_usuario = cuerpo.get('mensaje', '').strip()
        if not mensaje_usuario:
            return respuesta_error("El mensaje no puede estar vacío", 400)

        # Contexto de usuario (opcional si el token viene en headers)
        usuario = obtener_usuario_sesion(event)

        conn = obtener_conexion()
        cursor = conn.cursor(as_dict=True)

        respuesta_texto, productos_sugeridos = procesar_mensaje(cursor, mensaje_usuario, usuario)

        cursor.close()
        conn.close()

        return respuesta_exitosa({
            "respuesta": respuesta_texto,
            "productos": productos_sugeridos
        })

    except Exception as e:
        return respuesta_error(f"Error procesando la consulta: {str(e)}", 500)

def procesar_mensaje(cursor, mensaje, usuario):
    mensaje_lower = mensaje.lower()
    productos = []
    
    # 1. Caso: Consulta de estado de pedido (Usuario autenticado)
    if any(p in mensaje_lower for p in ['mi pedido', 'mis pedidos', 'estado de pedido', 'rastreo', 'orden']):
        if not usuario:
            return ("Para consultar el estado de tus compras, inicia sesión primero.", [])
        
        cursor.execute("""
            SELECT TOP 3 id_pedido, fecha_pedido, estado, total
            FROM Pedidos
            WHERE id_usuario = %s
            ORDER BY fecha_pedido DESC
        """, (usuario['id'],))
        pedidos = cursor.fetchall()
        
        if not pedidos:
            return ("No tienes pedidos registrados recientemente en Malvitec.", [])
        
        detalles = []
        for p in pedidos:
            detalles.append(f"• Pedido #{p['id_pedido']} ({p['estado']}) - Total: S/ {p['total']:.2f}")
        
        texto = "Tus pedidos más recientes:\n" + "\n".join(detalles)
        return (texto, [])

    # 2. Caso: Consulta / Recomendación de Componentes y Catálogo
    # Identificar categorías clave en el mensaje
    categorias_map = {
        'procesador': 'Procesadores',
        'cpu': 'Procesadores',
        'ryzen': 'Procesadores',
        'intel': 'Procesadores',
        'tarjeta de video': 'Tarjetas de Video',
        'grafica': 'Tarjetas de Video',
        'gpu': 'Tarjetas de Video',
        'rtx': 'Tarjetas de Video',
        'ram': 'Memorias RAM',
        'memoria': 'Memorias RAM',
        'placa': 'Placas Madre',
        'motherboard': 'Placas Madre',
        'fuente': 'Fuentes de Poder',
        'ssd': 'Almacenamiento',
        'disco': 'Almacenamiento'
    }

    categoria_busqueda = None
    for kw, cat in categorias_map.items():
        if kw in mensaje_lower:
            categoria_busqueda = cat
            break

    if categoria_busqueda:
        cursor.execute("""
            SELECT TOP 3 p.id_producto, p.nombre, p.precio, p.stock, p.imagen_url, c.nombre as categoria
            FROM Productos p
            INNER JOIN Categorias c ON p.id_categoria = c.id_categoria
            WHERE c.nombre = %s AND p.stock > 0 AND p.activo = 1
            ORDER BY p.precio ASC
        """, (categoria_busqueda,))
        productos = cursor.fetchall()

        if productos:
            return (
                f"Aquí tienes algunas opciones destacadas en {categoria_busqueda} disponibles en catálogo:",
                formatear_productos(productos)
            )

    # 3. Caso: Compatibilidad general
    if any(k in mensaje_lower for k in ['compatible', 'compatibilidad', 'armo pc', 'configuracion']):
        cursor.execute("""
            SELECT TOP 3 p.id_producto, p.nombre, p.precio, p.stock, p.imagen_url
            FROM Productos p
            WHERE p.stock > 0 AND p.activo = 1
            ORDER BY p.id_producto DESC
        """)
        productos = cursor.fetchall()
        return (
            "Para validar compatibilidad completa entre procesador, socket y motherboard, puedes revisar las especificaciones de cada pieza o agregar los componentes para tu configuración:",
            formatear_productos(productos)
        )

    # 4. Búsqueda por palabras sueltas en nombre de producto
    palabras = [w for w in re.findall(r'\w+', mensaje_lower) if len(w) > 3]
    if palabras:
        like_query = f"%{palabras[0]}%"
        cursor.execute("""
            SELECT TOP 3 id_producto, nombre, precio, stock, imagen_url
            FROM Productos
            WHERE nombre LIKE %s AND stock > 0 AND activo = 1
        """, (like_query,))
        productos = cursor.fetchall()
        if productos:
            return ("Encontré estos artículos relacionados con tu consulta:", formatear_productos(productos))

    # Respuesta por defecto
    saludo_nombre = f", {usuario.get('nombre')}" if usuario and 'nombre' in usuario else ""
    return (
        f"¡Hola{saludo_nombre}! Soy Malvino, tu asistente técnico. Puedo ayudarte a buscar componentes (procesadores, GPUs, RAMs), orientarte sobre compatibilidad o mostrarte el estado de tus pedidos.",
        []
    )

def formatear_productos(lista_sql):
    return [{
        "id": p['id_producto'],
        "nombre": p['nombre'],
        "precio": float(p['precio']),
        "stock": p['stock'],
        "imagen_url": p.get('imagen_url') or 'imagenes/malvitec-logo.png'
    } for p in lista_sql]