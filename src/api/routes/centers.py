from flask import request, jsonify

from api.models import Center
from . import api


@api.route('/centers', methods=['GET'])
def get_all_centers():
    """Retorna la lista de todos los centros médicos."""
    centers = Center.query.all()
    return jsonify([c.serialize() for c in centers]), 200


@api.route('/center_register', methods=['POST'])
def create_center():
    """
    Crea un nuevo centro médico.

    Body JSON:
        name        (str) : Nombre del centro.
        address     (str) : Dirección física.
        zip_code    (str) : Código postal.
        phone       (str) : Teléfono de contacto.
        type_center (str) : Tipo de centro (ej: "Hospital", "Clínica").

    Respuesta 201: centro creado (serialize).
    """
    data       = request.get_json()
    new_center = Center.create(
        name=data.get("name"),
        address=data.get("address"),
        zip_code=data.get("zip_code"),
        phone=data.get("phone"),
        type_center=data.get("type_center"),
    )
    return jsonify(new_center.serialize()), 201
