from flask import request, jsonify, Blueprint
from api.models import db, Patient, Doctor, Appointment, Center, Prescription, ClinicalRecord
from api.utils import APIException
from flask_cors import CORS
import bcrypt
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from datetime import datetime
import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

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
        - email      (str)      : nuevo email (opcional).
        - specialty  (str)      : nueva especialidad (opcional).
        - center_id  (int|null) : ID del centro donde trabaja (opcional).
        - work_days  (int)      : días de trabajo por semana, entre 1 y 7 (opcional).
        - current_password (str) + new_password (str): para cambiar contraseña (ambos requeridos juntos).

    Respuesta 200: datos del médico actualizados (serialize).
    Errores:
        400 — work_days fuera de rango o faltan campos para cambio de contraseña.
        401 — contraseña actual incorrecta.
        404 — médico o centro no encontrado.
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

    # ── Cambio de centro de trabajo ───────────────────────────────────────────
    if 'center_id' in data:
        center_id_val = data['center_id']
        if center_id_val is not None:
            center = Center.query.get(center_id_val)
            if not center:
                return jsonify({"error": "Centro no encontrado."}), 404
        updates['center_id'] = center_id_val

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
@jwt_required()
def cancel_appointment(appointment_id):
    """
    Cancela una cita médica.

    Solo el paciente dueño de la cita puede cancelarla.
    La cita debe estar en estado 'Pending'.

    Requiere JWT de paciente.

    Respuesta 200: cita actualizada (serialize).
    Errores:
        404 — cita no encontrada.
        403 — la cita no pertenece al paciente autenticado.
        409 — la cita no está en estado Pending.
    """
    patient_id = int(get_jwt_identity())
    appt = Appointment.query.get(appointment_id)

    if not appt:
        return jsonify({"error": "Cita no encontrada."}), 404

    if appt.patient_id != patient_id:
        return jsonify({"error": "No tenés permiso para cancelar esta cita."}), 403

    if appt.status != "Pending":
        return jsonify({"error": f"La cita ya está en estado '{appt.status}' y no puede cancelarse."}), 409

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


# ── Pacientes del médico ──────────────────────────────────────────────────────

@api.route('/doctor/patients', methods=['GET'])
@jwt_required()
def get_doctor_patients():
    """
    Retorna la lista de pacientes únicos que tienen al menos una cita
    con el médico autenticado.

    Requiere JWT de médico.

    Respuesta 200: lista de pacientes (serialize).
    """
    doctor_id = int(get_jwt_identity())
    patient_ids = (
        db.session.query(Appointment.patient_id)
        .filter_by(doctor_id=doctor_id)
        .distinct()
        .all()
    )
    patient_ids = [pid[0] for pid in patient_ids]
    patients = Patient.query.filter(Patient.id.in_(patient_ids)).all()
    return jsonify([p.serialize() for p in patients]), 200


# ── Prescripciones ───────────────────────────────────────────────────────────

def send_prescription_email(patient_email, patient_name, doctor_name, medication, dosage, instructions):
    """
    Intenta enviar la receta al email del paciente.
    Retorna True si se envió, False si no hay credenciales o si ocurre un error.
    Las variables de entorno MAIL_USERNAME y MAIL_PASSWORD deben estar configuradas.
    """
    mail_user = os.environ.get("MAIL_USERNAME")
    mail_pass = os.environ.get("MAIL_PASSWORD")
    mail_server = os.environ.get("MAIL_SERVER", "smtp.gmail.com")
    mail_port = int(os.environ.get("MAIL_PORT", 587))

    if not mail_user or not mail_pass:
        print("[EMAIL] Sin credenciales configuradas. El email no fue enviado.")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Tu receta médica — GG Salud"
        msg["From"] = mail_user
        msg["To"] = patient_email

        body_text = (
            f"Hola {patient_name},\n\n"
            f"El/La Dr/a. {doctor_name} te ha emitido la siguiente receta:\n\n"
            f"Medicamento: {medication}\n"
            f"Dosis: {dosage}\n"
            f"Instrucciones: {instructions or 'Sin indicaciones adicionales.'}\n\n"
            f"GG Salud — Sistema de gestión médica"
        )

        body_html = f"""
        <html><body>
        <h2 style="color:#20B2AA;">Receta Médica — GG Salud</h2>
        <p>Hola <strong>{patient_name}</strong>,</p>
        <p>El/La <strong>Dr/a. {doctor_name}</strong> te ha emitido la siguiente receta:</p>
        <table style="border-collapse:collapse; width:100%; max-width:500px;">
            <tr><td style="padding:8px; background:#f0fafa; font-weight:bold;">Medicamento</td>
                <td style="padding:8px; border-bottom:1px solid #eee;">{medication}</td></tr>
            <tr><td style="padding:8px; background:#f0fafa; font-weight:bold;">Dosis</td>
                <td style="padding:8px; border-bottom:1px solid #eee;">{dosage}</td></tr>
            <tr><td style="padding:8px; background:#f0fafa; font-weight:bold;">Instrucciones</td>
                <td style="padding:8px;">{instructions or 'Sin indicaciones adicionales.'}</td></tr>
        </table>
        <br/><p style="color:#888; font-size:12px;">GG Salud — Sistema de gestión médica</p>
        </body></html>
        """

        msg.attach(MIMEText(body_text, "plain"))
        msg.attach(MIMEText(body_html, "html"))

        with smtplib.SMTP(mail_server, mail_port) as server:
            server.starttls()
            server.login(mail_user, mail_pass)
            server.sendmail(mail_user, patient_email, msg.as_string())

        print(f"[EMAIL] Receta enviada a {patient_email}")
        return True

    except Exception as e:
        print(f"[EMAIL] Error al enviar email: {e}")
        return False


@api.route('/prescription', methods=['POST'])
@jwt_required()
def create_prescription():
    """
    Crea una nueva receta médica y la envía por email al paciente (si hay credenciales).

    Requiere JWT de médico.

    Body JSON:
        patient_id   (int) : ID del paciente.
        medication   (str) : Nombre del medicamento.
        dosage       (str) : Dosis.
        instructions (str) : Instrucciones opcionales.

    Respuesta 201: receta creada + email_sent (bool).
    Errores:
        400 — faltan campos requeridos.
        404 — paciente no encontrado.
    """
    doctor_id = int(get_jwt_identity())
    doctor = Doctor.query.get(doctor_id)
    if not doctor:
        return jsonify({"error": "Médico no encontrado"}), 404

    data = request.get_json()
    patient_id   = data.get("patient_id")
    medication   = data.get("medication", "").strip()
    dosage       = data.get("dosage", "").strip()
    instructions = data.get("instructions", "").strip() or None

    if not patient_id or not medication or not dosage:
        return jsonify({"error": "patient_id, medication y dosage son requeridos."}), 400

    patient = Patient.query.get(patient_id)
    if not patient:
        return jsonify({"error": "Paciente no encontrado"}), 404

    prescription = Prescription.create(
        doctor_id=doctor_id,
        patient_id=patient_id,
        medication=medication,
        dosage=dosage,
        instructions=instructions,
    )

    email_sent = send_prescription_email(
        patient_email=patient.email,
        patient_name=f"{patient.first_name} {patient.last_name}",
        doctor_name=f"{doctor.first_name} {doctor.last_name}",
        medication=medication,
        dosage=dosage,
        instructions=instructions,
    )

    return jsonify({**prescription.serialize(), "email_sent": email_sent}), 201


@api.route('/my/prescriptions', methods=['GET'])
@jwt_required()
def get_my_prescriptions():
    """
    Retorna todas las recetas del paciente autenticado (de cualquier médico).

    Requiere JWT de paciente.

    Respuesta 200: lista de recetas (serialize), ordenadas de más reciente a más antigua.
    """
    patient_id = int(get_jwt_identity())
    prescriptions = (
        Prescription.query
        .filter_by(patient_id=patient_id)
        .order_by(Prescription.created_at.desc())
        .all()
    )
    return jsonify([p.serialize() for p in prescriptions]), 200


@api.route('/patient/<int:patient_id>/prescriptions', methods=['GET'])
@jwt_required()
def get_patient_prescriptions(patient_id):
    """
    Retorna las recetas emitidas para un paciente por el médico autenticado.

    Requiere JWT de médico.

    Respuesta 200: lista de recetas (serialize).
    Errores:
        404 — paciente no encontrado.
    """
    doctor_id = int(get_jwt_identity())
    patient = Patient.query.get(patient_id)
    if not patient:
        return jsonify({"error": "Paciente no encontrado"}), 404

    prescriptions = (
        Prescription.query
        .filter_by(doctor_id=doctor_id, patient_id=patient_id)
        .order_by(Prescription.created_at.desc())
        .all()
    )
    return jsonify([p.serialize() for p in prescriptions]), 200


# ── Historia Clínica ─────────────────────────────────────────────────────────

@api.route('/clinical-record', methods=['POST'])
@jwt_required()
def create_clinical_record():
    """
    Crea una entrada en la historia clínica de un paciente.

    Requiere JWT de médico.

    Body JSON:
        appointment_id (int) : ID de la cita completada.
        reason         (str) : Motivo de la consulta (opcional).
        diagnosis      (str) : Diagnóstico (opcional).
        notes          (str) : Observaciones adicionales (opcional).

    Respuesta 201: registro creado.
    Errores:
        400 — appointment_id faltante o cita ya tiene registro.
        403 — la cita no pertenece a este médico.
        404 — cita no encontrada.
        422 — la cita no está completada.
    """
    doctor_id = int(get_jwt_identity())
    data = request.get_json()

    appointment_id = data.get("appointment_id")
    if not appointment_id:
        return jsonify({"error": "appointment_id es requerido."}), 400

    appointment = Appointment.query.get(appointment_id)
    if not appointment:
        return jsonify({"error": "Cita no encontrada."}), 404

    if appointment.doctor_id != doctor_id:
        return jsonify({"error": "No tienes permiso sobre esta cita."}), 403

    if appointment.status != "Completed":
        return jsonify({"error": "Solo se pueden registrar notas en citas completadas."}), 422

    existing = ClinicalRecord.query.filter_by(appointment_id=appointment_id).first()
    if existing:
        return jsonify({"error": "Esta cita ya tiene una entrada clínica registrada."}), 400

    reason    = (data.get("reason",    "") or "").strip() or None
    diagnosis = (data.get("diagnosis", "") or "").strip() or None
    notes     = (data.get("notes",     "") or "").strip() or None

    record = ClinicalRecord.create(
        doctor_id=doctor_id,
        patient_id=appointment.patient_id,
        appointment_id=appointment_id,
        reason=reason,
        diagnosis=diagnosis,
        notes=notes,
    )
    return jsonify(record.serialize()), 201


@api.route('/patient/<int:patient_id>/clinical-records', methods=['GET'])
@jwt_required()
def get_patient_clinical_records(patient_id):
    """
    Retorna la historia clínica de un paciente escrita por el médico autenticado.

    Requiere JWT de médico.

    Respuesta 200: lista de registros, ordenados de más reciente a más antiguo.
    Errores:
        404 — paciente no encontrado.
    """
    doctor_id = int(get_jwt_identity())
    patient = Patient.query.get(patient_id)
    if not patient:
        return jsonify({"error": "Paciente no encontrado."}), 404

    records = (
        ClinicalRecord.query
        .filter_by(doctor_id=doctor_id, patient_id=patient_id)
        .order_by(ClinicalRecord.created_at.desc())
        .all()
    )
    return jsonify([r.serialize() for r in records]), 200


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
