"""Conexión a SQL Server. Los datos de acceso salen de las variables de entorno de la Lambda."""

import os
from contextlib import contextmanager

import pymssql


@contextmanager
def conexion():
    """Cursor con filas como diccionario. Confirma al salir del bloque y deshace si hubo un error."""
    # Una variable creada pero vacía, o con espacios de más, cuenta como no definida.
    datos = {
        "server": os.environ["BD_SERVIDOR"].strip(),
        "port": os.environ.get("BD_PUERTO", "").strip() or "1433",
        "database": os.environ.get("BD_NOMBRE", "").strip() or "malvitec",
        "as_dict": True,
        "charset": "UTF-8",
        "login_timeout": 5,
        "timeout": 10,
    }
    # Sin usuario, pymssql entra con la cuenta de Windows (solo sirve en local).
    if os.environ.get("BD_USUARIO"):
        datos["user"] = os.environ["BD_USUARIO"]
        datos["password"] = os.environ.get("BD_CONTRASENA", "")

    con = pymssql.connect(**datos)
    try:
        yield con.cursor()
        con.commit()
    except Exception:
        con.rollback()
        raise
    finally:
        con.close()
