from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import date
import bcrypt

from api.models import Patient
from . import api


@api.route('/patients', methods=['GET'])
def get_all_patients():
    """Retorna la lista de todos los pacientes."""
    patients = Patient.all_patients()
    return jsonify([p.serialize() for p in patients]), 200


@api.route('/patient/<int:patient_id>', methods=['PUT'])
def update_patient(patient_id):
    """
    Actualiza datos básicos de un paciente por su ID (uso interno/admin).

    Campos editables: email, password, assign_doctor.

    Respuesta 200: datos actualizados (serialize).
    Errores:
        404 — paciente no encontrado.
    """
    patient = Patient.query.get(patient_id)
    if not patient:
        return jsonify({"error": "Paciente no encontrado."}), 404

    data    = request.get_json()
    updates = {}

    if 'password' in data:
        updates['password'] = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    if 'email' in data:
        updates['email'] = data['email']
    if 'assign_doctor' in data:
        updates['assign_doctor'] = data['assign_doctor']

    patient.update(**updates)
    return jsonify(patient.serialize()), 200


@api.route('/profile/patient', methods=['PUT'])
@jwt_required()
def update_patient_profile():
    """
    Actualiza el perfil del paciente autenticado.

    Requiere JWT. El paciente solo puede editar su propio perfil.

    Campos editables:
        email            (str)  : Nuevo email (opcional).
        birth_date       (str)  : Nueva fecha de nacimiento YYYY-MM-DD (opcional).
        current_password (str) + new_password (str): Ambos requeridos para cambiar contraseña.

    Respuesta 200: datos actualizados (serialize).
    Errores:
        400 — faltan campos para cambio de contraseña.
        401 — contraseña actual incorrecta.
        404 — paciente no encontrado.
        409 — el nuevo email ya está en uso.
    """
    patient_id = int(get_jwt_identity())
    patient    = Patient.query.get(patient_id)
    if not patient:
        return jsonify({"error": "Paciente no encontrado."}), 404

    data    = request.get_json()
    updates = {}

    if 'email' in data:
        new_email = data['email'].strip().lower()
        existing  = Patient.query.filter_by(email=new_email).first()
        if existing and existing.id != patient_id:
            return jsonify({"error": "Ese email ya está en uso."}), 409
        updates['email'] = new_email

    if 'birth_date' in data:
        updates['birth_date'] = date.fromisoformat(data['birth_date'])

    if 'new_password' in data or 'current_password' in data:
        current_pw = data.get('current_password', '')
        new_pw     = data.get('new_password', '')
        if not current_pw or not new_pw:
            return jsonify({"error": "Se requieren current_password y new_password."}), 400
        if not bcrypt.checkpw(current_pw.encode('utf-8'), patient.password.encode('utf-8')):
            return jsonify({"error": "La contraseña actual es incorrecta."}), 401
        updates['password'] = bcrypt.hashpw(new_pw.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    patient.update(**updates)
    return jsonify(patient.serialize()), 200


@api.route('/patient/<int:patient_id>/inactive_patient', methods=['PUT'])
def set_inactive(patient_id):
    """
    Desactiva (soft-delete) una cuenta de paciente.

    Respuesta 200: datos del paciente con is_active=False.
    Errores:
        404 — paciente no encontrado.
    """
    patient = Patient.query.get(patient_id)
    if not patient:
        return jsonify({"error": "Paciente no encontrado."}), 404
    patient.soft_delete()
    return jsonify(patient.serialize()), 200
