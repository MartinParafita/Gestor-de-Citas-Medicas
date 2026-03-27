from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from api.models import Patient, BillingItem, InsurancePolicy
from . import api


@api.route('/my/insurance', methods=['GET'])
@jwt_required()
def get_my_insurance():
    patient_id = int(get_jwt_identity())
    patient = Patient.query.get(patient_id)
    if not patient:
        return jsonify({"error": "Paciente no encontrado."}), 404

    policy = InsurancePolicy.query.filter_by(patient_id=patient_id).first()
    if not policy:
        return jsonify(None), 200
    return jsonify(policy.serialize()), 200


@api.route('/my/insurance', methods=['PUT'])
@jwt_required()
def upsert_my_insurance():
    patient_id = int(get_jwt_identity())
    patient = Patient.query.get(patient_id)
    if not patient:
        return jsonify({"error": "Paciente no encontrado."}), 404

    data = request.get_json() or {}
    provider_name = (data.get("provider_name") or "").strip()
    policy_number = (data.get("policy_number") or "").strip()
    plan_name = (data.get("plan_name") or "").strip() or None
    is_active = bool(data.get("is_active", True))

    if not provider_name or not policy_number:
        return jsonify({"error": "provider_name y policy_number son requeridos."}), 400

    try:
        coverage_percent = int(data.get("coverage_percent", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "coverage_percent debe ser un entero entre 0 y 100."}), 400
    if coverage_percent < 0 or coverage_percent > 100:
        return jsonify({"error": "coverage_percent debe estar entre 0 y 100."}), 400

    policy = InsurancePolicy.upsert(
        patient_id=patient_id,
        provider_name=provider_name,
        policy_number=policy_number,
        plan_name=plan_name,
        coverage_percent=coverage_percent,
        is_active=is_active,
    )
    return jsonify(policy.serialize()), 200


@api.route('/my/billing-items', methods=['GET'])
@jwt_required()
def get_my_billing_items():
    patient_id = int(get_jwt_identity())
    patient = Patient.query.get(patient_id)
    if not patient:
        return jsonify({"error": "Paciente no encontrado."}), 404

    status = (request.args.get("status") or "").strip().lower()
    query = BillingItem.query.filter_by(patient_id=patient_id)
    if status in ("pendiente", "pagado", "anulado"):
        query = query.filter_by(status=status)

    items = query.order_by(BillingItem.created_at.desc()).all()
    return jsonify([i.serialize() for i in items]), 200


@api.route('/my/billing-items/<int:item_id>/pay', methods=['PUT'])
@jwt_required()
def pay_my_billing_item(item_id):
    patient_id = int(get_jwt_identity())
    patient = Patient.query.get(patient_id)
    if not patient:
        return jsonify({"error": "Paciente no encontrado."}), 404

    item = BillingItem.query.filter_by(id=item_id, patient_id=patient_id).first()
    if not item:
        return jsonify({"error": "Cargo no encontrado."}), 404
    if item.status == "pagado":
        return jsonify(item.serialize()), 200
    if item.status == "anulado":
        return jsonify({"error": "El cargo está anulado y no puede pagarse."}), 409

    item.mark_paid()
    return jsonify(item.serialize()), 200
