from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime

from api.models import Patient, Doctor, Appointment, CommunicationTicket
from . import api

VALID_CATEGORIES = ("receta", "informe", "administrativa", "seguimiento", "otro")


@api.route('/communication/request', methods=['POST'])
@jwt_required()
def create_communication_request():
    """
    Crea una solicitud de comunicacion por parte del paciente autenticado.

    Reglas:
      - El paciente solo puede escribir a medicos con cita pasada (no cancelada).
      - Maximo 1 ticket abierto por categoria y medico.
    """
    patient_id = int(get_jwt_identity())
    patient = Patient.query.get(patient_id)
    if not patient:
        return jsonify({"error": "Paciente no encontrado."}), 404

    data = request.get_json() or {}
    doctor_id = data.get("doctor_id")
    category = (data.get("category") or "").strip().lower()
    subject = (data.get("subject") or "").strip()
    message = (data.get("message") or "").strip()

    if not doctor_id:
        return jsonify({"error": "doctor_id es requerido."}), 400

    doctor = Doctor.query.get(int(doctor_id))
    if not doctor:
        return jsonify({"error": "Medico no encontrado."}), 404

    has_past_appointment = (
        Appointment.query
        .filter(
            Appointment.patient_id == patient_id,
            Appointment.doctor_id == int(doctor_id),
            Appointment.status != "Cancelled",
            Appointment.appointment_date <= datetime.utcnow(),
        )
        .first()
    )
    if not has_past_appointment:
        return jsonify({"error": "Solo puedes contactar al medico despues de una cita pasada."}), 403

    if category not in VALID_CATEGORIES:
        return jsonify({"error": f"category debe ser uno de: {', '.join(VALID_CATEGORIES)}."}), 400
    if not subject:
        return jsonify({"error": "subject es requerido."}), 400
    if not message or len(message) < 10:
        return jsonify({"error": "message es requerido y debe tener al menos 10 caracteres."}), 400

    existing_open = CommunicationTicket.query.filter_by(
        patient_id=patient_id,
        doctor_id=int(doctor_id),
        category=category,
        status="open",
    ).first()
    if existing_open:
        return jsonify({"error": "Ya tienes una consulta abierta con este medico en esa categoria."}), 409

    ticket = CommunicationTicket.create(
        patient_id=patient_id,
        doctor_id=int(doctor_id),
        category=category,
        subject=subject,
        message=message,
    )
    return jsonify(ticket.serialize()), 201


@api.route('/communication/my-doctors', methods=['GET'])
@jwt_required()
def get_my_communication_doctors():
    """
    Retorna medicos contactables por el paciente autenticado:
    medicos con al menos una cita pasada no cancelada.
    """
    patient_id = int(get_jwt_identity())
    patient = Patient.query.get(patient_id)
    if not patient:
        return jsonify({"error": "Paciente no encontrado."}), 404

    past_appointments = (
        Appointment.query
        .filter(
            Appointment.patient_id == patient_id,
            Appointment.status != "Cancelled",
            Appointment.appointment_date <= datetime.utcnow(),
        )
        .order_by(Appointment.appointment_date.desc())
        .all()
    )

    doctors_map = {}
    for appt in past_appointments:
        if appt.doctor and appt.doctor_id not in doctors_map:
            doctors_map[appt.doctor_id] = {
                "id": appt.doctor.id,
                "first_name": appt.doctor.first_name,
                "last_name": appt.doctor.last_name,
                "specialty": appt.doctor.specialty,
                "last_appointment_date": appt.appointment_date.isoformat() if appt.appointment_date else None,
            }

    return jsonify(list(doctors_map.values())), 200


@api.route('/communication/my-requests', methods=['GET'])
@jwt_required()
def get_my_communication_requests():
    patient_id = int(get_jwt_identity())
    patient = Patient.query.get(patient_id)
    if not patient:
        return jsonify({"error": "Paciente no encontrado."}), 404

    tickets = (
        CommunicationTicket.query
        .filter_by(patient_id=patient_id)
        .order_by(CommunicationTicket.created_at.desc())
        .all()
    )
    return jsonify([t.serialize() for t in tickets]), 200


@api.route('/communication/doctor/requests', methods=['GET'])
@jwt_required()
def get_doctor_communication_requests():
    doctor_id = int(get_jwt_identity())
    doctor = Doctor.query.get(doctor_id)
    if not doctor:
        return jsonify({"error": "Medico no encontrado."}), 404

    status = (request.args.get("status") or "").strip().lower()
    query = CommunicationTicket.query.filter_by(doctor_id=doctor_id)
    if status in ("open", "responded", "closed"):
        query = query.filter_by(status=status)

    tickets = query.order_by(CommunicationTicket.created_at.asc()).all()
    return jsonify([t.serialize() for t in tickets]), 200


@api.route('/communication/request/<int:ticket_id>/respond', methods=['PUT'])
@jwt_required()
def respond_communication_request(ticket_id):
    doctor_id = int(get_jwt_identity())
    doctor = Doctor.query.get(doctor_id)
    if not doctor:
        return jsonify({"error": "Medico no encontrado."}), 404

    ticket = CommunicationTicket.query.filter_by(id=ticket_id, doctor_id=doctor_id).first()
    if not ticket:
        return jsonify({"error": "Consulta no encontrada."}), 404
    if ticket.status == "closed":
        return jsonify({"error": "No se puede responder una consulta cerrada."}), 400

    data = request.get_json() or {}
    response_text = (data.get("response") or "").strip()
    if not response_text:
        return jsonify({"error": "response es requerido."}), 400

    ticket.respond(response_text)
    return jsonify(ticket.serialize()), 200


@api.route('/communication/request/<int:ticket_id>/close', methods=['PUT'])
@jwt_required()
def close_communication_request(ticket_id):
    user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}
    role = (data.get("role") or "").strip().lower()

    if role == "doctor":
        owner = Doctor.query.get(user_id)
        if not owner:
            return jsonify({"error": "Medico no encontrado."}), 404
        ticket = CommunicationTicket.query.filter_by(id=ticket_id, doctor_id=user_id).first()
    else:
        owner = Patient.query.get(user_id)
        if not owner:
            return jsonify({"error": "Paciente no encontrado."}), 404
        ticket = CommunicationTicket.query.filter_by(id=ticket_id, patient_id=user_id).first()

    if not ticket:
        return jsonify({"error": "Consulta no encontrada."}), 404
    if ticket.status == "closed":
        return jsonify(ticket.serialize()), 200

    ticket.close()
    return jsonify(ticket.serialize()), 200
