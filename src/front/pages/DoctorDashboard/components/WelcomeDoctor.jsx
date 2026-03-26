import React from 'react';
import { STATUS_LABEL } from '../constants';

/**
 * WelcomeDoctor
 *
 * Vista inicial del panel del médico. Muestra un resumen accionable del día:
 *   - Citas de hoy (con botón para marcarlas como completadas).
 *   - Próximas 3 citas futuras.
 *
 * No realiza llamadas a la API; recibe las citas ya cargadas desde DoctorDashboard.
 *
 * @param {{ appointments: Array, onComplete: Function, onNavigate: Function }} props
 *   - appointments : lista completa de citas del médico.
 *   - onComplete   : callback para marcar una cita como completada.
 *   - onNavigate   : callback para cambiar la vista del dashboard.
 */
const WelcomeDoctor = ({ appointments, onComplete, onNavigate }) => {
    const now      = new Date();
    const todayStr = now.toDateString();

    const todayAppts = appointments
        .filter(a => a.status !== 'Cancelled' && new Date(a.appointment_date).toDateString() === todayStr)
        .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date));

    const upcoming = appointments
        .filter(a => a.status !== 'Cancelled' && new Date(a.appointment_date) > now && new Date(a.appointment_date).toDateString() !== todayStr)
        .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date))
        .slice(0, 3);

    const fmt = (iso, opts) => new Date(iso).toLocaleString('es-ES', opts);

    return (
        <div className="welcome-doctor">
            {/* Citas de hoy */}
            <div className="welcome-section">
                <div className="welcome-section-header">
                    <h3>Citas de hoy ({todayAppts.length})</h3>
                    <button className="see-all-link" onClick={() => onNavigate('agenda-hoy')}>
                        Ver agenda completa →
                    </button>
                </div>
                {todayAppts.length === 0 ? (
                    <p className="welcome-empty">No tienes citas programadas para hoy.</p>
                ) : (
                    <div className="welcome-appt-list">
                        {todayAppts.map(a => (
                            <div key={a.id} className="welcome-appt-item">
                                <span className="welcome-appt-time">
                                    {fmt(a.appointment_date, { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className="welcome-appt-patient">{a.patient_name}</span>
                                <span className={`appointment-status status-${a.status.toLowerCase()}`}>
                                    {STATUS_LABEL[a.status] || a.status}
                                </span>
                                {a.status === 'Pending' && (
                                    <button
                                        className="action-button tertiary"
                                        style={{ padding: '4px 12px', fontSize: '0.8em' }}
                                        onClick={() => onComplete(a.id)}
                                    >
                                        Completar
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Próximas citas */}
            <div className="welcome-section">
                <div className="welcome-section-header">
                    <h3>Próximas citas</h3>
                    <button className="see-all-link" onClick={() => onNavigate('historial-citas')}>
                        Ver historial →
                    </button>
                </div>
                {upcoming.length === 0 ? (
                    <p className="welcome-empty">No hay citas futuras programadas.</p>
                ) : (
                    <div className="welcome-appt-list">
                        {upcoming.map(a => (
                            <div key={a.id} className="welcome-appt-item">
                                <span className="welcome-appt-date">
                                    {fmt(a.appointment_date, { weekday: 'short', day: 'numeric', month: 'short' })}
                                </span>
                                <span className="welcome-appt-time">
                                    {fmt(a.appointment_date, { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className="welcome-appt-patient">{a.patient_name}</span>
                                <span className={`appointment-status status-${a.status.toLowerCase()}`}>
                                    {STATUS_LABEL[a.status] || a.status}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WelcomeDoctor;
