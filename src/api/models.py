from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import String, Boolean, Integer, ForeignKey, DateTime, Date, create_engine
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
    
    def update(self, email=None, password=None, assign_doctor=None, birth_date=None):
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
        if assign_doctor is not None:
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
    

    def update(self, email=None, password=None, center_id=None, work_days=None, specialty=None):
        """
        Actualiza los campos del médico que se reciban como argumento.
        Solo modifica los campos que no sean None.

        Parámetros:
            email     (str) : nuevo email del médico.
            password  (str) : nueva contraseña ya hasheada con bcrypt.
            center_id (int) : ID del centro médico asignado.
            work_days (int) : días de trabajo por semana.
            specialty (str) : especialidad médica.
        """
        if email is not None:
            self.email = email
        if password is not None:
            self.password = password
        if work_days is not None:
            self.work_days = work_days
        if center_id is not None:
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
        Integer, ForeignKey("centers.id"), index=True)
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