import React, { useState, useEffect } from 'react';
import { getMyReports } from '../../../services/fetch';
import { REPORT_TYPE_LABEL } from '../constants';

/**
 * ResultadosInformes
 *
 * Muestra los informes médicos subidos por los médicos del paciente.
 * Solo lectura: el paciente puede ver y descargar, no subir ni borrar.
 */
const ResultadosInformes = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            const result = await getMyReports();
            if (result.success) setReports(result.data);
            setLoading(false);
        };
        load();
    }, []);

    if (loading) return <p style={{ color: '#888' }}>Cargando informes...</p>;

    return (
        <div className="cita-container">
            <h2>🔬 Resultados e Informes</h2>
            {reports.length === 0 ? (
                <p style={{ color: '#888' }}>No tienes informes médicos registrados aún.</p>
            ) : (
                reports.map((r) => {
                    const fecha = r.created_at
                        ? new Date(r.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
                        : '—';
                    return (
                        <div
                            key={r.id}
                            className="appointment-view gestion-item"
                            style={{ marginBottom: '12px', borderLeft: '4px solid #20B2AA' }}
                        >
                            <div className="details-grid">
                                <span><strong>Título:</strong> {r.title}</span>
                                <span><strong>Tipo:</strong> {REPORT_TYPE_LABEL[r.report_type] || r.report_type}</span>
                                <span><strong>Médico:</strong> Dr/a. {r.doctor_name}</span>
                                <span><strong>Fecha:</strong> {fecha}</span>
                                {r.notes && <span><strong>Notas:</strong> {r.notes}</span>}
                            </div>
                            <a
                                href={r.cloudinary_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                    display: 'inline-block',
                                    marginTop: '10px',
                                    padding: '6px 14px',
                                    backgroundColor: '#20B2AA',
                                    color: 'white',
                                    borderRadius: '6px',
                                    textDecoration: 'none',
                                    fontSize: '14px',
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

export default ResultadosInformes;
