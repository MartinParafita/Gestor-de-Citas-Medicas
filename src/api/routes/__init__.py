from flask import Blueprint
from flask_cors import CORS

api = Blueprint('api', __name__)
CORS(api)

# Importar módulos al final para evitar imports circulares.
# Cada módulo usa el Blueprint `api` definido arriba.
from . import auth, patients, doctors, appointments, prescriptions, clinical_records, documents, reports, centers, communications, billing
