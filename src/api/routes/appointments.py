from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

from api.models import db, Patient, Doctor, Appointment, BillingItem, InsurancePolicy
from . import api

DEFAULT_APPOINTMENT_FEE = 50.0


def _create_billing_item_for_completed_appointment(appt):
    """
    Genera un cargo automático al completar una cita.

    Reglas:
      - Si ya existe cargo para la cita, no crea otro.
      - Si el paciente tiene póliza activa, aplica cobertura.
      - Si cobertura es 100%, crea cargo de 0 EUR para trazabilidad.
      - Si no hay póliza activa, cobra tarifa completa.
    """
    existing = BillingItem.query.filter_by(
        patient_id=appt.patient_id,
        appointment_id=appt.id,
    ).first()
    if existing:
        return existing

    policy = InsurancePolicy.query.filter_by(
        patient_id=appt.patient_id,
        is_active=True,
    ).first()

    coverage = policy.coverage_percent if policy else 0
    coverage = max(0, min(100, int(coverage)))
    copay_ratio = (100 - coverage) / 100.0
    amount = round(DEFAULT_APPOINTMENT_FEE * copay_ratio, 2)

    if amount == 0:
        concept = "Consulta médica (cobertura total)"
    else:
        concept = "Consulta médica (copago)"

    return BillingItem.create(
        patient_id=appt.patient_id,
        appointment_id=appt.id,
        concept=concept,
        amount=amount,
        currency="EUR",
    )


@api.route('/appointments/patient', methods=['GET'])
@jwt_required()
def get_patient_appointments():
    """
    Retorna todas las citas del paciente autenticado.

    Requiere JWT de paciente.

    Respuesta 200: lista de citas (serialize).
    """
    patient_id   = int(get_jwt_identity())
    appointments = Appointment.query.filter_by(patient_id=patient_id).all()
    return jsonify([a.serialize() for a in appointments]), 200


@api.route('/appointments/doctor', methods=['GET'])
@jwt_required()
def get_doctor_appointments():
    """
    Retorna todas las citas del médico autenticado.

    Requiere JWT de médico.

    Respuesta 200: lista de citas (serialize).
    """
    doctor_id    = int(get_jwt_identity())
    appointments = Appointment.query.filter_by(doctor_id=doctor_id).all()
    return jsonify([a.serialize() for a in appointments]), 200


@api.route('/appointment', methods=['POST'])
@jwt_required()
def create_appointment():
    """
    Crea una nueva cita médica para el paciente autenticado.

    Requiere JWT de paciente.

    Body JSON:
        doctor_id        (int) : ID del médico.
        appointment_date (str) : Fecha y hora en formato DD-MM-YYYY HH:MM.
        center_id        (int) : ID del centro (opcional; si se omite se usa el centro del médico).

    Respuesta 201: cita creada (serialize).
    Errores:
        400 — doctor_id o appointment_date faltantes.
    """
    data             = request.get_json()
    doctor_id        = data.get("doctor_id")
    center_id        = data.get("center_id")
    appointment_date = data.get("appointment_date")
    patient_id       = int(get_jwt_identity())

    if not doctor_id or not appointment_date:
        return jsonify({"error": "doctor_id y appointment_date son requeridos."}), 400

    appointment_dt = datetime.strptime(appointment_date, "%d-%m-%Y %H:%M")

    if not center_id:
        doctor    = Doctor.query.get(doctor_id)
        center_id = doctor.center_id if doctor and doctor.center_id else None

    new_appointment = Appointment.create(
        doctor_id=doctor_id,
        patient_id=patient_id,
        center_id=center_id,
        appointment_date=appointment_dt,
    )
    return jsonify(new_appointment.serialize()), 201


@api.route('/appointment/<int:appointment_id>', methods=['PUT'])
def update_appointment(appointment_id):
    """
    Actualiza fecha y/o estado de una cita (uso interno/admin).

    Campos editables: appointment_date (DD-MM-YYYY HH:MM), status.

    Respuesta 200: cita actualizada (serialize).
    Errores:
        404 — cita no encontrada.
    """
    appt = Appointment.query.get(appointment_id)
    if not appt:
        return jsonify({"error": "Cita no encontrada."}), 404

    data    = request.get_json()
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
        403 — la cita no pertenece al paciente autenticado.
        404 — cita no encontrada.
        409 — la cita no está en estado Pending.
    """
    patient_id = int(get_jwt_identity())
    appt       = Appointment.query.get(appointment_id)

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

    Solo el médico asignado puede completarla.
    La cita debe estar en estado 'Pending'.

    Requiere JWT de médico.

    Respuesta 200: cita actualizada (serialize).
    Errores:
        403 — la cita no pertenece al médico autenticado.
        404 — cita no encontrada.
        409 — la cita no está en estado Pending.
    """
    doctor_id = int(get_jwt_identity())
    appt      = Appointment.query.get(appointment_id)

    if not appt:
        return jsonify({"error": "Cita no encontrada."}), 404
    if appt.doctor_id != doctor_id:
        return jsonify({"error": "No tenés permiso para modificar esta cita."}), 403
    if appt.status != "Pending":
        return jsonify({"error": f"La cita ya está en estado '{appt.status}'."}), 409

    appt.update(status="Completed")
    _create_billing_item_for_completed_appointment(appt)
    return jsonify(appt.serialize()), 200


@api.route('/doctor/patients', methods=['GET'])
@jwt_required()
def get_doctor_patients():
    """
    Retorna los pacientes únicos que tienen al menos una cita con el médico autenticado.

    Requiere JWT de médico.

    Respuesta 200: lista de pacientes (serialize).
    """
    doctor_id   = int(get_jwt_identity())
    patient_ids = (
        db.session.query(Appointment.patient_id)
        .filter_by(doctor_id=doctor_id)
        .distinct()
        .all()
    )
    patient_ids = [pid[0] for pid in patient_ids]
    patients    = Patient.query.filter(Patient.id.in_(patient_ids)).all()
    return jsonify([p.serialize() for p in patients]), 200
