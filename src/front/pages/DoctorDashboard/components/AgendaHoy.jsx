import React, { useState } from 'react';
import { STATUS_COLOR, STATUS_LABEL } from '../constants';

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

export default AgendaHoy;
