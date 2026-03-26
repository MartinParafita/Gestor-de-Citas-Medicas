from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from api.models import db, PatientDocument
from api.services.cloudinary import upload_file, destroy_file
from . import api


def _detect_resource_type(file):
    mime = (file.mimetype or "").lower()
    filename = (file.filename or "").lower()
    if mime == "application/pdf" or filename.endswith(".pdf"):
        return "raw"
    if mime.startswith("image/"):
        return "image"
    return "auto"


@api.route('/my/documents', methods=['GET'])
@jwt_required()
def get_my_documents():
    """
    Retorna los documentos de identidad del paciente autenticado.

    Requiere JWT de paciente.

    Respuesta 200: lista de documentos (serialize).
    """
    patient_id = int(get_jwt_identity())
    docs       = PatientDocument.query.filter_by(patient_id=patient_id).all()
    return jsonify([d.serialize() for d in docs]), 200


@api.route('/my/documents', methods=['POST'])
@jwt_required()
def upload_document():
    """
    Sube o reemplaza un documento de identidad del paciente.

    Requiere JWT de paciente. Acepta multipart/form-data.

    Campos del formulario:
        doc_type (str)  : "dni" | "tarjeta_sanitaria".
        file     (file) : Imagen o PDF del documento.

    Respuesta 201: documento subido (serialize).
    Errores:
        400 — doc_type inválido o archivo faltante.
        500 — error al subir a Cloudinary.
    """
    patient_id = int(get_jwt_identity())
    doc_type   = request.form.get("doc_type")
    file       = request.files.get("file")

    if not doc_type or doc_type not in ("dni", "tarjeta_sanitaria"):
        return jsonify({"error": "doc_type debe ser 'dni' o 'tarjeta_sanitaria'."}), 400
    if not file:
        return jsonify({"error": "Se requiere un archivo."}), 400

    try:
        result = upload_file(
            file,
            folder=f"gestor_citas/patient_{patient_id}",
            public_id=doc_type,
            overwrite=True,
            resource_type=_detect_resource_type(file),
        )
    except Exception as e:
        return jsonify({"error": f"Error al subir a Cloudinary: {str(e)}"}), 500

    doc = PatientDocument.upsert(
        patient_id=patient_id,
        doc_type=doc_type,
        cloudinary_url=result["secure_url"],
        cloudinary_public_id=result["public_id"],
    )
    return jsonify(doc.serialize()), 201


@api.route('/my/documents/<string:doc_type>', methods=['DELETE'])
@jwt_required()
def delete_document(doc_type):
    """
    Elimina un documento de identidad del paciente autenticado.

    Requiere JWT de paciente.

    Respuesta 200: mensaje de confirmación.
    Errores:
        404 — documento no encontrado.
    """
    patient_id = int(get_jwt_identity())
    doc        = PatientDocument.query.filter_by(patient_id=patient_id, doc_type=doc_type).first()
    if not doc:
        return jsonify({"error": "Documento no encontrado."}), 404

    destroy_file(doc.cloudinary_public_id)
    db.session.delete(doc)
    db.session.commit()
    return jsonify({"msg": "Documento eliminado."}), 200
