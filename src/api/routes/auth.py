from flask import request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from datetime import date
import bcrypt

from api.models import Patient, Doctor
from . import api


# ── Autenticación de pacientes ────────────────────────────────────────────────

@api.route('/register/patient', methods=['POST'])
def register_patient():
    """
    Registra un nuevo paciente.

    Body JSON:
        email      (str)  : Email único.
        password   (str)  : Contraseña en texto plano (se hashea aquí).
        first_name (str)  : Nombre.
        last_name  (str)  : Apellido.
        birth_date (str)  : Fecha de nacimiento en formato YYYY-MM-DD.

    Respuesta 201: datos del paciente creado (serialize).
    Errores:
        400 — campos faltantes o formato de fecha inválido.
        400 — email ya registrado.
    """
    data       = request.get_json()
    email      = data.get("email")
    first_name = data.get("first_name")
    last_name  = data.get("last_name")
    birth_date = data.get("birth_date")
    password   = data.get("password")

    if not email or not password or not first_name or not last_name or not birth_date:
        return jsonify({"error": "Todos los campos son requeridos."}), 400

    if Patient.query.filter_by(email=email).first():
        return jsonify({"error": "Este email ya está registrado."}), 400

    try:
        birth_date = date.fromisoformat(birth_date)
    except ValueError:
        return jsonify({"error": "Formato de fecha inválido. Use YYYY-MM-DD."}), 400

    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    new_patient = Patient.create(
        email=email,
        first_name=first_name,
        last_name=last_name,
        birth_date=birth_date,
        password=hashed,
        assign_doctor=data.get("assign_doctor", None),
    )
    return jsonify(new_patient.serialize()), 201


@api.route('/login/patient', methods=['POST'])
def login_patient():
    """
    Autentica a un paciente y devuelve un JWT.

    Body JSON:
        email    (str) : Email del paciente.
        password (str) : Contraseña en texto plano.

    Respuesta 200: { token, user_id, role }.
    Errores:
        401 — credenciales incorrectas.
    """
    data     = request.get_json()
    email    = data.get("email")
    password = data.get("password")

    user = Patient.query.filter_by(email=email).first()
    if not user or not bcrypt.checkpw(password.encode("utf-8"), user.password.encode("utf-8")):
        return jsonify({"error": "Credenciales incorrectas."}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user_id": user.id, "role": "paciente"}), 200


@api.route('/protected/patient', methods=['GET'])
@jwt_required()
def protected_patient():
    """
    Devuelve los datos del paciente autenticado.

    Requiere JWT de paciente.

    Respuesta 200: datos del paciente (serialize).
    Errores:
        404 — paciente no encontrado.
    """
    user_id = int(get_jwt_identity())
    user = Patient.query.get(user_id)
    if not user:
        return jsonify({"error": "Paciente no encontrado."}), 404
    return jsonify(user.serialize()), 200


# ── Autenticación de médicos ──────────────────────────────────────────────────

@api.route('/register/doctor', methods=['POST'])
def register_doctor():
    """
    Registra un nuevo médico.

    Body JSON:
        email      (str)      : Email único.
        password   (str)      : Contraseña en texto plano (se hashea aquí).
        first_name (str)      : Nombre.
        last_name  (str)      : Apellido.
        specialty  (str)      : Especialidad médica (por defecto "General").
        work_days  (int)      : Días laborables por semana (por defecto 5).
        center_id  (int|null) : ID del centro médico (opcional).

    Respuesta 201: datos del médico creado (serialize).
    Errores:
        400 — campos faltantes.
        400 — email ya registrado.
    """
    data       = request.get_json()
    email      = data.get("email")
    first_name = data.get("first_name")
    last_name  = data.get("last_name")
    password   = data.get("password")
    specialty  = data.get("specialty", "General")
    work_days  = data.get("work_days", 5)
    center_id  = data.get("center_id", None)

    if not email or not password or not first_name or not last_name:
        return jsonify({"error": "email, password, nombre y apellido son requeridos."}), 400

    if Doctor.query.filter_by(email=email).first():
        return jsonify({"error": "Este email ya está registrado."}), 400

    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    new_doctor = Doctor.create(
        email=email,
        first_name=first_name,
        last_name=last_name,
        specialty=specialty,
        center_id=center_id,
        work_days=work_days,
        password=hashed,
    )
    return jsonify(new_doctor.serialize()), 201


@api.route('/login/doctor', methods=['POST'])
def login_doctor():
    """
    Autentica a un médico y devuelve un JWT.

    Body JSON:
        email    (str) : Email del médico.
        password (str) : Contraseña en texto plano.

    Respuesta 200: { token, user_id, role }.
    Errores:
        401 — credenciales incorrectas.
    """
    data     = request.get_json()
    email    = data.get("email")
    password = data.get("password")

    user = Doctor.query.filter_by(email=email).first()
    if not user or not bcrypt.checkpw(password.encode("utf-8"), user.password.encode("utf-8")):
        return jsonify({"error": "Credenciales incorrectas."}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user_id": user.id, "role": "doctor"}), 200


@api.route('/protected/doctor', methods=['GET'])
@jwt_required()
def protected_doctor():
    """
    Devuelve los datos del médico autenticado.

    Requiere JWT de médico.

    Respuesta 200: datos del médico (serialize).
    Errores:
        404 — médico no encontrado.
    """
    user_id = int(get_jwt_identity())
    user = Doctor.query.get(user_id)
    if not user:
        return jsonify({"error": "Médico no encontrado."}), 404
    return jsonify(user.serialize()), 200
