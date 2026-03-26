from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from api.models import Patient, Doctor, Prescription
from api.services.email import send_prescription_email
from . import api


@api.route('/prescription', methods=['POST'])
@jwt_required()
def create_prescription():
    """
    Crea una receta médica y la envía por email al paciente (si hay credenciales SMTP).

    Requiere JWT de médico.

    Body JSON:
        patient_id   (int) : ID del paciente destinatario.
        medication   (str) : Nombre del medicamento.
        dosage       (str) : Dosis indicada.
        instructions (str) : Instrucciones de toma (opcional).

    Respuesta 201: receta creada + email_sent (bool).
    Errores:
        400 — faltan campos requeridos.
        404 — médico o paciente no encontrado.
    """
    doctor_id = int(get_jwt_identity())
    doctor    = Doctor.query.get(doctor_id)
    if not doctor:
        return jsonify({"error": "Médico no encontrado."}), 404

    data         = request.get_json()
    patient_id   = data.get("patient_id")
    medication   = (data.get("medication") or "").strip()
    dosage       = (data.get("dosage") or "").strip()
    instructions = (data.get("instructions") or "").strip() or None

    if not patient_id or not medication or not dosage:
        return jsonify({"error": "patient_id, medication y dosage son requeridos."}), 400

    patient = Patient.query.get(patient_id)
    if not patient:
        return jsonify({"error": "Paciente no encontrado."}), 404

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
    Retorna todas las recetas del paciente autenticado, más recientes primero.

    Requiere JWT de paciente.

    Respuesta 200: lista de recetas (serialize).
    """
    patient_id    = int(get_jwt_identity())
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
    Retorna las recetas emitidas por el médico autenticado para un paciente.

    Requiere JWT de médico.

    Respuesta 200: lista de recetas (serialize).
    Errores:
        404 — paciente no encontrado.
    """
    doctor_id = int(get_jwt_identity())
    patient   = Patient.query.get(patient_id)
    if not patient:
        return jsonify({"error": "Paciente no encontrado."}), 404

    prescriptions = (
        Prescription.query
        .filter_by(doctor_id=doctor_id, patient_id=patient_id)
        .order_by(Prescription.created_at.desc())
        .all()
    )
    return jsonify([p.serialize() for p in prescriptions]), 200
