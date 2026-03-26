import React from 'react';

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

export default HistorialCitas;
