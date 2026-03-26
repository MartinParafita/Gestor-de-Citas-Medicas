import React, { useState, useEffect } from 'react';
import { createPrescription, getPatientPrescriptions, createClinicalRecord, getPatientClinicalRecords, uploadReport, getPatientReports } from '../../../services/fetch';
import { STATUS_COLOR, STATUS_LABEL } from '../constants';

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

    // ── Estado de informes médicos ─────────────────────────────────────────────
    const [reports, setReports]           = useState([]);
    const [loadingRep, setLoadingRep]     = useState(true);
    const [showRepForm, setShowRepForm]   = useState(false);
    const [repTitle, setRepTitle]         = useState('');
    const [repType, setRepType]           = useState('laboratorio');
    const [repNotes, setRepNotes]         = useState('');
    const [repFile, setRepFile]           = useState(null);
    const [savingRep, setSavingRep]       = useState(false);
    const [repError, setRepError]         = useState('');
    const [repSuccess, setRepSuccess]     = useState('');

    // ── Formulario nueva receta ────────────────────────────────────────────────
    const [medication, setMedication]     = useState('');
    const [dosage, setDosage]             = useState('');
    const [instructions, setInstructions] = useState('');
    const [savingRx, setSavingRx]         = useState(false);
    const [rxSuccess, setRxSuccess]       = useState('');
    const [showForm, setShowForm]         = useState(false);

    useEffect(() => {
        const load = async () => {
            const [rxResult, crResult, repResult] = await Promise.all([
                getPatientPrescriptions(patient.id),
                getPatientClinicalRecords(patient.id),
                getPatientReports(patient.id),
            ]);
            if (rxResult.success)  setPrescriptions(rxResult.data);
            if (crResult.success)  setClinicalRecords(crResult.data);
            if (repResult.success) setReports(repResult.data);
            setLoadingRx(false);
            setLoadingCr(false);
            setLoadingRep(false);
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

    const handleUploadReport = async (e) => {
        e.preventDefault();
        setRepError('');
        setRepSuccess('');
        if (!repFile) { setRepError('Seleccioná un archivo.'); return; }
        setSavingRep(true);
        const result = await uploadReport({
            patientId: patient.id,
            title: repTitle,
            reportType: repType,
            notes: repNotes,
            file: repFile,
        });
        setSavingRep(false);
        if (result.success) {
            setReports(prev => [result.data, ...prev]);
            setRepTitle('');
            setRepType('laboratorio');
            setRepNotes('');
            setRepFile(null);
            setShowRepForm(false);
            setRepSuccess('✅ Informe subido correctamente.');
            setTimeout(() => setRepSuccess(''), 5000);
        } else {
            setRepError(result.message || 'Error al subir el informe.');
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

            {/* Informes médicos */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '28px', marginBottom: '12px' }}>
                <h3 style={{ margin: 0 }}>🔬 Resultados e informes</h3>
                <button
                    onClick={() => { setShowRepForm(f => !f); setRepError(''); setRepSuccess(''); }}
                    style={{
                        padding: '5px 12px',
                        backgroundColor: showRepForm ? '#6c757d' : '#20B2AA',
                        color: 'white', border: 'none', borderRadius: '6px',
                        cursor: 'pointer', fontSize: '13px',
                    }}
                >
                    {showRepForm ? 'Cancelar' : '+ Subir informe'}
                </button>
            </div>

            {repSuccess && <p style={{ color: '#2e7d32', marginBottom: '12px' }}>{repSuccess}</p>}

            {showRepForm && (
                <form
                    onSubmit={handleUploadReport}
                    style={{
                        background: '#f0fafa', border: '1px solid #b2e4e1',
                        borderRadius: '8px', padding: '20px', marginBottom: '20px',
                    }}
                >
                    <h4 style={{ margin: '0 0 16px', color: '#20B2AA' }}>
                        Nuevo informe — {patient.first_name} {patient.last_name}
                    </h4>

                    <div style={{ marginBottom: '12px' }}>
                        <label><strong>Título *</strong></label>
                        <input
                            type="text"
                            value={repTitle}
                            onChange={e => setRepTitle(e.target.value)}
                            placeholder="Ej: Análisis de sangre completo"
                            required
                            style={inputStyle}
                        />
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                        <label><strong>Tipo *</strong></label>
                        <select
                            value={repType}
                            onChange={e => setRepType(e.target.value)}
                            style={inputStyle}
                        >
                            <option value="laboratorio">Laboratorio</option>
                            <option value="imagen">Imagen / Diagnóstico por imagen</option>
                            <option value="otro">Otro</option>
                        </select>
                    </div>

                    <div style={{ marginBottom: '12px' }}>
                        <label><strong>Observaciones</strong> <span style={{ color: '#888', fontWeight: 'normal' }}>(opcional)</span></label>
                        <textarea
                            value={repNotes}
                            onChange={e => setRepNotes(e.target.value)}
                            placeholder="Ej: Valores dentro del rango normal. Repetir en 6 meses."
                            rows={2}
                            style={{ ...inputStyle, resize: 'vertical' }}
                        />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label><strong>Archivo *</strong> <span style={{ color: '#888', fontWeight: 'normal' }}>(imagen o PDF)</span></label>
                        <input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={e => setRepFile(e.target.files[0] || null)}
                            required
                            style={{ ...inputStyle, padding: '6px' }}
                        />
                    </div>

                    {repError && <p style={{ color: 'red', marginBottom: '12px' }}>{repError}</p>}

                    <button
                        type="submit"
                        disabled={savingRep}
                        style={{
                            padding: '8px 20px',
                            backgroundColor: savingRep ? '#aaa' : '#20B2AA',
                            color: 'white', border: 'none', borderRadius: '6px',
                            cursor: savingRep ? 'not-allowed' : 'pointer', fontWeight: '600',
                        }}
                    >
                        {savingRep ? 'Subiendo...' : 'Subir informe'}
                    </button>
                </form>
            )}

            {loadingRep ? (
                <p style={{ color: '#888' }}>Cargando informes...</p>
            ) : reports.length === 0 ? (
                <div className="appointment-view gestion-item" style={{ color: '#888', fontStyle: 'italic' }}>
                    No hay informes subidos para este paciente.
                </div>
            ) : (
                reports.map((r) => {
                    const fecha = r.created_at
                        ? new Date(r.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
                        : '—';
                    const typeLabel = { laboratorio: 'Laboratorio', imagen: 'Imagen', otro: 'Otro' };
                    return (
                        <div
                            key={r.id}
                            className="appointment-view gestion-item"
                            style={{ marginBottom: '10px', borderLeft: '4px solid #20B2AA' }}
                        >
                            <div className="details-grid">
                                <span><strong>Título:</strong> {r.title}</span>
                                <span><strong>Tipo:</strong> {typeLabel[r.report_type] || r.report_type}</span>
                                <span><strong>Fecha:</strong> {fecha}</span>
                                {r.notes && <span><strong>Observaciones:</strong> {r.notes}</span>}
                            </div>
                            <a
                                href={r.cloudinary_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'inline-block', marginTop: '8px',
                                    padding: '5px 12px', backgroundColor: '#20B2AA',
                                    color: 'white', borderRadius: '6px',
                                    textDecoration: 'none', fontSize: '13px',
                                }}
                            >
                                Ver informe
                            </a>
                        </div>
                    );
                })
            )}
        </div>
    );
};

export default FichaPaciente;

