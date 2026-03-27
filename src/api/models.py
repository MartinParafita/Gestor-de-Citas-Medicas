from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import String, Boolean, Integer, ForeignKey, DateTime, Date, Numeric, create_engine
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, date
import bcrypt

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = "user"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    password: Mapped[str] = mapped_column(String)
    is_active: Mapped[Boolean] = mapped_column(Boolean)

    def serialize(self):
        return {
            "id": self.id,
            "email": self.email,
            "is_active": self.is_active,
        }


class Patient(db.Model):
    """
    Representa a un paciente registrado en el sistema.

    Campos:
        id            (int)  : Clave primaria.
        email         (str)  : Email único del paciente.
        first_name    (str)  : Nombre.
        last_name     (str)  : Apellido.
        birth_date    (date) : Fecha de nacimiento.
        password      (str)  : Contraseña hasheada con bcrypt.
        assign_doctor (int)  : FK al médico asignado (puede ser None).
        is_active     (bool) : Soft-delete; False = cuenta desactivada.

    Relaciones:
        appointments : lista de Appointment asociados a este paciente.
    """
    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    first_name: Mapped[str] = mapped_column(String(255), nullable=False)
    last_name: Mapped[str] = mapped_column(String(255), nullable=False)
    birth_date: Mapped[Date] = mapped_column(Date)
    password: Mapped[str] = mapped_column(String)
    assign_doctor: Mapped[int] = mapped_column(ForeignKey("doctors.id"), nullable=True)
    is_active: Mapped[Boolean] = mapped_column(Boolean)

    appointments: Mapped[list["Appointment"]] = relationship(
     "Appointment", back_populates="patient")

    def serialize(self):
        return {
            "id": self.id,
            "email": self.email,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "birth_date": self.birth_date.strftime("%d-%m-%Y"),
            "is_active": self.is_active,
            "assign_doctor": self.assign_doctor
        }
    
    #Funcion para obtener todos los pacientes
    @staticmethod
    def all_patients():
        return Patient.query.all()
    
    @classmethod
    def create(cls, email, first_name, last_name, password, birth_date, assign_doctor):
        new_patient = cls(
            email =email,
            first_name =first_name,
            last_name =last_name,
            birth_date =birth_date,
            assign_doctor =assign_doctor,
            password=password,
            is_active = True
            )
        db.session.add(new_patient)
        db.session.commit()
        return new_patient
    
    _UNSET = object()

    def update(self, email=None, password=None, assign_doctor=_UNSET, birth_date=None):
        """
        Actualiza los campos del paciente que se reciban como argumento.
        Solo modifica los campos que no sean None.

        Parámetros:
            email       (str)  : nuevo email del paciente.
            password    (str)  : nueva contraseña ya hasheada con bcrypt.
            assign_doctor (int): ID del médico asignado.
            birth_date  (date) : nueva fecha de nacimiento.
        """
        if email is not None:
            self.email = email
        if password is not None:
            self.password = password
        if assign_doctor is not self._UNSET:
            self.assign_doctor = assign_doctor
        if birth_date is not None:
            self.birth_date = birth_date

        db.session.commit()
        return self.serialize()
    
    def soft_delete(self):
        self.is_active=False
        db.session.commit()
        return self.serialize()
    

class Doctor(db.Model):
    """
    Representa a un médico registrado en el sistema.

    Campos:
        id         (int)  : Clave primaria.
        email      (str)  : Email único del médico.
        first_name (str)  : Nombre.
        last_name  (str)  : Apellido.
        specialty  (str)  : Especialidad médica (ej: "Cardiología").
        center_id  (int)  : FK al centro médico donde trabaja.
        work_days  (int)  : Días laborables por semana (1-7).
        is_active  (bool) : Soft-delete; False = cuenta desactivada.
        password   (str)  : Contraseña hasheada con bcrypt.

    Relaciones:
        center       : Center al que pertenece el médico.
        appointments : lista de Appointment asignados a este médico.
    """
    __tablename__ = "doctors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    first_name: Mapped[str] = mapped_column(String(255), nullable=False)
    last_name: Mapped[str] = mapped_column(String(255), nullable=False)
    specialty: Mapped[str] = mapped_column(String(80), nullable=True)
    center_id: Mapped[int] = mapped_column(Integer, ForeignKey(
        "centers.id", ondelete="SET NULL"), index=True, nullable=True)
    work_days: Mapped[int] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean)
    password: Mapped[str] = mapped_column(String(255))


    center: Mapped["Center"] = relationship("Center", back_populates="doctors")
    appointments: Mapped["Appointment"] = relationship(
        "Appointment", back_populates="doctor")
    
    def serialize(self):
        return {
            "id": self.id,
            "email": self.email,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "specialty": self.specialty,
            "center_id": self.center_id,
            "center_name": self.center.name if self.center else None,
            "work_days": self.work_days,
            "is_active": self.is_active,
        }
   
    @staticmethod
    def all_doctors():
        return Doctor.query.all()
    
    @classmethod
    def create(cls, email, first_name, last_name, password, specialty, center_id, work_days):
        new_doctor = cls(
            email =email,
            first_name =first_name,
            last_name =last_name,
            specialty =specialty,
            center_id =center_id,
            work_days=work_days,
            password=password,
            is_active = True
            )
        db.session.add(new_doctor)
        db.session.commit()
        return new_doctor
    

    # Sentinel para distinguir "no se pasó el argumento" de "se pasó None"
    _UNSET = object()

    def update(self, email=None, password=None, center_id=_UNSET, work_days=None, specialty=None):
        """
        Actualiza los campos del médico que se reciban como argumento.
        Solo modifica los campos que no sean None (o _UNSET para center_id).

        center_id usa un sentinel (_UNSET) para distinguir entre
        "no se envió" (no cambia) y "se envió None" (desasignar centro).

        Parámetros:
            email     (str)      : nuevo email del médico.
            password  (str)      : nueva contraseña ya hasheada con bcrypt.
            center_id (int|None) : ID del centro médico, o None para desasignar.
            work_days (int)      : días de trabajo por semana.
            specialty (str)      : especialidad médica.
        """
        if email is not None:
            self.email = email
        if password is not None:
            self.password = password
        if work_days is not None:
            self.work_days = work_days
        if center_id is not self._UNSET:
            self.center_id = center_id
        if specialty is not None:
            self.specialty = specialty

        db.session.commit()
        return self.serialize()

    

class Appointment(db.Model):
    """
    Representa una cita médica entre un paciente y un médico.

    Campos:
        id               (int)      : Clave primaria.
        doctor_id        (int)      : FK al médico asignado.
        patient_id       (int)      : FK al paciente.
        center_id        (int)      : FK al centro médico donde se realiza.
        appointment_date (datetime) : Fecha y hora de la cita.
        status           (str)      : Estado — "Pending" | "Completed" | "Cancelled".

    Relaciones:
        doctor  : Doctor asignado.
        patient : Patient que asiste.
        center  : Center donde se realiza la cita.
    """
    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    doctor_id: Mapped[int] = mapped_column(Integer, ForeignKey(
        "doctors.id"), nullable=False, index=True)
    patient_id: Mapped[int] = mapped_column(Integer, ForeignKey(
        "patients.id"), nullable=False, index=True)
    center_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("centers.id", ondelete="SET NULL"),
        nullable=True, index=True)
    appointment_date: Mapped[datetime] = mapped_column(DateTime)
    status: Mapped[str] = mapped_column(String)

    doctor: Mapped["Doctor"] = relationship(
        "Doctor", back_populates="appointments")
    patient: Mapped["Patient"] = relationship(
        "Patient", back_populates="appointments")
    center: Mapped["Center"] = relationship("Center")

    def serialize(self) -> dict:
            return {
                "id": self.id,
                "doctor_id": self.doctor_id,
                "patient_id": self.patient_id,
                "center_id": self.center_id,
                "center_name": self.center.name if self.center else None,
                "appointment_date": self.appointment_date.isoformat() if self.appointment_date else None,
                "status": self.status,
                "doctor_name": f"{self.doctor.first_name} {self.doctor.last_name}" if self.doctor else None,
                "patient_name": f"{self.patient.first_name} {self.patient.last_name}" if self.patient else None,
            }
    

    @classmethod
    def create(cls, doctor_id, patient_id, center_id, appointment_date, status: str="Pending"):
        new_appointment = cls(
            doctor_id=doctor_id,
            patient_id=patient_id,
            center_id=center_id,
            appointment_date=appointment_date,
            status=status
        )
        db.session.add(new_appointment)
        db.session.commit()
        return new_appointment
    
    def update(self, appointment_date=None, status=None):
        if appointment_date is not None:
            self.appointment_date = appointment_date

        if status is not None:
            self.status = status

        db.session.commit()
        return self
    
    def cancel(self):
        self.status = "Cancelled"
        db.session.commit()
        return self

class Prescription(db.Model):
    """
    Representa una receta médica emitida por un médico a un paciente.

    Las recetas son de solo escritura: una vez creadas no pueden editarse.
    Al crearlas, el sistema intenta enviarlas por email al paciente
    (requiere MAIL_USERNAME y MAIL_PASSWORD en .env).

    Campos:
        id           (int)      : Clave primaria.
        doctor_id    (int)      : FK al médico que emite la receta.
        patient_id   (int)      : FK al paciente destinatario.
        medication   (str)      : Nombre del medicamento.
        dosage       (str)      : Dosis indicada.
        instructions (str|None) : Instrucciones opcionales de toma.
        created_at   (datetime) : Fecha y hora de creación (UTC).

    Relaciones:
        doctor  : Doctor que emitió la receta.
        patient : Patient destinatario.
    """
    __tablename__ = "prescriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    doctor_id: Mapped[int] = mapped_column(Integer, ForeignKey("doctors.id"), nullable=False, index=True)
    patient_id: Mapped[int] = mapped_column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    medication: Mapped[str] = mapped_column(String(255), nullable=False)
    dosage: Mapped[str] = mapped_column(String(255), nullable=False)
    instructions: Mapped[str] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    doctor: Mapped["Doctor"] = relationship("Doctor")
    patient: Mapped["Patient"] = relationship("Patient")

    def serialize(self) -> dict:
        return {
            "id": self.id,
            "doctor_id": self.doctor_id,
            "patient_id": self.patient_id,
            "medication": self.medication,
            "dosage": self.dosage,
            "instructions": self.instructions,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "doctor_name": f"{self.doctor.first_name} {self.doctor.last_name}" if self.doctor else None,
            "patient_name": f"{self.patient.first_name} {self.patient.last_name}" if self.patient else None,
        }

    @classmethod
    def create(cls, doctor_id, patient_id, medication, dosage, instructions=None):
        new_prescription = cls(
            doctor_id=doctor_id,
            patient_id=patient_id,
            medication=medication,
            dosage=dosage,
            instructions=instructions,
            created_at=datetime.utcnow(),
        )
        db.session.add(new_prescription)
        db.session.commit()
        return new_prescription


class ClinicalRecord(db.Model):
    """
    Representa una entrada en la historia clínica de un paciente.

    Cada entrada está vinculada a una cita completada (appointment_id es único),
    de modo que solo puede existir un registro clínico por cita.
    Los registros son de solo escritura: una vez creados no pueden editarse.

    Campos:
        id             (int)      : Clave primaria.
        doctor_id      (int)      : FK al médico que redactó la entrada.
        patient_id     (int)      : FK al paciente.
        appointment_id (int)      : FK a la cita completada (unique — un registro por cita).
        reason         (str|None) : Motivo de consulta.
        diagnosis      (str|None) : Diagnóstico del médico.
        notes          (str|None) : Observaciones adicionales.
        created_at     (datetime) : Fecha y hora de creación (UTC).

    Relaciones:
        doctor      : Doctor que redactó la entrada.
        patient     : Patient al que pertenece la historia.
        appointment : Appointment al que está vinculada la entrada.
    """
    __tablename__ = "clinical_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    doctor_id: Mapped[int] = mapped_column(Integer, ForeignKey("doctors.id"), nullable=False, index=True)
    patient_id: Mapped[int] = mapped_column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    appointment_id: Mapped[int] = mapped_column(Integer, ForeignKey("appointments.id"), nullable=False, unique=True)
    reason: Mapped[str] = mapped_column(String(500), nullable=True)
    diagnosis: Mapped[str] = mapped_column(String(500), nullable=True)
    notes: Mapped[str] = mapped_column(String(2000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    doctor: Mapped["Doctor"] = relationship("Doctor")
    patient: Mapped["Patient"] = relationship("Patient")
    appointment: Mapped["Appointment"] = relationship("Appointment")

    def serialize(self) -> dict:
        return {
            "id": self.id,
            "doctor_id": self.doctor_id,
            "patient_id": self.patient_id,
            "appointment_id": self.appointment_id,
            "reason": self.reason,
            "diagnosis": self.diagnosis,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "doctor_name": f"{self.doctor.first_name} {self.doctor.last_name}" if self.doctor else None,
            "appointment_date": self.appointment.appointment_date.isoformat() if self.appointment and self.appointment.appointment_date else None,
        }

    @classmethod
    def create(cls, doctor_id, patient_id, appointment_id, reason=None, diagnosis=None, notes=None):
        record = cls(
            doctor_id=doctor_id,
            patient_id=patient_id,
            appointment_id=appointment_id,
            reason=reason,
            diagnosis=diagnosis,
            notes=notes,
            created_at=datetime.utcnow(),
        )
        db.session.add(record)
        db.session.commit()
        return record


class PatientDocument(db.Model):
    """
    Almacena los documentos de identidad del paciente subidos a Cloudinary.

    Cada paciente puede tener un documento de cada tipo (upsert por patient_id + doc_type).

    Campos:
        id                   (int)      : Clave primaria.
        patient_id           (int)      : FK al paciente.
        doc_type             (str)      : Tipo — "dni" | "tarjeta_sanitaria".
        cloudinary_url       (str)      : URL pública del documento en Cloudinary.
        cloudinary_public_id (str)      : Public ID en Cloudinary (para eliminación).
        uploaded_at          (datetime) : Fecha de última subida (UTC).

    Relaciones:
        patient : Patient propietario del documento.
    """
    __tablename__ = "patient_documents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    doc_type: Mapped[str] = mapped_column(String(50), nullable=False)
    cloudinary_url: Mapped[str] = mapped_column(String(500), nullable=False)
    cloudinary_public_id: Mapped[str] = mapped_column(String(255), nullable=False)
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    patient: Mapped["Patient"] = relationship("Patient")

    def serialize(self) -> dict:
        return {
            "id": self.id,
            "patient_id": self.patient_id,
            "doc_type": self.doc_type,
            "cloudinary_url": self.cloudinary_url,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
        }

    @classmethod
    def upsert(cls, patient_id, doc_type, cloudinary_url, cloudinary_public_id):
        """Crea o reemplaza el documento del tipo indicado para el paciente."""
        existing = cls.query.filter_by(patient_id=patient_id, doc_type=doc_type).first()
        if existing:
            existing.cloudinary_url = cloudinary_url
            existing.cloudinary_public_id = cloudinary_public_id
            existing.uploaded_at = datetime.utcnow()
            db.session.commit()
            return existing
        doc = cls(
            patient_id=patient_id,
            doc_type=doc_type,
            cloudinary_url=cloudinary_url,
            cloudinary_public_id=cloudinary_public_id,
            uploaded_at=datetime.utcnow(),
        )
        db.session.add(doc)
        db.session.commit()
        return doc


class MedicalReport(db.Model):
    """
    Representa un informe médico o resultado de laboratorio subido por un médico para un paciente.

    Los informes son de solo escritura: una vez creados no pueden editarse ni eliminarse.
    El archivo se almacena en Cloudinary.

    Campos:
        id                   (int)      : Clave primaria.
        doctor_id            (int)      : FK al médico que sube el informe.
        patient_id           (int)      : FK al paciente destinatario.
        title                (str)      : Título descriptivo (ej: "Análisis de sangre").
        report_type          (str)      : Tipo — "laboratorio" | "imagen" | "otro".
        cloudinary_url       (str)      : URL pública del archivo en Cloudinary.
        cloudinary_public_id (str)      : Public ID en Cloudinary.
        notes                (str|None) : Observaciones del médico (opcional).
        created_at           (datetime) : Fecha de subida (UTC).

    Relaciones:
        doctor  : Doctor que subió el informe.
        patient : Patient destinatario.
    """
    __tablename__ = "medical_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    doctor_id: Mapped[int] = mapped_column(Integer, ForeignKey("doctors.id"), nullable=False, index=True)
    patient_id: Mapped[int] = mapped_column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    report_type: Mapped[str] = mapped_column(String(50), nullable=False)
    cloudinary_url: Mapped[str] = mapped_column(String(500), nullable=False)
    cloudinary_public_id: Mapped[str] = mapped_column(String(255), nullable=False)
    notes: Mapped[str] = mapped_column(String(1000), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    doctor: Mapped["Doctor"] = relationship("Doctor")
    patient: Mapped["Patient"] = relationship("Patient")

    def serialize(self) -> dict:
        return {
            "id": self.id,
            "doctor_id": self.doctor_id,
            "patient_id": self.patient_id,
            "title": self.title,
            "report_type": self.report_type,
            "cloudinary_url": self.cloudinary_url,
            "notes": self.notes,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "doctor_name": f"{self.doctor.first_name} {self.doctor.last_name}" if self.doctor else None,
            "patient_name": f"{self.patient.first_name} {self.patient.last_name}" if self.patient else None,
        }

    @classmethod
    def create(cls, doctor_id, patient_id, title, report_type, cloudinary_url, cloudinary_public_id, notes=None):
        report = cls(
            doctor_id=doctor_id,
            patient_id=patient_id,
            title=title,
            report_type=report_type,
            cloudinary_url=cloudinary_url,
            cloudinary_public_id=cloudinary_public_id,
            notes=notes,
            created_at=datetime.utcnow(),
        )
        db.session.add(report)
        db.session.commit()
        return report


class CommunicationTicket(db.Model):
    """
    Solicitud de comunicacion asincronica entre paciente y medico.

    Flujo:
      - El paciente crea una solicitud (status: "open").
      - El medico responde (status: "responded").
      - Paciente o medico pueden cerrarla (status: "closed").
    """
    __tablename__ = "communication_tickets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    doctor_id: Mapped[int] = mapped_column(Integer, ForeignKey("doctors.id"), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(String(2000), nullable=False)
    doctor_response: Mapped[str] = mapped_column(String(2000), nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="open", nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    responded_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    closed_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    patient: Mapped["Patient"] = relationship("Patient")
    doctor: Mapped["Doctor"] = relationship("Doctor")

    def serialize(self) -> dict:
        return {
            "id": self.id,
            "patient_id": self.patient_id,
            "doctor_id": self.doctor_id,
            "category": self.category,
            "subject": self.subject,
            "message": self.message,
            "doctor_response": self.doctor_response,
            "status": self.status,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "responded_at": self.responded_at.isoformat() if self.responded_at else None,
            "closed_at": self.closed_at.isoformat() if self.closed_at else None,
            "patient_name": f"{self.patient.first_name} {self.patient.last_name}" if self.patient else None,
            "doctor_name": f"{self.doctor.first_name} {self.doctor.last_name}" if self.doctor else None,
        }

    @classmethod
    def create(cls, patient_id, doctor_id, category, subject, message):
        ticket = cls(
            patient_id=patient_id,
            doctor_id=doctor_id,
            category=category,
            subject=subject,
            message=message,
            status="open",
            created_at=datetime.utcnow(),
        )
        db.session.add(ticket)
        db.session.commit()
        return ticket

    def respond(self, response_text):
        self.doctor_response = response_text
        self.status = "responded"
        self.responded_at = datetime.utcnow()
        db.session.commit()
        return self

    def close(self):
        self.status = "closed"
        self.closed_at = datetime.utcnow()
        db.session.commit()
        return self


class InsurancePolicy(db.Model):
    """
    Poliza/seguro del paciente (un registro activo por paciente).
    """
    __tablename__ = "insurance_policies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(Integer, ForeignKey("patients.id"), nullable=False, unique=True, index=True)
    provider_name: Mapped[str] = mapped_column(String(255), nullable=False)
    policy_number: Mapped[str] = mapped_column(String(120), nullable=False)
    plan_name: Mapped[str] = mapped_column(String(255), nullable=True)
    coverage_percent: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    patient: Mapped["Patient"] = relationship("Patient")

    def serialize(self) -> dict:
        return {
            "id": self.id,
            "patient_id": self.patient_id,
            "provider_name": self.provider_name,
            "policy_number": self.policy_number,
            "plan_name": self.plan_name,
            "coverage_percent": self.coverage_percent,
            "is_active": self.is_active,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    @classmethod
    def upsert(cls, patient_id, provider_name, policy_number, plan_name=None, coverage_percent=0, is_active=True):
        policy = cls.query.filter_by(patient_id=patient_id).first()
        if policy:
            policy.provider_name = provider_name
            policy.policy_number = policy_number
            policy.plan_name = plan_name
            policy.coverage_percent = coverage_percent
            policy.is_active = is_active
            policy.updated_at = datetime.utcnow()
            db.session.commit()
            return policy

        policy = cls(
            patient_id=patient_id,
            provider_name=provider_name,
            policy_number=policy_number,
            plan_name=plan_name,
            coverage_percent=coverage_percent,
            is_active=is_active,
            updated_at=datetime.utcnow(),
        )
        db.session.add(policy)
        db.session.commit()
        return policy


class BillingItem(db.Model):
    """
    Cargo/factura del paciente.
    """
    __tablename__ = "billing_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    patient_id: Mapped[int] = mapped_column(Integer, ForeignKey("patients.id"), nullable=False, index=True)
    appointment_id: Mapped[int] = mapped_column(Integer, ForeignKey("appointments.id"), nullable=True, index=True)
    concept: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="EUR")
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="pendiente", index=True)
    due_date: Mapped[date] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    paid_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    patient: Mapped["Patient"] = relationship("Patient")
    appointment: Mapped["Appointment"] = relationship("Appointment")

    def serialize(self) -> dict:
        return {
            "id": self.id,
            "patient_id": self.patient_id,
            "appointment_id": self.appointment_id,
            "concept": self.concept,
            "amount": float(self.amount) if self.amount is not None else 0,
            "currency": self.currency,
            "status": self.status,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "paid_at": self.paid_at.isoformat() if self.paid_at else None,
        }

    @classmethod
    def create(cls, patient_id, concept, amount, currency="EUR", appointment_id=None, due_date=None):
        item = cls(
            patient_id=patient_id,
            appointment_id=appointment_id,
            concept=concept,
            amount=amount,
            currency=currency,
            status="pendiente",
            due_date=due_date,
            created_at=datetime.utcnow(),
        )
        db.session.add(item)
        db.session.commit()
        return item

    def mark_paid(self):
        self.status = "pagado"
        self.paid_at = datetime.utcnow()
        db.session.commit()
        return self


class Center(db.Model):
    """
    Representa un centro médico o clínica.

    Campos:
        id          (int) : Clave primaria.
        name        (str) : Nombre del centro.
        address     (str) : Dirección física.
        zip_code    (str) : Código postal.
        phone       (str) : Teléfono de contacto.
        type_center (str) : Tipo de centro (ej: "Hospital", "Clínica").

    Relaciones:
        doctors : lista de Doctor que trabajan en este centro.
    """
    __tablename__ = "centers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[str] = mapped_column(String(255))
    zip_code: Mapped[str] = mapped_column(String(30))
    phone: Mapped[str] = mapped_column(String)
    type_center: Mapped[str] = mapped_column(String(80))

    doctors: Mapped["Doctor"] = relationship(
        "Doctor", back_populates="center")

    def serialize(self):
        return {
            "id": self.id,
            "name": self.name,
            "address": self.address,
            "zip_code": self.zip_code,
            "phone": self.phone,
            "type_center": self.type_center,
        }
    
    @classmethod
    def create(cls, name, address, zip_code, phone, type_center):
        new_center = cls(
            name=name,
            address=address,
            zip_code=zip_code,
            phone=phone,
            type_center=type_center
            )
        db.session.add(new_center)
        db.session.commit()
        return new_center
