import React, { useState } from 'react';
import { STATUS_COLOR, STATUS_LABEL } from '../constants';
import { parseAPIDate } from '../utils';

/**
 * HistorialCitas
 *
 * Muestra todas las citas del paciente con:
 *   - Resumen estadístico (totales por estado)
 *   - Filtros por estado con badge de cantidad
 *   - Borde lateral de color según el estado de cada cita
 *   - Ordenadas por fecha descendente
 *
 * Props:
 *   appointments {Array} - Lista completa de citas del paciente.
 */
const HistorialCitas = ({ appointments }) => {
    const [filter, setFilter] = useState('all');

    const sorted = [...appointments].sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date));

    const counts = {
        all:       sorted.length,
        Pending:   sorted.filter(a => a.status === 'Pending').length,
        Completed: sorted.filter(a => a.status === 'Completed').length,
        Cancelled: sorted.filter(a => a.status === 'Cancelled').length,
    };

    const filtered = filter === 'all' ? sorted : sorted.filter(a => a.status === filter);

    const tabs = [
        { key: 'all',       label: 'Todas',      color: '#6c757d' },
        { key: 'Pending',   label: 'Pendientes', color: '#fd7e14' },
        { key: 'Completed', label: 'Completadas', color: '#28a745' },
        { key: 'Cancelled', label: 'Canceladas',  color: '#dc3545' },
    ];

    const STATUS_BORDER = {
        Pending:   '#fd7e14',
        Completed: '#28a745',
        Cancelled: '#dc3545',
    };

    return (
        <div className="cita-container">
            <h2>📋 Historial de Citas</h2>

            {/* Resumen estadístico */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {tabs.slice(1).map(t => (
                    <div
                        key={t.key}
                        style={{
                            padding: '10px 18px',
                            borderRadius: '8px',
                            backgroundColor: '#f8f9fa',
                            borderLeft: `4px solid ${t.color}`,
                            minWidth: '100px',
                        }}
                    >
                        <div style={{ fontSize: '22px', fontWeight: 'bold', color: t.color }}>{counts[t.key]}</div>
                        <div style={{ fontSize: '12px', color: '#555' }}>{t.label}</div>
                    </div>
                ))}
            </div>

            {/* Filtros */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {tabs.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setFilter(t.key)}
                        style={{
                            padding: '6px 14px',
                            borderRadius: '20px',
                            border: `2px solid ${filter === t.key ? t.color : '#dee2e6'}`,
                            backgroundColor: filter === t.key ? t.color : 'white',
                            color: filter === t.key ? 'white' : '#555',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: filter === t.key ? 'bold' : 'normal',
                            transition: 'all 0.15s',
                        }}
                    >
                        {t.label}
                        <span style={{
                            marginLeft: '6px',
                            backgroundColor: filter === t.key ? 'rgba(255,255,255,0.3)' : '#e9ecef',
                            color: filter === t.key ? 'white' : '#666',
                            borderRadius: '10px',
                            padding: '1px 7px',
                            fontSize: '12px',
                        }}>
                            {counts[t.key]}
                        </span>
                    </button>
                ))}
            </div>

            {/* Lista */}
            {filtered.length === 0 ? (
                <p style={{ color: '#888' }}>No hay citas en esta categoría.</p>
            ) : (
                filtered.map((cita) => {
                    const date = parseAPIDate(cita.appointment_date);
                    return (
                        <div
                            key={cita.id}
                            className="appointment-view gestion-item"
                            style={{
                                opacity: cita.status === 'Cancelled' ? 0.7 : 1,
                                borderLeft: `4px solid ${STATUS_BORDER[cita.status] || '#ccc'}`,
                                paddingLeft: '12px',
                            }}
                        >
                            <div className="details-grid">
                                <span><strong>Fecha:</strong> {date ? date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</span>
                                <span><strong>Hora:</strong> {date ? date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                                <span><strong>Médico:</strong> {cita.doctor_name || `ID ${cita.doctor_id}`}</span>
                                {cita.center_name && <span><strong>Centro:</strong> {cita.center_name}</span>}
                                <span>
                                    <strong>Estado:</strong>{' '}
                                    <span style={{ color: STATUS_COLOR[cita.status] || 'gray', fontWeight: 'bold' }}>
                                        {STATUS_LABEL[cita.status] || cita.status}
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
