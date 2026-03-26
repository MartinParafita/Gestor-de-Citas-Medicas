import React, { useState, useEffect } from 'react';
import { getMyPrescriptions } from '../../../services/fetch';
import { STATUS_LABEL } from '../constants';

/**
 * WelcomePatient
 *
 * Vista inicial del panel del paciente. Muestra un resumen accionable:
 *   - Próxima cita (con botones de cancelar / reagendar si está Pendiente).
 *   - Última receta emitida (cargada desde la API al montar).
 *
 * Recibe las citas ya cargadas desde PatientDashboard.
 * Las recetas se cargan internamente para no afectar el estado global.
 *
 * @param {{ appointments: Array, onNavigate: Function, onCancel: Function, onReschedule: Function }} props
 */
const WelcomePatient = ({ appointments, onNavigate, onCancel, onReschedule }) => {
    const [lastRx, setLastRx]       = useState(null);
    const [loadingRx, setLoadingRx] = useState(true);

    useEffect(() => {
        getMyPrescriptions().then(r => {
            if (r.success && r.data.length > 0) setLastRx(r.data[0]);
            setLoadingRx(false);
        });
    }, []);

    const now      = new Date();
    const nextAppt = appointments
        .filter(a => a.status !== 'Cancelled' && new Date(a.appointment_date) > now)
        .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date))[0] || null;

    const fmt = (iso, opts) => new Date(iso).toLocaleString('es-ES', opts);

    return (
        <div className="welcome-patient">
            {/* Próxima cita */}
            <div className="welcome-section">
                <div className="welcome-section-header">
                    <h3>Tu próxima cita</h3>
                    <button className="see-all-link" onClick={() => onNavigate('gestionar-citas')}>
                        Ver todas →
                    </button>
                </div>
                {!nextAppt ? (
                    <div className="welcome-no-appt">
                        <p className="welcome-empty">No tienes citas próximas programadas.</p>
                        <button className="welcome-cta-btn" onClick={() => onNavigate('agendar-cita')}>
                            + Agendar nueva cita
                        </button>
                    </div>
                ) : (
                    <div className="welcome-next-appt">
                        <div className="welcome-next-date-block">
                            <span className="welcome-next-weekday">
                                {fmt(nextAppt.appointment_date, { weekday: 'long', day: 'numeric', month: 'long' })}
                            </span>
                            <span className="welcome-next-time">
                                {fmt(nextAppt.appointment_date, { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                        <div className="welcome-next-info-row">
                            <span className="welcome-next-doctor">Dr/a. {nextAppt.doctor_name}</span>
                            <span className={`appointment-status status-${nextAppt.status.toLowerCase()}`}>
                                {STATUS_LABEL[nextAppt.status] || nextAppt.status}
                            </span>
                        </div>
                        {nextAppt.center_name && (
                            <div style={{ fontSize: '0.85em', color: '#6c757d', marginTop: '4px' }}>
                                {nextAppt.center_name}
                            </div>
                        )}
                        {nextAppt.status === 'Pending' && (
                            <div className="welcome-next-actions">
                                <button className="welcome-btn-cancel" onClick={() => onCancel(nextAppt.id)}>
                                    Cancelar
                                </button>
                                <button className="welcome-btn-reschedule" onClick={() => onReschedule(nextAppt)}>
                                    Reagendar
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Última receta */}
            <div className="welcome-section">
                <div className="welcome-section-header">
                    <h3>Última receta</h3>
                    <button className="see-all-link" onClick={() => onNavigate('mis-recetas')}>
                        Ver todas →
                    </button>
                </div>
                {loadingRx ? (
                    <p className="welcome-empty">Cargando...</p>
                ) : !lastRx ? (
                    <p className="welcome-empty">No tienes recetas registradas.</p>
                ) : (
                    <div className="welcome-rx-card">
                        <div className="welcome-rx-med">{lastRx.medication}</div>
                        <div className="welcome-rx-dosage">{lastRx.dosage}</div>
                        {lastRx.instructions && (
                            <div className="welcome-rx-inst">{lastRx.instructions}</div>
                        )}
                        <div className="welcome-rx-meta">
                            <span>Dr/a. {lastRx.doctor_name}</span>
                            <span>{fmt(lastRx.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WelcomePatient;
