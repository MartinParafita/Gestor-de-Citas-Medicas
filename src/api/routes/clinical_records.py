from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from api.models import Patient, Appointment, ClinicalRecord
from . import api


@api.route('/clinical-record', methods=['POST'])
@jwt_required()
def create_clinical_record():
    """
    Crea una entrada en la historia clínica vinculada a una cita completada.

    Requiere JWT de médico. Solo se puede crear un registro por cita.

    Body JSON:
        appointment_id (int) : ID de la cita completada (requerido).
        reason         (str) : Motivo de la consulta (opcional).
        diagnosis      (str) : Diagnóstico (opcional).
        notes          (str) : Observaciones adicionales (opcional).

    Respuesta 201: registro clínico creado (serialize).
    Errores:
        400 — appointment_id faltante o la cita ya tiene un registro.
        403 — la cita no pertenece al médico autenticado.
        404 — cita no encontrada.
        422 — la cita no está en estado 'Completed'.
    """
    doctor_id      = int(get_jwt_identity())
    data           = request.get_json()
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

    if ClinicalRecord.query.filter_by(appointment_id=appointment_id).first():
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

    Respuesta 200: lista de registros, más recientes primero.
    Errores:
        404 — paciente no encontrado.
    """
    doctor_id = int(get_jwt_identity())
    patient   = Patient.query.get(patient_id)
    if not patient:
        return jsonify({"error": "Paciente no encontrado."}), 404

    records = (
        ClinicalRecord.query
        .filter_by(doctor_id=doctor_id, patient_id=patient_id)
        .order_by(ClinicalRecord.created_at.desc())
        .all()
    )
    return jsonify([r.serialize() for r in records]), 200
