import React, { useState, useEffect } from 'react';
import useGlobalReducer from '../hooks/useGlobalReducer';
import { getMyAppointmentsDoctor, updateDoctorProfile, completeAppointment, getMyPatients, createPrescription, getPatientPrescriptions, createClinicalRecord, getPatientClinicalRecords } from '../services/fetch';
import '../css/DoctorDashboard.css';

// ── Helpers de estado ─────────────────────────────────────────────────────────

const STATUS_COLOR = {
    Pending:   'orange',
    Completed: 'green',
    Cancelled: 'red',
};

const STATUS_LABEL = {
    Pending:   'Pendiente',
    Completed: 'Completada',
    Cancelled: 'Cancelada',
};

// ── Vista: Agenda del día ─────────────────────────────────────────────────────

/**
 * AgendaHoy
 *
 * Muestra las citas del día actual y las próximas (hasta 5).
 * Permite al médico marcar como completada cualquier cita en estado Pending.
 *
 * Props:
 *   appointments {Array}    - Lista de citas del médico.
 *   onComplete   {Function} - Callback(appointmentId) para marcar como completada.
 */
const AgendaHoy = ({ appointments, onComplete }) => {
    const today = new Date();
    const todayStr = today.toDateString();
    const [completing, setCompleting] = useState(null); // ID de la cita en proceso

    const citasHoy = appointments
        .filter(a => {
            if (a.status === 'Cancelled') return false;
            const d = a.appointment_date ? new Date(a.appointment_date) : null;
            return d && d.toDateString() === todayStr;
        })
        .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date));

    const proximas = appointments
        .filter(a => {
            if (a.status === 'Cancelled') return false;
            const d = a.appointment_date ? new Date(a.appointment_date) : null;
            return d && d > today && d.toDateString() !== todayStr;
        })
        .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date))
        .slice(0, 5);

    /**
     * handleComplete
     * Llama al callback del padre para marcar la cita como completada.
     * Bloquea el botón mientras espera la respuesta.
     */
    const handleComplete = async (citaId) => {
        setCompleting(citaId);
        await onComplete(citaId);
        setCompleting(null);
    };

    return (
        <div className="cita-container">
            <h2>📅 Agenda y Citas</h2>

            <h3>Citas de hoy — {today.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
            {citasHoy.length === 0 ? (
                <p style={{ color: '#888' }}>No tienes citas programadas para hoy.</p>
            ) : (
                citasHoy.map((cita) => {
                    const d = new Date(cita.appointment_date);
                    return (
                        <div key={cita.id} className="appointment-view gestion-item">
                            <div className="details-grid">
                                <span><strong>Hora:</strong> {d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                                <span><strong>Paciente:</strong> {cita.patient_name || `ID ${cita.patient_id}`}</span>
                                <span>
                                    <strong>Estado:</strong>{' '}
                                    <span style={{ color: STATUS_COLOR[cita.status] || 'gray' }}>
                                        {STATUS_LABEL[cita.status] || cita.status}
                                    </span>
                                </span>
                            </div>
                            {cita.status === 'Pending' && (
                                <button
                                    onClick={() => handleComplete(cita.id)}
                                    disabled={completing === cita.id}
                                    style={{
                                        marginTop: '10px',
                                        padding: '6px 14px',
                                        backgroundColor: completing === cita.id ? '#aaa' : '#28a745',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: completing === cita.id ? 'not-allowed' : 'pointer',
                                        fontSize: '14px',
                                    }}
                                >
                                    {completing === cita.id ? 'Guardando...' : '✔ Marcar como completada'}
                                </button>
                            )}
                        </div>
                    );
                })
            )}

            {proximas.length > 0 && (
                <>
                    <h3 style={{ marginTop: '24px' }}>Próximas citas</h3>
                    {proximas.map((cita) => {
                        const d = new Date(cita.appointment_date);
                        return (
                            <div key={cita.id} className="appointment-view gestion-item">
                                <div className="details-grid">
                                    <span><strong>Fecha:</strong> {d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                    <span><strong>Hora:</strong> {d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                                    <span><strong>Paciente:</strong> {cita.patient_name || `ID ${cita.patient_id}`}</span>
                                </div>
                            </div>
                        );
                    })}
                </>
            )}
        </div>
    );
};

// ── Vista: Historial de citas ─────────────────────────────────────────────────

/**
 * HistorialCitas (Doctor)
 *
 * Muestra todas las citas del médico ordenadas de más reciente a más antigua.
 * Las citas canceladas aparecen con opacidad reducida.
 *
 * Props:
 *   appointments {Array} - Lista completa de citas del médico.
 */
const HistorialCitas = ({ appointments }) => {
    const sorted = [...appointments].sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date));

    return (
        <div className="cita-container">
            <h2>📋 Historial de Citas</h2>
            {sorted.length === 0 ? (
                <p>No tienes citas registradas.</p>
            ) : (
                sorted.map((cita) => {
                    const d = cita.appointment_date ? new Date(cita.appointment_date) : null;
                    return (
                        <div key={cita.id} className="appointment-view gestion-item" style={{ opacity: cita.status === 'Cancelled' ? 0.6 : 1 }}>
                            <div className="details-grid">
                                <span><strong>Fecha:</strong> {d ? d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</span>
                                <span><strong>Hora:</strong> {d ? d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                                <span><strong>Paciente:</strong> {cita.patient_name || `ID ${cita.patient_id}`}</span>
                                <span>
                                    <strong>Estado:</strong>{' '}
                                    <span style={{ color: cita.status === 'Cancelled' ? 'red' : cita.status === 'Pending' ? 'orange' : 'green' }}>
                                        {cita.status}
                                    </span>
                                </span>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );
};

// ── Vista: Ficha del paciente ─────────────────────────────────────────────────

/**
 * FichaPaciente
 *
 * Muestra el detalle completo de un paciente:
 *   - Datos personales
 *   - Historial de citas con este médico (ordenadas de más reciente a más antigua)
 *   - Sección de prescripciones (próximamente)
 *
 * Props:
 *   patient      {Object}   - Datos del paciente.
 *   appointments {Array}    - Citas del médico filtradas por este paciente.
 *   onBack       {Function} - Callback para volver a la lista.
 *
 * Secciones que muestra:
 *   1. Datos personales del paciente (solo lectura).
 *   2. Historial de citas con este médico.
 *   3. Prescripciones emitidas por este médico al paciente (write-once, con email opcional).
 *   4. Historia clínica: entradas vinculadas a citas completadas (write-once, una por cita).
 */
const FichaPaciente = ({ patient, appointments, onBack }) => {
    const citasOrdenadas = [...appointments].sort(
        (a, b) => new Date(b.appointment_date) - new Date(a.appointment_date)
    );

    // ── Estado de historia clínica ─────────────────────────────────────────────
    const [clinicalRecords, setClinicalRecords] = useState([]);
    const [loadingCr, setLoadingCr]             = useState(true);
    const [showCrForm, setShowCrForm]           = useState(false);
    const [selectedApptId, setSelectedApptId]   = useState('');
    const [crReason, setCrReason]               = useState('');
    const [crDiagnosis, setCrDiagnosis]         = useState('');
    const [crNotes, setCrNotes]                 = useState('');
    const [savingCr, setSavingCr]               = useState(false);
    const [crError, setCrError]                 = useState('');
    const [crSuccess, setCrSuccess]             = useState('');

    // ── Estado de prescripciones ───────────────────────────────────────────────
    const [prescriptions, setPrescriptions] = useState([]);
    const [loadingRx, setLoadingRx]         = useState(true);
    const [rxError, setRxError]             = useState('');

    // ── Formulario nueva receta ────────────────────────────────────────────────
    const [medication, setMedication]     = useState('');
    const [dosage, setDosage]             = useState('');
    const [instructions, setInstructions] = useState('');
    const [savingRx, setSavingRx]         = useState(false);
    const [rxSuccess, setRxSuccess]       = useState('');
    const [showForm, setShowForm]         = useState(false);

    useEffect(() => {
        const load = async () => {
            const [rxResult, crResult] = await Promise.all([
                getPatientPrescriptions(patient.id),
                getPatientClinicalRecords(patient.id),
            ]);
            if (rxResult.success) setPrescriptions(rxResult.data);
            if (crResult.success) setClinicalRecords(crResult.data);
            setLoadingRx(false);
            setLoadingCr(false);
        };
        load();
    }, [patient.id]);

    const handleCreateClinicalRecord = async (e) => {
        e.preventDefault();
        setCrError('');
        setCrSuccess('');
        setSavingCr(true);
        const result = await createClinicalRecord({
            appointment_id: Number(selectedApptId),
            reason: crReason,
            diagnosis: crDiagnosis,
            notes: crNotes,
        });
        setSavingCr(false);
        if (result.success) {
            setClinicalRecords(prev => [result.data, ...prev]);
            setSelectedApptId('');
            setCrReason('');
            setCrDiagnosis('');
            setCrNotes('');
            setShowCrForm(false);
            setCrSuccess('✅ Entrada clínica registrada correctamente.');
            setTimeout(() => setCrSuccess(''), 5000);
        } else {
            setCrError(result.message || 'Error al guardar la entrada clínica.');
        }
    };

    const handleCreatePrescription = async (e) => {
        e.preventDefault();
        setRxError('');
        setRxSuccess('');
        setSavingRx(true);
        const result = await createPrescription({
            patient_id: patient.id,
            medication,
            dosage,
            instructions,
        });
        setSavingRx(false);
        if (result.success) {
            setPrescriptions(prev => [result.data, ...prev]);
            setMedication('');
            setDosage('');
            setInstructions('');
            setShowForm(false);
            setRxSuccess(
                result.data.email_sent
                    ? '✅ Receta guardada y enviada por email al paciente.'
                    : '✅ Receta guardada. (Email no configurado, no se envió.)'
            );
            setTimeout(() => setRxSuccess(''), 5000);
        } else {
            setRxError(result.message || 'Error al guardar la receta.');
        }
    };

    const inputStyle = {
        display: 'block', width: '100%', marginTop: '6px',
        padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box',
    };

    return (
        <div className="cita-container">
            {/* Encabezado */}
            <button
                onClick={onBack}
                style={{
                    background: 'none', border: 'none', color: '#20B2AA',
                    cursor: 'pointer', fontSize: '15px', marginBottom: '16px', padding: 0,
                }}
            >
                ← Volver a la lista
            </button>

            <h2>📄 Ficha del paciente</h2>

            {/* Datos personales */}
            <div className="appointment-view gestion-item" style={{ marginBottom: '24px' }}>
                <div className="details-grid">
                    <span><strong>Nombre:</strong> {patient.first_name} {patient.last_name}</span>
                    <span><strong>Email:</strong> {patient.email}</span>
                    <span><strong>Fecha de nacimiento:</strong> {patient.birth_date}</span>
                    <span><strong>Estado:</strong> {patient.is_active ? '✅ Activo' : '❌ Inactivo'}</span>
                </div>
            </div>

            {/* Historial de citas */}
            <h3 style={{ marginBottom: '12px' }}>📋 Historial de citas</h3>
            {citasOrdenadas.length === 0 ? (
                <p style={{ color: '#888' }}>Sin citas registradas con este paciente.</p>
            ) : (
                citasOrdenadas.map((cita) => {
                    const d = cita.appointment_date ? new Date(cita.appointment_date) : null;
                    return (
                        <div
                            key={cita.id}
                            className="appointment-view gestion-item"
                            style={{ opacity: cita.status === 'Cancelled' ? 0.6 : 1, marginBottom: '10px' }}
                        >
                            <div className="details-grid">
                                <span><strong>Fecha:</strong> {d ? d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</span>
                                <span><strong>Hora:</strong> {d ? d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                                <span>
                                    <strong>Estado:</strong>{' '}
                                    <span style={{ color: STATUS_COLOR[cita.status] || 'gray' }}>
                                        {STATUS_LABEL[cita.status] || cita.status}
                                    </span>
                                </span>
                            </div>
                        </div>
                    );
                })
            )}

            {/* Prescripciones */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '28px', marginBottom: '12px' }}>
                <h3 style={{ margin: 0 }}>✍️ Prescripciones</h3>
                <button
                    onClick={() => { setShowForm(f => !f); setRxError(''); setRxSuccess(''); }}
                    style={{
                        padding: '5px 12px', backgroundColor: showForm ? '#6c757d' : '#20B2AA',
                        color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px',
                    }}
                >
                    {showForm ? 'Cancelar' : '+ Nueva receta'}
                </button>
            </div>

            {rxSuccess && <p style={{ color: '#2e7d32', marginBottom: '12px' }}>{rxSuccess}</p>}

            {/* Formulario nueva receta */}
            {showForm && (
                <form
                    onSubmit={handleCreatePrescription}
                    style={{
                        background: '#f0fafa', border: '1px solid #b2e4e1',
                        borderRadius: '8px', padding: '20px', marginBottom: '20px',
                    }}
                >
                    <h4 style={{ margin: '0 0 16px', color: '#20B2AA' }}>Nueva receta para {patient.first_name} {patient.last_name}</h4>

                    <div style={{ marginBottom: '12px' }}>
                        <label><strong>Medicamento *</strong></label>
                        <input
                            type="text"
                            value={medication}
                            onChange={e => setMedication(e.target.value)}
                            placeholder="Ej: Ibuprofeno 400mg"
                            required
                            style={inputStyle}
                        />
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                        <label><strong>Dosis *</strong></label>
                        <input
                            type="text"
                            value={dosage}
                            onChange={e => setDosage(e.target.value)}
                            placeholder="Ej: 1 comprimido cada 8 horas"
                            required
                            style={inputStyle}
                        />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label><strong>Instrucciones</strong> <span style={{ color: '#888', fontWeight: 'normal' }}>(opcional)</span></label>
                        <textarea
                            value={instructions}
                            onChange={e => setInstructions(e.target.value)}
                            placeholder="Ej: Tomar con las comidas durante 5 días."
                            rows={3}
                            style={{ ...inputStyle, resize: 'vertical' }}
                        />
                    </div>

                    {rxError && <p style={{ color: 'red', marginBottom: '12px' }}>{rxError}</p>}

                    <button
                        type="submit"
                        disabled={savingRx}
                        style={{
                            padding: '8px 20px', backgroundColor: savingRx ? '#aaa' : '#20B2AA',
                            color: 'white', border: 'none', borderRadius: '6px',
                            cursor: savingRx ? 'not-allowed' : 'pointer', fontWeight: '600',
                        }}
                    >
                        {savingRx ? 'Guardando...' : 'Emitir receta'}
                    </button>
                </form>
            )}

            {/* Lista de recetas existentes */}
            {loadingRx ? (
                <p style={{ color: '#888' }}>Cargando recetas...</p>
            ) : prescriptions.length === 0 ? (
                <div className="appointment-view gestion-item" style={{ color: '#888', fontStyle: 'italic' }}>
                    No hay recetas emitidas para este paciente.
                </div>
            ) : (
                prescriptions.map((rx) => {
                    const fecha = rx.created_at ? new Date(rx.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';
                    return (
                        <div
                            key={rx.id}
                            className="appointment-view gestion-item"
                            style={{ marginBottom: '10px', borderLeft: '4px solid #20B2AA' }}
                        >
                            <div className="details-grid">
                                <span><strong>Fecha:</strong> {fecha}</span>
                                <span><strong>Medicamento:</strong> {rx.medication}</span>
                                <span><strong>Dosis:</strong> {rx.dosage}</span>
                                {rx.instructions && (
                                    <span><strong>Instrucciones:</strong> {rx.instructions}</span>
                                )}
                            </div>
                        </div>
                    );
                })
            )}

            {/* Historia Clínica */}
            {(() => {
                const recordedApptIds = new Set(clinicalRecords.map(r => r.appointment_id));
                const completedWithoutRecord = citasOrdenadas.filter(
                    c => c.status === 'Completed' && !recordedApptIds.has(c.id)
                );
                return (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '28px', marginBottom: '12px' }}>
                            <h3 style={{ margin: 0 }}>📋 Historia Clínica</h3>
                            {completedWithoutRecord.length > 0 && (
                                <button
                                    onClick={() => { setShowCrForm(f => !f); setCrError(''); setCrSuccess(''); }}
                                    style={{
                                        padding: '5px 12px',
                                        backgroundColor: showCrForm ? '#6c757d' : '#20B2AA',
                                        color: 'white', border: 'none', borderRadius: '6px',
                                        cursor: 'pointer', fontSize: '13px',
                                    }}
                                >
                                    {showCrForm ? 'Cancelar' : '+ Nueva entrada'}
                                </button>
                            )}
                        </div>

                        {crSuccess && <p style={{ color: '#2e7d32', marginBottom: '12px' }}>{crSuccess}</p>}

                        {showCrForm && (
                            <form
                                onSubmit={handleCreateClinicalRecord}
                                style={{
                                    background: '#f0fafa', border: '1px solid #b2e4e1',
                                    borderRadius: '8px', padding: '20px', marginBottom: '20px',
                                }}
                            >
                                <h4 style={{ margin: '0 0 16px', color: '#20B2AA' }}>
                                    Nueva entrada clínica — {patient.first_name} {patient.last_name}
                                </h4>

                                <div style={{ marginBottom: '12px' }}>
                                    <label><strong>Cita *</strong></label>
                                    <select
                                        value={selectedApptId}
                                        onChange={e => setSelectedApptId(e.target.value)}
                                        required
                                        style={{ ...inputStyle }}
                                    >
                                        <option value="">— Selecciona una cita —</option>
                                        {completedWithoutRecord.map(c => {
                                            const d = new Date(c.appointment_date);
                                            return (
                                                <option key={c.id} value={c.id}>
                                                    {d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })} {d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                                </option>
                                            );
                                        })}
                                    </select>
                                </div>

                                <div style={{ marginBottom: '12px' }}>
                                    <label><strong>Motivo de consulta</strong> <span style={{ color: '#888', fontWeight: 'normal' }}>(opcional)</span></label>
                                    <textarea
                                        value={crReason}
                                        onChange={e => setCrReason(e.target.value)}
                                        placeholder="Ej: Dolor de cabeza persistente."
                                        rows={2}
                                        style={{ ...inputStyle, resize: 'vertical' }}
                                    />
                                </div>

                                <div style={{ marginBottom: '12px' }}>
                                    <label><strong>Diagnóstico</strong> <span style={{ color: '#888', fontWeight: 'normal' }}>(opcional)</span></label>
                                    <textarea
                                        value={crDiagnosis}
                                        onChange={e => setCrDiagnosis(e.target.value)}
                                        placeholder="Ej: Migraña tensional."
                                        rows={2}
                                        style={{ ...inputStyle, resize: 'vertical' }}
                                    />
                                </div>

                                <div style={{ marginBottom: '16px' }}>
                                    <label><strong>Observaciones</strong> <span style={{ color: '#888', fontWeight: 'normal' }}>(opcional)</span></label>
                                    <textarea
                                        value={crNotes}
                                        onChange={e => setCrNotes(e.target.value)}
                                        placeholder="Ej: Paciente refiere mejoría con reposo. Se indica seguimiento en 2 semanas."
                                        rows={3}
                                        style={{ ...inputStyle, resize: 'vertical' }}
                                    />
                                </div>

                                {crError && <p style={{ color: 'red', marginBottom: '12px' }}>{crError}</p>}

                                <button
                                    type="submit"
                                    disabled={savingCr || !selectedApptId}
                                    style={{
                                        padding: '8px 20px',
                                        backgroundColor: (savingCr || !selectedApptId) ? '#aaa' : '#20B2AA',
                                        color: 'white', border: 'none', borderRadius: '6px',
                                        cursor: (savingCr || !selectedApptId) ? 'not-allowed' : 'pointer',
                                        fontWeight: '600',
                                    }}
                                >
                                    {savingCr ? 'Guardando...' : 'Guardar entrada'}
                                </button>
                            </form>
                        )}

                        {loadingCr ? (
                            <p style={{ color: '#888' }}>Cargando historia clínica...</p>
                        ) : clinicalRecords.length === 0 ? (
                            <div className="appointment-view gestion-item" style={{ color: '#888', fontStyle: 'italic' }}>
                                No hay entradas clínicas registradas para este paciente.
                            </div>
                        ) : (
                            clinicalRecords.map((cr) => {
                                const fecha = cr.appointment_date
                                    ? new Date(cr.appointment_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
                                    : cr.created_at
                                        ? new Date(cr.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
                                        : '—';
                                return (
                                    <div
                                        key={cr.id}
                                        className="appointment-view gestion-item"
                                        style={{ marginBottom: '10px', borderLeft: '4px solid #6c757d' }}
                                    >
                                        <div className="details-grid">
                                            <span><strong>Cita:</strong> {fecha}</span>
                                            {cr.reason    && <span><strong>Motivo:</strong> {cr.reason}</span>}
                                            {cr.diagnosis && <span><strong>Diagnóstico:</strong> {cr.diagnosis}</span>}
                                            {cr.notes     && <span><strong>Observaciones:</strong> {cr.notes}</span>}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </>
                );
            })()}
        </div>
    );
};


// ── Vista: Mis Pacientes ──────────────────────────────────────────────────────

/**
 * MisPacientes
 *
 * Lista los pacientes únicos del médico. Al hacer click en "Ver ficha"
 * muestra el componente FichaPaciente con el detalle completo del paciente.
 *
 * Props:
 *   patients     {Array} - Lista de pacientes del backend.
 *   appointments {Array} - Citas del médico (para estadísticas y ficha).
 *   loading      {bool}  - Muestra spinner mientras se cargan los datos.
 */
const MisPacientes = ({ patients, appointments, loading }) => {
    const [selectedPatient, setSelectedPatient] = useState(null);

    if (loading) return <p style={{ color: '#888' }}>Cargando pacientes...</p>;

    if (selectedPatient) {
        const citasDelPaciente = appointments.filter(a => a.patient_id === selectedPatient.id);
        return (
            <FichaPaciente
                patient={selectedPatient}
                appointments={citasDelPaciente}
                onBack={() => setSelectedPatient(null)}
            />
        );
    }

    if (patients.length === 0) {
        return (
            <div className="cita-container">
                <h2>👥 Mis Pacientes</h2>
                <p style={{ color: '#888' }}>Aún no tienes pacientes con citas registradas.</p>
            </div>
        );
    }

    return (
        <div className="cita-container">
            <h2>👥 Mis Pacientes</h2>
            <p style={{ color: '#888', marginBottom: '16px' }}>{patients.length} paciente(s) en tu lista.</p>

            {patients.map((p) => {
                const citasDelPaciente = appointments.filter(a => a.patient_id === p.id);
                const pendientes = citasDelPaciente.filter(a => a.status === 'Pending').length;

                return (
                    <div key={p.id} className="appointment-view gestion-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div className="details-grid" style={{ flex: 1 }}>
                            <span><strong>Nombre:</strong> {p.first_name} {p.last_name}</span>
                            <span><strong>Email:</strong> {p.email}</span>
                            <span>
                                <strong>Citas:</strong>{' '}
                                {citasDelPaciente.length} total
                                {pendientes > 0 && (
                                    <span style={{ marginLeft: '8px', color: 'orange', fontWeight: 'bold' }}>
                                        ({pendientes} pendiente{pendientes > 1 ? 's' : ''})
                                    </span>
                                )}
                            </span>
                        </div>
                        <button
                            onClick={() => setSelectedPatient(p)}
                            style={{
                                marginLeft: '16px',
                                padding: '6px 14px',
                                backgroundColor: '#20B2AA',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            Ver ficha
                        </button>
                    </div>
                );
            })}
        </div>
    );
};


// ── Vista: Perfil del médico ──────────────────────────────────────────────────

/**
 * PerfilMedico
 *
 * Muestra los datos del médico y permite editar:
 *   - Email
 *   - Especialidad
 *   - Días de trabajo por semana (1-7)
 *   - Contraseña (requiere ingresar la contraseña actual)
 *
 * Nombre y apellido son de solo lectura (dato de identidad médica).
 *
 * Props:
 *   user    {Object}   - Datos del usuario del store global.
 *   onSave  {Function} - Callback que recibe el objeto actualizado tras guardar.
 */
const PerfilMedico = ({ user, onSave }) => {
    const [email, setEmail]         = useState(user?.email || '');
    const [specialty, setSpecialty] = useState(user?.specialty || '');
    const [workDays, setWorkDays]   = useState(user?.work_days ?? '');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword]         = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState('');
    const [success, setSuccess] = useState('');

    /**
     * handleSubmit
     * Construye el payload solo con los campos que el médico modificó
     * y llama a la API. Si hubo cambio de contraseña, valida que coincidan.
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const payload = {};

        if (email !== user.email) {
            payload.email = email;
        }
        if (specialty !== (user.specialty || '')) {
            payload.specialty = specialty;
        }
        if (workDays !== '' && Number(workDays) !== user.work_days) {
            payload.work_days = Number(workDays);
        }

        if (newPassword) {
            if (newPassword !== confirmPassword) {
                setError('Las contraseñas nuevas no coinciden.');
                return;
            }
            if (!currentPassword) {
                setError('Debes ingresar tu contraseña actual para cambiarla.');
                return;
            }
            payload.current_password = currentPassword;
            payload.new_password     = newPassword;
        }

        if (Object.keys(payload).length === 0) {
            setError('No hay cambios para guardar.');
            return;
        }

        setLoading(true);
        const result = await updateDoctorProfile(payload);
        setLoading(false);

        if (result.success) {
            setSuccess('Perfil actualizado correctamente.');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            onSave(result.data);
        } else {
            setError(result.message || 'Error al actualizar el perfil.');
        }
    };

    if (!user) return <p>No se pudieron cargar los datos del perfil.</p>;

    return (
        <div className="cita-container">
            <h2>⚙️ Mi Perfil</h2>

            {/* Datos de solo lectura */}
            <div className="appointment-view gestion-item" style={{ marginBottom: '24px' }}>
                <div className="details-grid">
                    <span><strong>Nombre:</strong> {user.first_name} {user.last_name}</span>
                    <span><strong>Estado:</strong> {user.is_active ? '✅ Activo' : '❌ Inactivo'}</span>
                </div>
            </div>

            <form onSubmit={handleSubmit}>

                {/* Email */}
                <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label><strong>Email</strong></label>
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        style={{ display: 'block', width: '100%', marginTop: '6px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc' }}
                    />
                </div>

                {/* Especialidad */}
                <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label><strong>Especialidad</strong></label>
                    <input
                        type="text"
                        value={specialty}
                        onChange={e => setSpecialty(e.target.value)}
                        placeholder="Ej: Cardiología"
                        style={{ display: 'block', width: '100%', marginTop: '6px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc' }}
                    />
                </div>

                {/* Días de trabajo */}
                <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label><strong>Días de trabajo por semana</strong></label>
                    <input
                        type="number"
                        min="1"
                        max="7"
                        value={workDays}
                        onChange={e => setWorkDays(e.target.value)}
                        style={{ display: 'block', marginTop: '6px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', width: '80px' }}
                    />
                </div>

                {/* Cambio de contraseña */}
                <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: '20px', marginTop: '8px', marginBottom: '16px' }}>
                    <p><strong>Cambiar contraseña</strong> <span style={{ fontSize: '13px', color: '#888' }}>(opcional)</span></p>

                    <div className="form-group" style={{ marginBottom: '12px' }}>
                        <label>Contraseña actual</label>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={e => setCurrentPassword(e.target.value)}
                            placeholder="Ingresa tu contraseña actual"
                            style={{ display: 'block', width: '100%', marginTop: '6px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc' }}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: '12px' }}>
                        <label>Nueva contraseña</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            placeholder="Nueva contraseña"
                            style={{ display: 'block', width: '100%', marginTop: '6px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc' }}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: '12px' }}>
                        <label>Confirmar nueva contraseña</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            placeholder="Repite la nueva contraseña"
                            style={{ display: 'block', width: '100%', marginTop: '6px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc' }}
                        />
                    </div>
                </div>

                {error   && <p style={{ color: 'red',   marginBottom: '12px' }}>{error}</p>}
                {success && <p style={{ color: 'green', marginBottom: '12px' }}>{success}</p>}

                <button
                    type="submit"
                    className="quick-button button-agenda"
                    disabled={loading}
                >
                    {loading ? 'Guardando...' : 'Guardar cambios'}
                </button>
            </form>
        </div>
    );
};

// ── Menú del médico ───────────────────────────────────────────────────────────

const doctorMenuData = [
    {
        title: '1. Agenda y citas', icon: '📅',
        links: [
            { name: 'Citas de hoy y próximas', view: 'agenda-hoy' },
            { name: 'Historial de citas', view: 'historial-citas' },
        ],
    },
    { title: '2. Información de pacientes', icon: '📄', links: [{ name: 'Mis pacientes', view: 'mis-pacientes' }] },
    { title: '3. Prescripciones', icon: '✍️', links: [{ name: 'Ver recetas por paciente', view: 'mis-pacientes' }] },
    { title: '4. Comunicación', icon: '💬', links: [{ name: 'Próximamente', view: 'placeholder' }] },
    { title: '5. Reportes y estadísticas', icon: '📈', links: [{ name: 'Próximamente', view: 'placeholder' }] },
    {
        title: '6. Administración y perfil', icon: '⚙️',
        links: [{ name: 'Mi perfil', view: 'perfil' }],
    },
    { title: '7. Telemedicina', icon: '💻', links: [{ name: 'Próximamente', view: 'placeholder' }] },
];

// ── Dashboard principal ───────────────────────────────────────────────────────

/**
 * DoctorDashboard
 *
 * Componente raíz del panel del médico. Gestiona:
 *   - Carga inicial de citas al montar.
 *   - Carga lazy de pacientes (solo cuando se navega a "mis-pacientes").
 *   - Estado de navegación entre vistas (currentView).
 *   - Menú lateral en acordeón (doctorMenuData).
 *   - Botones de acceso rápido para las acciones más frecuentes.
 *   - Sincronización del store global al guardar el perfil.
 *
 * Vistas disponibles:
 *   "welcome"          → Resumen del día (citas de hoy y total activas).
 *   "agenda-hoy"       → AgendaHoy (citas de hoy y próximas + marcar como completada).
 *   "historial-citas"  → HistorialCitas (todas las citas del médico).
 *   "mis-pacientes"    → MisPacientes → FichaPaciente (detalle con recetas e historia clínica).
 *   "perfil"           → PerfilMedico (editar email, especialidad, días de trabajo y contraseña).
 *   "placeholder"      → Vista temporal para secciones en desarrollo.
 */
const DoctorDashboard = () => {
    const { store, dispatch } = useGlobalReducer();
    const [currentView, setCurrentView]     = useState('welcome');
    const [openAccordion, setOpenAccordion] = useState(null);
    const [appointments, setAppointments]   = useState([]);
    const [loadingData, setLoadingData]     = useState(true);
    const [patients, setPatients]           = useState([]);
    const [loadingPatients, setLoadingPatients] = useState(false);
    const [patientsFetched, setPatientsFetched] = useState(false);

    const doctorName = store.user
        ? `Dr/a. ${store.user.first_name} ${store.user.last_name}`
        : 'Médico';

    useEffect(() => {
        const load = async () => {
            setLoadingData(true);
            const result = await getMyAppointmentsDoctor();
            if (result.success) setAppointments(result.data);
            setLoadingData(false);
        };
        load();
    }, []);

    /**
     * handleProfileSave
     * Recibe los datos actualizados del médico desde PerfilMedico
     * y los sincroniza en el store global.
     */
    const handleProfileSave = (updatedUser) => {
        dispatch({ type: 'update_user', payload: updatedUser });
    };

    /**
     * loadPatients
     * Carga la lista de pacientes del médico desde la API.
     * Solo hace la petición una vez (se guarda en patientsFetched).
     */
    const loadPatients = async () => {
        if (patientsFetched) return;
        setLoadingPatients(true);
        const result = await getMyPatients();
        if (result.success) setPatients(result.data);
        setLoadingPatients(false);
        setPatientsFetched(true);
    };

    useEffect(() => {
        if (currentView === 'mis-pacientes') loadPatients();
    }, [currentView]);

    /**
     * handleComplete
     * Llama a la API para marcar una cita como completada.
     * Si tiene éxito, actualiza el estado local de la cita sin recargar.
     *
     * @param {number} appointmentId - ID de la cita a completar.
     */
    const handleComplete = async (appointmentId) => {
        const result = await completeAppointment(appointmentId);
        if (result.success) {
            setAppointments(prev =>
                prev.map(a => a.id === appointmentId ? { ...a, status: 'Completed' } : a)
            );
        }
    };

    const todayCount = appointments.filter(a => {
        if (a.status === 'Cancelled') return false;
        const d = a.appointment_date ? new Date(a.appointment_date) : null;
        return d && d.toDateString() === new Date().toDateString();
    }).length;

    const renderContent = () => {
        if (loadingData) return <div className="placeholder-content-doctor"><p>Cargando...</p></div>;

        switch (currentView) {
            case 'agenda-hoy':
                return <AgendaHoy appointments={appointments} onComplete={handleComplete} />;
            case 'historial-citas':
                return <HistorialCitas appointments={appointments} />;
            case 'mis-pacientes':
                return <MisPacientes patients={patients} appointments={appointments} loading={loadingPatients} />;
            case 'perfil':
                return <PerfilMedico user={store.user} onSave={handleProfileSave} />;
            case 'placeholder':
                return (
                    <div className="placeholder-content-doctor">
                        <h3>🚧 Próximamente</h3>
                        <p>Esta sección está en desarrollo.</p>
                    </div>
                );
            default:
                return (
                    <div className="placeholder-content-doctor">
                        <h3>Resumen del día</h3>
                        <p>Tienes <strong>{todayCount}</strong> cita(s) para hoy.</p>
                        <p>Total citas activas: <strong>{appointments.filter(a => a.status !== 'Cancelled').length}</strong></p>
                        <br />
                        <p>Usa el menú lateral para navegar.</p>
                    </div>
                );
        }
    };

    return (
        <div className="dashboard-container">
            <div className="sidebar">
                <h2 className="main-title-doctor">👨‍⚕️ Panel del Médico</h2>

                {doctorMenuData.map((item) => {
                    const isOpen = openAccordion === item.title;
                    return (
                        <div key={item.title} className="accordion-item">
                            <div className="accordion-header" onClick={() => setOpenAccordion(isOpen ? null : item.title)}>
                                <div><span className="icon">{item.icon}</span> {item.title}</div>
                                <span className={`arrow ${isOpen ? 'rotated' : ''}`}>&gt;</span>
                            </div>
                            <div className={`accordion-content ${isOpen ? 'active' : ''}`}>
                                {item.links.map((link) => (
                                    <a
                                        key={link.name}
                                        href="#"
                                        className="secondary-link"
                                        onClick={(e) => { e.preventDefault(); setCurrentView(link.view); }}
                                    >
                                        {link.name}
                                    </a>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="content">
                <h1>Bienvenido, {doctorName}</h1>
                <p>Gestiona tu agenda y tus pacientes desde aquí.</p>

                <div className="quick-access-buttons" style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                    <button
                        className="quick-button button-agenda"
                        onClick={() => setCurrentView('agenda-hoy')}
                    >
                        <span className="button-icon">📅</span> Agenda hoy
                    </button>
                    <button
                        className="quick-button button-modificar"
                        onClick={() => setCurrentView('historial-citas')}
                    >
                        <span className="button-icon">📋</span> Historial
                    </button>
                    <button
                        className="quick-button"
                        style={{ backgroundColor: '#20B2AA', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 18px', cursor: 'pointer' }}
                        onClick={() => setCurrentView('mis-pacientes')}
                    >
                        <span className="button-icon">👥</span> Mis pacientes
                    </button>
                    <button
                        className="quick-button"
                        style={{ backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 18px', cursor: 'pointer' }}
                        onClick={() => setCurrentView('perfil')}
                    >
                        <span className="button-icon">⚙️</span> Mi perfil
                    </button>
                </div>

                {renderContent()}
            </div>
        </div>
    );
};

export default DoctorDashboard;
