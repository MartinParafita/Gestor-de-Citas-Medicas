import React from 'react';

const cardStyle = {
    background: '#f8f9fa',
    border: '1px solid #e3e6ea',
    borderRadius: '10px',
    padding: '16px',
    marginBottom: '12px',
};

const Telemedicina = () => {
    return (
        <div className="cita-container">
            <h2>Telemedicina</h2>
            <p style={{ color: '#6c757d', marginBottom: '18px' }}>
                Seccion base preparada para consultas virtuales en una siguiente fase.
            </p>

            <div style={cardStyle}>
                <h4 style={{ marginTop: 0, marginBottom: '8px' }}>Sala virtual</h4>
                <p style={{ margin: 0, color: '#495057' }}>
                    Proximamente podras iniciar videollamada, compartir notas y registrar el cierre de la sesion.
                </p>
            </div>
        </div>
    );
};

export default Telemedicina;

