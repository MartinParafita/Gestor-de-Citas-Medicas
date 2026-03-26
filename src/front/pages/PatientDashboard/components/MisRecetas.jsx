import React, { useState, useEffect } from 'react';
import { getMyPrescriptions } from '../../../services/fetch';

/**
 * MisRecetas
 *
 * Muestra todas las prescripciones emitidas al paciente, ordenadas de más
 * reciente a más antigua. Carga los datos al montar el componente.
 */
const MisRecetas = () => {
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading]             = useState(true);
    const [error, setError]                 = useState('');

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const result = await getMyPrescriptions();
            if (result.success) {
                setPrescriptions(result.data);
            } else {
                setError(result.message || 'Error al cargar las recetas.');
            }
            setLoading(false);
        };
        load();
    }, []);

    return (
        <div className="cita-container">
            <h2>💊 Mis Recetas</h2>

            {loading ? (
                <p style={{ color: '#888' }}>Cargando recetas...</p>
            ) : error ? (
                <p style={{ color: 'red' }}>{error}</p>
            ) : prescriptions.length === 0 ? (
                <div className="placeholder-content">
                    <p>No tienes recetas emitidas aún.</p>
                </div>
            ) : (
                <>
                    <p style={{ color: '#888', marginBottom: '16px' }}>
                        {prescriptions.length} receta(s) en tu historial.
                    </p>
                    {prescriptions.map((rx) => {
                        const fecha = rx.created_at
                            ? new Date(rx.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
                            : '—';
                        return (
                            <div
                                key={rx.id}
                                className="appointment-view gestion-item"
                                style={{ marginBottom: '12px', borderLeft: '4px solid #20B2AA' }}
                            >
                                <div className="details-grid">
                                    <span><strong>Fecha:</strong> {fecha}</span>
                                    <span><strong>Médico:</strong> {rx.doctor_name || `ID ${rx.doctor_id}`}</span>
                                    <span><strong>Medicamento:</strong> {rx.medication}</span>
                                    <span><strong>Dosis:</strong> {rx.dosage}</span>
                                    {rx.instructions && (
                                        <span><strong>Instrucciones:</strong> {rx.instructions}</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </>
            )}
        </div>
    );
};

export default MisRecetas;
