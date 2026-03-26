import React, { useState } from 'react';
import FichaPaciente from './FichaPaciente';

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

export default MisPacientes;

