from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
import bcrypt

from api.models import Doctor, Center
from . import api


@api.route('/doctors', methods=['GET'])
def get_all_doctors():
    """Retorna la lista de todos los médicos."""
    doctors = Doctor.all_doctors()
    return jsonify([d.serialize() for d in doctors]), 200


@api.route('/doctors/<int:doctor_id>', methods=['GET'])
def get_doctor(doctor_id):
    """
    Retorna los datos de un médico por su ID.

    Respuesta 200: datos del médico (serialize).
    Errores:
        404 — médico no encontrado.
    """
    doctor = Doctor.query.get(doctor_id)
    if not doctor:
        return jsonify({"error": "Médico no encontrado."}), 404
    return jsonify(doctor.serialize()), 200


@api.route('/doctor/<int:doctor_id>', methods=['PUT'])
def update_doctor(doctor_id):
    """
    Actualiza datos básicos de un médico por su ID (uso interno/admin).

    Campos editables: email, password, work_days, center_id.

    Respuesta 200: datos actualizados (serialize).
    Errores:
        404 — médico no encontrado.
    """
    doctor = Doctor.query.get(doctor_id)
    if not doctor:
        return jsonify({"error": "Médico no encontrado."}), 404

    data    = request.get_json()
    updates = {}

    if 'password' in data:
        updates['password'] = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    if 'email' in data:
        updates['email'] = data['email']
    if 'work_days' in data:
        updates['work_days'] = data['work_days']
    if 'center_id' in data:
        updates['center_id'] = data['center_id']

    doctor.update(**updates)
    return jsonify(doctor.serialize()), 200


@api.route('/profile/doctor', methods=['PUT'])
@jwt_required()
def update_doctor_profile():
    """
    Actualiza el perfil del médico autenticado.

    Requiere JWT. El médico solo puede editar su propio perfil.

    Campos editables:
        email            (str)      : Nuevo email (opcional).
        specialty        (str)      : Nueva especialidad (opcional).
        center_id        (int|null) : ID del centro de trabajo, null para desasignar (opcional).
        work_days        (int)      : Días de trabajo por semana, entre 1 y 7 (opcional).
        current_password (str) + new_password (str): Ambos requeridos para cambiar contraseña.

    Respuesta 200: datos actualizados (serialize).
    Errores:
        400 — work_days fuera de rango o faltan campos para cambio de contraseña.
        401 — contraseña actual incorrecta.
        404 — médico o centro no encontrado.
        409 — el nuevo email ya está en uso.
    """
    doctor_id = int(get_jwt_identity())
    doctor    = Doctor.query.get(doctor_id)
    if not doctor:
        return jsonify({"error": "Médico no encontrado."}), 404

    data    = request.get_json()
    updates = {}

    if 'email' in data:
        new_email = data['email'].strip().lower()
        existing  = Doctor.query.filter_by(email=new_email).first()
        if existing and existing.id != doctor_id:
            return jsonify({"error": "Ese email ya está en uso."}), 409
        updates['email'] = new_email

    if 'specialty' in data:
        updates['specialty'] = data['specialty'].strip()

    if 'center_id' in data:
        center_id_val = data['center_id']
        if center_id_val is not None:
            center = Center.query.get(center_id_val)
            if not center:
                return jsonify({"error": "Centro no encontrado."}), 404
        updates['center_id'] = center_id_val

    if 'work_days' in data:
        work_days = int(data['work_days'])
        if not 1 <= work_days <= 7:
            return jsonify({"error": "work_days debe estar entre 1 y 7."}), 400
        updates['work_days'] = work_days

    if 'new_password' in data or 'current_password' in data:
        current_pw = data.get('current_password', '')
        new_pw     = data.get('new_password', '')
        if not current_pw or not new_pw:
            return jsonify({"error": "Se requieren current_password y new_password."}), 400
        if not bcrypt.checkpw(current_pw.encode('utf-8'), doctor.password.encode('utf-8')):
            return jsonify({"error": "La contraseña actual es incorrecta."}), 401
        updates['password'] = bcrypt.hashpw(new_pw.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    doctor.update(**updates)
    return jsonify(doctor.serialize()), 200
