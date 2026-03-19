from flask import request, jsonify, Blueprint
from api.models import db, Patient, Doctor, Appointment, Center
from api.utils import APIException
from flask_cors import CORS
import bcrypt
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from datetime import datetime

api = Blueprint('api', __name__)
CORS(api)


# ── Pacientes ────────────────────────────────────────────────────────────────

@api.route('/patients', methods=['GET'])
def get_all_patients():
    patients = Patient.all_patients()
    return jsonify([p.serialize() for p in patients]), 200


@api.route('/register/patient', methods=['POST'])
def register_patient():
    data = request.get_json()
    email      = data.get("email")
    first_name = data.get("first_name")
    last_name  = data.get("last_name")
    birth_date = data.get("birth_date")
    password   = data.get("password")

    if not email or not password or not first_name or not last_name or not birth_date:
        return jsonify({"msg": "Todos los campos son requeridos."}), 400

    if Patient.query.filter_by(email=email).first():
        return jsonify({"msg": "Este usuario ya existe."}), 400

    from datetime import date
    try:
        birth_date = date.fromisoformat(birth_date)
    except ValueError:
        return jsonify({"msg": "Formato de fecha inválido. Use YYYY-MM-DD."}), 400

    hashed = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    new_patient = Patient.create(
        email=email,
        first_name=first_name,
        last_name=last_name,
        birth_date=birth_date,
        password=hashed,
        assign_doctor=data.get("assign_doctor", None)
    )
    return jsonify(new_patient.serialize()), 201


@api.route('/login/patient', methods=['POST'])
def login_patient():
    data     = request.get_json()
    email    = data.get("email")
    password = data.get("password")

    user = Patient.query.filter_by(email=email).first()
    if not user or not bcrypt.checkpw(password.encode("utf-8"), user.password.encode("utf-8")):
        return jsonify({"msg": "Credenciales incorrectas"}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user_id": user.id, "role": "paciente"}), 200


@api.route('/protected/patient', methods=['GET'])
@jwt_required()
def protected_patient():
    user_id = int(get_jwt_identity())
    user = Patient.query.get(user_id)
    if not user:
        return jsonify({"msg": "Paciente no encontrado"}), 404
    return jsonify(user.serialize()), 200


@api.route('/patient/<int:patient_id>', methods=['PUT'])
def update_patient(patient_id):
    patient = Patient.query.get(patient_id)
    if not patient:
        return jsonify({"error": "Paciente no encontrado"}), 404

    data = request.get_json()
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

    Requiere JWT. Obtiene el ID del paciente desde el token,
    por lo que un paciente solo puede editar su propio perfil.

    Campos editables:
        - email       (str)  : nuevo email (opcional).
        - birth_date  (str)  : nueva fecha de nacimiento en formato YYYY-MM-DD (opcional).
        - current_password (str) + new_password (str): para cambiar contraseña (ambos requeridos juntos).

    Respuesta 200: datos del paciente actualizados (serialize).
    Errores:
        400 — faltan campos obligatorios para cambio de contraseña.
        401 — contraseña actual incorrecta.
        404 — paciente no encontrado.
        409 — el nuevo email ya está en uso.
    """
    patient_id = int(get_jwt_identity())
    patient = Patient.query.get(patient_id)
    if not patient:
        return jsonify({"error": "Paciente no encontrado"}), 404

    data = request.get_json()
    updates = {}

    # ── Cambio de email ────────────────────────────────────────────────────────
    if 'email' in data:
        new_email = data['email'].strip().lower()
        existing = Patient.query.filter_by(email=new_email).first()
        if existing and existing.id != patient_id:
            return jsonify({"error": "Ese email ya está en uso."}), 409
        updates['email'] = new_email

    # ── Cambio de fecha de nacimiento ──────────────────────────────────────────
    if 'birth_date' in data:
        from datetime import date
        updates['birth_date'] = date.fromisoformat(data['birth_date'])

    # ── Cambio de contraseña ───────────────────────────────────────────────────
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
    patient = Patient.query.get(patient_id)
    if not patient:
        return jsonify({"error": "Paciente no encontrado"}), 404
    patient.soft_delete()
    return jsonify(patient.serialize()), 200


# ── Médicos ───────────────────────────────────────────────────────────────────

@api.route('/doctors', methods=['GET'])
def get_all_doctors():
    doctors = Doctor.all_doctors()
    return jsonify([d.serialize() for d in doctors]), 200


@api.route('/doctors/<int:doctor_id>', methods=['GET'])
def get_doctor(doctor_id):
    doctor = Doctor.query.get(doctor_id)
    if not doctor:
        return jsonify({"error": "Médico no encontrado"}), 404
    return jsonify(doctor.serialize()), 200


@api.route('/register/doctor', methods=['POST'])
def register_doctor():
    data       = request.get_json()
    email      = data.get("email")
    first_name = data.get("first_name")
    last_name  = data.get("last_name")
    password   = data.get("password")
    specialty  = data.get("specialty", "General")
    work_days  = data.get("work_days", 5)
    center_id  = data.get("center_id", None)

    if not email or not password or not first_name or not last_name:
        return jsonify({"msg": "email, password, nombre y apellido son requeridos."}), 400

    if Doctor.query.filter_by(email=email).first():
        return jsonify({"msg": "Este usuario ya existe."}), 400

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
    data     = request.get_json()
    email    = data.get("email")
    password = data.get("password")

    user = Doctor.query.filter_by(email=email).first()
    if not user or not bcrypt.checkpw(password.encode("utf-8"), user.password.encode("utf-8")):
        return jsonify({"msg": "Credenciales incorrectas"}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user_id": user.id, "role": "doctor"}), 200


@api.route('/protected/doctor', methods=['GET'])
@jwt_required()
def protected_doctor():
    user_id = int(get_jwt_identity())
    user = Doctor.query.get(user_id)
    if not user:
        return jsonify({"msg": "Médico no encontrado"}), 404
    return jsonify(user.serialize()), 200


@api.route('/profile/doctor', methods=['PUT'])
@jwt_required()
def update_doctor_profile():
    """
    Actualiza el perfil del médico autenticado.

    Requiere JWT. Obtiene el ID del médico desde el token,
    por lo que un médico solo puede editar su propio perfil.

    Campos editables:
        - email     (str) : nuevo email (opcional).
        - specialty (str) : nueva especialidad (opcional).
        - work_days (int) : días de trabajo por semana, entre 1 y 7 (opcional).
        - current_password (str) + new_password (str): para cambiar contraseña (ambos requeridos juntos).

    Respuesta 200: datos del médico actualizados (serialize).
    Errores:
        400 — work_days fuera de rango o faltan campos para cambio de contraseña.
        401 — contraseña actual incorrecta.
        404 — médico no encontrado.
        409 — el nuevo email ya está en uso.
    """
    doctor_id = int(get_jwt_identity())
    doctor = Doctor.query.get(doctor_id)
    if not doctor:
        return jsonify({"error": "Médico no encontrado"}), 404

    data = request.get_json()
    updates = {}

    # ── Cambio de email ────────────────────────────────────────────────────────
    if 'email' in data:
        new_email = data['email'].strip().lower()
        existing = Doctor.query.filter_by(email=new_email).first()
        if existing and existing.id != doctor_id:
            return jsonify({"error": "Ese email ya está en uso."}), 409
        updates['email'] = new_email

    # ── Cambio de especialidad ─────────────────────────────────────────────────
    if 'specialty' in data:
        updates['specialty'] = data['specialty'].strip()

    # ── Cambio de días de trabajo ──────────────────────────────────────────────
    if 'work_days' in data:
        work_days = int(data['work_days'])
        if not 1 <= work_days <= 7:
            return jsonify({"error": "work_days debe estar entre 1 y 7."}), 400
        updates['work_days'] = work_days

    # ── Cambio de contraseña ───────────────────────────────────────────────────
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


@api.route('/doctor/<int:doctor_id>', methods=['PUT'])
def update_doctor(doctor_id):
    doctor = Doctor.query.get(doctor_id)
    if not doctor:
        return jsonify({"error": "Médico no encontrado"}), 404

    data = request.get_json()
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


# ── Citas ─────────────────────────────────────────────────────────────────────

@api.route('/appointments/patient', methods=['GET'])
@jwt_required()
def get_patient_appointments():
    patient_id = int(get_jwt_identity())
    appointments = Appointment.query.filter_by(patient_id=patient_id).all()
    return jsonify([a.serialize() for a in appointments]), 200


@api.route('/appointments/doctor', methods=['GET'])
@jwt_required()
def get_doctor_appointments():
    doctor_id = int(get_jwt_identity())
    appointments = Appointment.query.filter_by(doctor_id=doctor_id).all()
    return jsonify([a.serialize() for a in appointments]), 200


@api.route('/appointment', methods=['POST'])
@jwt_required()
def create_appointment():
    data             = request.get_json()
    doctor_id        = data.get("doctor_id")
    center_id        = data.get("center_id")
    appointment_date = data.get("appointment_date")
    patient_id       = int(get_jwt_identity())

    if not doctor_id or not appointment_date:
        return jsonify({"msg": "doctor_id y appointment_date son requeridos"}), 400

    appointment_dt = datetime.strptime(appointment_date, "%d-%m-%Y %H:%M")

    # Si no se envió center_id, usar el centro del médico seleccionado.
    # Fallback al centro 1 (temporal hasta implementar selección de centro).
    if not center_id:
        doctor = Doctor.query.get(doctor_id)
        center_id = doctor.center_id if doctor and doctor.center_id else 1

    new_appointment = Appointment.create(
        doctor_id=doctor_id,
        patient_id=patient_id,
        center_id=center_id,
        appointment_date=appointment_dt,
    )
    return jsonify(new_appointment.serialize()), 201


@api.route('/appointment/<int:appointment_id>', methods=['PUT'])
def update_appointment(appointment_id):
    appt = Appointment.query.get(appointment_id)
    if not appt:
        return jsonify({"error": "Cita no encontrada"}), 404

    data = request.get_json()
    updates = {}

    if 'appointment_date' in data:
        updates['appointment_date'] = datetime.strptime(data['appointment_date'], "%d-%m-%Y %H:%M")
    if 'status' in data:
        updates['status'] = data['status']

    appt.update(**updates)
    return jsonify(appt.serialize()), 200


@api.route('/appointment/<int:appointment_id>/cancel', methods=['PUT'])
def cancel_appointment(appointment_id):
    appt = Appointment.query.get(appointment_id)
    if not appt:
        return jsonify({"error": "Cita no encontrada"}), 404
    appt.cancel()
    return jsonify(appt.serialize()), 200


@api.route('/appointment/<int:appointment_id>/complete', methods=['PUT'])
@jwt_required()
def complete_appointment(appointment_id):
    """
    Marca una cita como completada.

    Solo el médico asignado a la cita puede completarla.
    La cita debe estar en estado 'Pending'.

    Requiere JWT de médico.

    Respuesta 200: cita actualizada (serialize).
    Errores:
        404 — cita no encontrada.
        403 — la cita no pertenece al médico autenticado.
        409 — la cita no está en estado Pending.
    """
    doctor_id = int(get_jwt_identity())
    appt = Appointment.query.get(appointment_id)

    if not appt:
        return jsonify({"error": "Cita no encontrada."}), 404

    if appt.doctor_id != doctor_id:
        return jsonify({"error": "No tenés permiso para modificar esta cita."}), 403

    if appt.status != "Pending":
        return jsonify({"error": f"La cita ya está en estado '{appt.status}'."}), 409

    appt.update(status="Completed")
    return jsonify(appt.serialize()), 200


# ── Centros ───────────────────────────────────────────────────────────────────

@api.route('/centers', methods=['GET'])
def get_all_centers():
    centers = Center.query.all()
    return jsonify([c.serialize() for c in centers]), 200


@api.route('/center_register', methods=['POST'])
def create_center():
    data = request.get_json()
    new_center = Center.create(
        name=data.get("name"),
        address=data.get("address"),
        zip_code=data.get("zip_code"),
        phone=data.get("phone"),
        type_center=data.get("type_center"),
    )
    return jsonify(new_center.serialize()), 201
