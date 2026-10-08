"""Token de sesión (JWT). La clave para firmarlo va en la variable de entorno JWT_SECRETO."""

import os
from datetime import datetime, timedelta, timezone

import jwt

from .api import ErrorApi, encabezado

ALGORITMO = "HS256"
HORAS_DE_SESION = 8


def crear_token(usuario_id, rol):
    datos = {
        "usuario_id": usuario_id,
        "rol": rol,
        "exp": datetime.now(timezone.utc) + timedelta(hours=HORAS_DE_SESION),
    }
    return jwt.encode(datos, os.environ["JWT_SECRETO"], algorithm=ALGORITMO)


def usuario_actual(event, rol=None):
    """Devuelve usuario_id y rol del token. Responde 401 sin sesión y 403 si el rol no coincide."""
    autorizacion = encabezado(event, "Authorization") or ""
    tipo, _, token = autorizacion.partition(" ")
    if tipo.lower() != "bearer" or not token.strip():
        raise ErrorApi(401, "Debes iniciar sesión")

    try:
        datos = jwt.decode(token.strip(), os.environ["JWT_SECRETO"], algorithms=[ALGORITMO])
        usuario = {"usuario_id": int(datos["usuario_id"]), "rol": datos["rol"]}
    except jwt.ExpiredSignatureError:
        raise ErrorApi(401, "La sesión venció, vuelve a iniciar sesión")
    except (jwt.InvalidTokenError, KeyError, TypeError, ValueError):
        raise ErrorApi(401, "Sesión no válida")

    if rol and usuario["rol"] != rol:
        raise ErrorApi(403, "No tienes permiso para esta acción")
    return usuario
