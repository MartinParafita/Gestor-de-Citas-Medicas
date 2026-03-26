import React, { useState } from 'react';
import { STATUS_COLOR, STATUS_LABEL } from '../constants';
import { parseAPIDate } from '../utils';

/**
 * GestionarCitas
 *
 * Muestra las citas activas (Pending y Completed) del paciente.
 * Solo las citas en estado Pending pueden cancelarse.
 * Usa confirmación inline en lugar de window.confirm para mejor UX.
 *
 * Props:
 *   appointments {Array}    - Lista completa de citas del paciente.
 *   onCancel     {Function} - Callback(id) para cancelar una cita.
 *   onReschedule {Function} - Callback(cita) para reagendar una cita.
 */
const GestionarCitas = ({ appointments, onCancel, onReschedule }) => {
    const [confirmingId, setConfirmingId] = useState(null); // ID de la cita con confirmación abierta
    const [cancelling, setCancelling]     = useState(null); // ID en proceso de cancelación

    const active = appointments
        .filter(a => a.status !== 'Cancelled')
        .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date));

    /**
     * handleConfirmCancel
     * Ejecuta la cancelación y cierra la confirmación inline.
     */
    const handleConfirmCancel = async (id) => {
        setCancelling(id);
        await onCancel(id);
        setCancelling(null);
        setConfirmingId(null);
    };

    return (
        <div className="cita-container">
            <h2>✏️ Gestionar Citas</h2>
            {active.length === 0 ? (
                <div className="placeholder-content">
                    <p>No tienes citas activas.</p>
                </div>
            ) : (
                active.map((cita, i) => {
                    const date = parseAPIDate(cita.appointment_date);
                    const isConfirming = confirmingId === cita.id;
                    const isCancelling = cancelling === cita.id;

                    return (
                        <div key={cita.id} className="appointment-view gestion-item">
                            <h3>Cita {i + 1} — {date ? date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</h3>
                            <div className="confirmation-row current-appointment">
                                <div className="details-grid">
                                    <span><strong>Médico:</strong> {cita.doctor_name || `ID ${cita.doctor_id}`}</span>
                                    <span><strong>Hora:</strong> {date ? date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                                    {cita.center_name && <span><strong>Centro:</strong> {cita.center_name}</span>}
                                    <span>
                                        <strong>Estado:</strong>{' '}
                                        <span style={{ color: STATUS_COLOR[cita.status] || 'gray' }}>
                                            {STATUS_LABEL[cita.status] || cita.status}
                                        </span>
                                    </span>
                                </div>
                            </div>

                            {cita.status === 'Pending' && (
                                <div className="modification-actions">
                                    {isConfirming ? (
                                        // Confirmación inline
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                                            <span style={{ fontSize: '14px', color: '#555' }}>¿Confirmar cancelación?</span>
                                            <button
                                                onClick={() => handleConfirmCancel(cita.id)}
                                                disabled={isCancelling}
                                                style={{ padding: '5px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '13px' }}
                                            >
                                                {isCancelling ? 'Cancelando...' : 'Sí, cancelar'}
                                            </button>
                                            <button
                                                onClick={() => setConfirmingId(null)}
                                                disabled={isCancelling}
                                                style={{ padding: '5px 12px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '13px' }}
                                            >
                                                No
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <button className="confirm-button" onClick={() => onReschedule(cita)}>
                                                Reagendar
                                            </button>
                                            <button
                                                className="quick-button button-cancelar cancel-btn"
                                                onClick={() => setConfirmingId(cita.id)}
                                            >
                                                Cancelar cita
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })
            )}
        </div>
    );
};

export default GestionarCitas;
