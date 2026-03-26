from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from api.models import Patient, Doctor, MedicalReport
from api.services.cloudinary import upload_file
from . import api

VALID_REPORT_TYPES = ("laboratorio", "imagen", "otro")


@api.route('/report', methods=['POST'])
@jwt_required()
def upload_report():
    """
    Sube un informe médico para un paciente.

    Requiere JWT de médico. Acepta multipart/form-data.

    Campos del formulario:
        patient_id  (int)  : ID del paciente destinatario.
        title       (str)  : Título del informe (ej: "Análisis de sangre").
        report_type (str)  : "laboratorio" | "imagen" | "otro".
        notes       (str)  : Observaciones del médico (opcional).
        file        (file) : Imagen o PDF del informe.

    Respuesta 201: informe creado (serialize).
    Errores:
        400 — campos faltantes o report_type inválido.
        404 — médico o paciente no encontrado.
        500 — error al subir a Cloudinary.
    """
    doctor_id = int(get_jwt_identity())
    doctor    = Doctor.query.get(doctor_id)
    if not doctor:
        return jsonify({"error": "Médico no encontrado."}), 404

    patient_id  = request.form.get("patient_id")
    title       = (request.form.get("title") or "").strip()
    report_type = (request.form.get("report_type") or "").strip()
    notes       = (request.form.get("notes") or "").strip() or None
    file        = request.files.get("file")

    if not patient_id or not title or not report_type:
        return jsonify({"error": "patient_id, title y report_type son requeridos."}), 400
    if report_type not in VALID_REPORT_TYPES:
        return jsonify({"error": f"report_type debe ser uno de: {', '.join(VALID_REPORT_TYPES)}."}), 400
    if not file:
        return jsonify({"error": "Se requiere un archivo."}), 400

    patient = Patient.query.get(int(patient_id))
    if not patient:
        return jsonify({"error": "Paciente no encontrado."}), 404

    try:
        result = upload_file(
            file,
            folder=f"gestor_citas/reports/patient_{patient_id}",
        )
    except Exception as e:
        return jsonify({"error": f"Error al subir a Cloudinary: {str(e)}"}), 500

    report = MedicalReport.create(
        doctor_id=doctor_id,
        patient_id=int(patient_id),
        title=title,
        report_type=report_type,
        cloudinary_url=result["secure_url"],
        cloudinary_public_id=result["public_id"],
        notes=notes,
    )
    return jsonify(report.serialize()), 201


@api.route('/my/reports', methods=['GET'])
@jwt_required()
def get_my_reports():
    """
    Retorna todos los informes del paciente autenticado, más recientes primero.

    Requiere JWT de paciente.

    Respuesta 200: lista de informes (serialize).
    """
    patient_id = int(get_jwt_identity())
    reports    = (
        MedicalReport.query
        .filter_by(patient_id=patient_id)
        .order_by(MedicalReport.created_at.desc())
        .all()
    )
    return jsonify([r.serialize() for r in reports]), 200


@api.route('/patient/<int:patient_id>/reports', methods=['GET'])
@jwt_required()
def get_patient_reports(patient_id):
    """
    Retorna los informes subidos por el médico autenticado para un paciente.

    Requiere JWT de médico.

    Respuesta 200: lista de informes (serialize).
    Errores:
        404 — paciente no encontrado.
    """
    doctor_id = int(get_jwt_identity())
    patient   = Patient.query.get(patient_id)
    if not patient:
        return jsonify({"error": "Paciente no encontrado."}), 404

    reports = (
        MedicalReport.query
        .filter_by(doctor_id=doctor_id, patient_id=patient_id)
        .order_by(MedicalReport.created_at.desc())
        .all()
    )
    return jsonify([r.serialize() for r in reports]), 200
