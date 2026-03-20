"""
commands.py — Comandos CLI de Flask para tareas de mantenimiento y carga de datos.

Registro de comandos disponibles:
    insert-test-users <count>   Crea N usuarios de prueba en la tabla User.
    insert-test-data            Placeholder para datos de prueba adicionales.
    import-centers              Importa centros sanitarios de Madrid desde datos.madrid.es.

Uso:
    pipenv run flask insert-test-users 5
    pipenv run flask import-centers
    pipenv run flask import-centers --clear
"""

import click
import requests
from sqlalchemy import text
from api.models import db, User, Center


# ── Constantes del comando import-centers ─────────────────────────────────────

#: URL del dataset "Sedes. Centros de Atención Médica" del Ayuntamiento de Madrid.
#: Formato JSON-LD (schema.org). Licencia CC-BY 4.0. Sin autenticación.
#: Fuente: https://datos.madrid.es/egob/catalogo/212769-0-atencion-medica.json
MADRID_CENTERS_URL = "https://datos.madrid.es/egob/catalogo/212769-0-atencion-medica.json"

#: Tipos de centro que se importan (comparación parcial en minúsculas).
#: Todos los tipos del dataset de datos.madrid.es son centros sanitarios,
#: así que se incluyen todos. Se mantiene la lista por si el dataset
#: incorpora nuevos tipos no médicos en el futuro.
TIPOS_RELEVANTES = {
    "centro de salud",
    "especialidades",
    "salud mental",
    "centro medico",
    "prevencion",
    "asistencia",
    "rehabilitacion",
    "hospital",
    "urgencias",
}


# ── Helpers privados ──────────────────────────────────────────────────────────

def _extract_phone(phone_raw):
    """
    Normaliza el campo 'phone' del JSON de datos.madrid.es.

    El campo puede llegar como string, dict con clave 'telephone',
    o lista de cualquiera de los anteriores.

    Args:
        phone_raw: Valor crudo del campo phone.

    Returns:
        str: Número de teléfono como cadena, o "" si no hay datos.
    """
    if not phone_raw:
        return ""
    if isinstance(phone_raw, str):
        return phone_raw.strip()
    if isinstance(phone_raw, dict):
        return str(phone_raw.get("telephone", "")).strip()
    if isinstance(phone_raw, list) and phone_raw:
        first = phone_raw[0]
        if isinstance(first, dict):
            return str(first.get("telephone", "")).strip()
        return str(first).strip()
    return str(phone_raw).strip()


def _extract_type(item):
    """
    Determina el tipo de centro a partir del campo '@type' del JSON-LD.

    datos.madrid.es usa URIs propias como '@type' (no schema.org):
        .../CentrosSalud                      -> Centro de Salud
        .../CentrosEspecialidadesMedicas       -> Especialidades
        .../CentrosSaludMental                 -> Salud Mental
        .../OtrosCentrosMedicos                -> Centro Medico
        .../CentrosPrevencionEnfermedades      -> Prevencion
        .../CentrosAsistenciaDrogodependientes -> Asistencia
        .../CentrosRehabilitacionPsicosocial   -> Rehabilitacion Psicosocial

    Se extrae el ultimo segmento de la URI (split por '/') y se busca
    en TYPE_MAP. Si no hay coincidencia, se devuelve el segmento tal
    cual, truncado a 79 caracteres.

    Args:
        item (dict): Elemento individual del array '@graph'.

    Returns:
        str: Tipo de centro legible (max. 79 caracteres).
    """
    # Mapeo del último segmento de la URI @type a etiqueta legible.
    # Fuente: datos.madrid.es usa URIs propias, no schema.org.
    TYPE_MAP = {
        # Segmentos reales del dataset de datos.madrid.es
        "centrossalud":                       "Centro de Salud",
        "centrosespecialidadesmedicas":        "Especialidades",
        "centrossaludmental":                  "Salud Mental",
        "otroscentrosmedicos":                 "Centro Medico",
        "centrosprevencionenfermedades":       "Prevencion",
        "centrosasistenciadrogodependientes":  "Asistencia",
        "centrosrehabilitacionpsicosocial":    "Rehabilitacion Psicosocial",
        # Fallback schema.org (por si el dataset cambia de formato)
        "hospital":            "Hospital",
        "medicalclinic":       "Centro de Salud",
        "emergencyservice":    "Urgencias",
        "medicalorganization": "Centro Sanitario",
    }

    raw_type = item.get("@type", "")
    if isinstance(raw_type, list) and raw_type:
        raw_type = raw_type[0]

    if isinstance(raw_type, str) and raw_type:
        # El valor puede ser:
        #   - prefijo schema.org:  "schema:Hospital"
        #   - URI completa:        "http://datos.madrid.es/.../Hospital"
        # En ambos casos, el tipo útil es el último segmento.
        label = raw_type.split("/")[-1].split(":")[-1].strip()
        return TYPE_MAP.get(label.lower(), label)[:79]

    return "Centro Sanitario"


def _build_center_dict(item):
    """
    Extrae y normaliza los campos de un elemento del @graph de datos.madrid.es.

    Mapea los campos del JSON al modelo Center:
        title                       → name
        address.street-address      → address
        address.postal-code         → zip_code
        phone / phone[].telephone   → phone
        @type (schema.org)          → type_center (via _extract_type)

    Args:
        item (dict): Elemento individual del array '@graph'.

    Returns:
        dict | None: Diccionario con claves {name, address, zip_code, phone, type_center},
                     o None si el elemento no tiene nombre válido.
    """
    name = item.get("title", "").strip()
    if not name:
        return None

    address_obj = item.get("address", {})
    if isinstance(address_obj, dict):
        address  = address_obj.get("street-address", "").strip()
        zip_code = address_obj.get("postal-code", "").strip()
    else:
        address  = ""
        zip_code = ""

    return {
        "name":        name,
        "address":     address,
        "zip_code":    zip_code,
        "phone":       _extract_phone(item.get("phone", "")),
        "type_center": _extract_type(item),
    }


def _is_relevant(type_center):
    """
    Decide si un tipo de centro es relevante para el sistema de citas.

    Compara en minúsculas y sin acentos aproximados contra TIPOS_RELEVANTES.
    Si el tipo es desconocido, se importa igualmente para no perder datos.

    Args:
        type_center (str): Tipo de centro tal como viene del JSON.

    Returns:
        bool: True si el centro debe importarse.
    """
    t = type_center.lower().strip()
    # Si no tiene tipo claro, lo importamos para no perder centros
    if not t or t == "centro sanitario":
        return True
    return any(relevante in t for relevante in TIPOS_RELEVANTES)


# ── Configuración de comandos ─────────────────────────────────────────────────

def setup_commands(app):
    """
    Registra todos los comandos CLI en la aplicación Flask.

    Se llama desde app.py en el proceso de arranque de la aplicación.
    Cada comando es accesible con: pipenv run flask <nombre-comando> [opciones]

    Args:
        app: Instancia de la aplicación Flask.
    """

    # ── insert-test-users ─────────────────────────────────────────────────────

    @app.cli.command("insert-test-users")
    @click.argument("count")
    def insert_test_users(count):
        """
        Crea N usuarios de prueba en la tabla User.

        Args:
            count (str): Número de usuarios a crear (se convierte a int).

        Uso:
            pipenv run flask insert-test-users 5
        """
        print("Creating test users")
        for x in range(1, int(count) + 1):
            user = User()
            user.email = "test_user" + str(x) + "@test.com"
            user.password = "123456"
            user.is_active = True
            db.session.add(user)
            db.session.commit()
            print("User: ", user.email, " created.")
        print("All test users created")

    # ── insert-test-data ──────────────────────────────────────────────────────

    @app.cli.command("insert-test-data")
    def insert_test_data():
        """
        Placeholder para insertar datos de prueba adicionales.

        Uso:
            pipenv run flask insert-test-data
        """
        pass

    # ── import-centers ────────────────────────────────────────────────────────

    @app.cli.command("import-centers")
    @click.option(
        "--clear",
        is_flag=True,
        default=False,
        help="Elimina todos los centros existentes antes de importar.",
    )
    def import_centers(clear):
        """
        Importa centros sanitarios de Madrid desde el portal de datos abiertos
        del Ayuntamiento de Madrid (datos.madrid.es).

        Fuente: dataset "Sedes. Centros de Atención Médica"
        Licencia: CC-BY 4.0 · Sin autenticación.

        Comportamiento:
            - Descarga el JSON-LD en tiempo real desde datos.madrid.es.
            - Filtra tipos de centro relevantes (hospitales, centros de salud,
              especialidades, urgencias, vacunación, salud mental...).
            - Omite centros que ya existan en la BD (mismo nombre + código postal)
              para permitir ejecuciones repetidas sin duplicados.
            - Con --clear, vacía la tabla centers antes de importar.

        Opciones:
            --clear     Trunca la tabla centers antes de importar.

        Uso:
            pipenv run flask import-centers
            pipenv run flask import-centers --clear
        """
        # ── 1. Limpiar si se solicita ──────────────────────────────────────────
        if clear:
            # Orden de borrado respetando FKs (hojas primero, raíz al final):
            #   1) clinical_records  → FK a appointments
            #   2) appointments      → FK a centers, doctors, patients
            #   3) centers           → tabla objetivo
            # Los doctores NO se tocan: su center_id es nullable y el
            # ON DELETE SET NULL de la FK los deja con center_id = NULL.
            db.session.execute(text("DELETE FROM clinical_records"))
            db.session.execute(text("DELETE FROM appointments"))
            db.session.execute(text("DELETE FROM centers"))
            db.session.execute(text(
                "ALTER SEQUENCE centers_id_seq RESTART WITH 1"
            ))
            db.session.commit()
            click.echo(
                "[CLEAR] clinical_records, citas y centros eliminados. "
                "Doctores y pacientes intactos."
            )

        # ── 2. Descargar JSON ──────────────────────────────────────────────────
        click.echo(f"[FETCH] Descargando datos desde:\n        {MADRID_CENTERS_URL}")
        try:
            response = requests.get(MADRID_CENTERS_URL, timeout=20)
            response.raise_for_status()
        except requests.exceptions.Timeout:
            click.echo("[ERROR] Tiempo de espera agotado al conectar con datos.madrid.es.")
            return
        except requests.exceptions.RequestException as e:
            click.echo(f"[ERROR] No se pudo descargar el dataset: {e}")
            return

        graph = response.json().get("@graph", [])
        click.echo(f"[FETCH] {len(graph)} registros recibidos.")

        # ── 3. Índice de centros existentes (nombre + zip) para deduplicar ────
        existing = {
            (c.name.lower(), c.zip_code)
            for c in Center.query.with_entities(Center.name, Center.zip_code).all()
        }

        # ── 4. Procesar e insertar ─────────────────────────────────────────────
        inserted = skipped_type = skipped_dup = errors = 0

        for item in graph:
            data = _build_center_dict(item)

            if data is None:
                errors += 1
                continue

            if not _is_relevant(data["type_center"]):
                skipped_type += 1
                continue

            key = (data["name"].lower(), data["zip_code"])
            if key in existing:
                skipped_dup += 1
                continue

            center = Center(
                name=data["name"],
                address=data["address"],
                zip_code=data["zip_code"],
                phone=data["phone"],
                type_center=data["type_center"],
            )
            db.session.add(center)
            existing.add(key)
            inserted += 1

        db.session.commit()

        # ── 5. Resumen ─────────────────────────────────────────────────────────
        sep = "-" * 56
        click.echo(f"\n{sep}")
        click.echo("  Resumen de importacion")
        click.echo(sep)
        click.echo(f"  Insertados:          {inserted}")
        click.echo(f"  Omitidos (duplicado):{skipped_dup}")
        click.echo(f"  Omitidos (tipo):     {skipped_type}")
        click.echo(f"  Sin nombre (error):  {errors}")
        click.echo(f"  Total procesados:    {len(graph)}")
        click.echo(sep)
        if inserted > 0:
            click.echo(f"[OK] {inserted} centros sanitarios importados correctamente.")
        else:
            click.echo("[OK] No se importaron centros nuevos (todos ya existian o fueron filtrados).")
