import React, { useEffect, useState } from 'react';
import {
    getDoctorCommunicationRequests,
    respondCommunicationRequest,
    closeCommunicationRequest,
} from '../../../services/fetch';

const CATEGORY_LABELS = {
    receta: 'Duda sobre receta',
    informe: 'Duda sobre informe',
    administrativa: 'Gestion administrativa',
    seguimiento: 'Seguimiento de tratamiento',
    otro: 'Otro',
};

const cardStyle = {
    background: '#f8f9fa',
    border: '1px solid #e3e6ea',
    borderRadius: '10px',
    padding: '14px',
    marginBottom: '12px',
};

const badgeColor = (status) => {
    if (status === 'open') return '#ff9800';
    if (status === 'responded') return '#2e7d32';
    if (status === 'closed') return '#6c757d';
    return '#6c757d';
};

const statusLabel = (status) => {
    if (status === 'open') return 'Abierta';
    if (status === 'responded') return 'Respondida';
    if (status === 'closed') return 'Cerrada';
    return status;
};

const ComunicacionDoctor = () => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('open');
    const [replyById, setReplyById] = useState({});
    const [savingId, setSavingId] = useState(null);
    const [closingId, setClosingId] = useState(null);
    const [error, setError] = useState('');

    const loadTickets = async (status = statusFilter) => {
        setLoading(true);
        const result = await getDoctorCommunicationRequests(status);
        if (result.success) {
            setTickets(result.data);
            setError('');
        } else {
            setError(result.message || 'No se pudo cargar la bandeja clinica.');
        }
        setLoading(false);
    };

    useEffect(() => {
        loadTickets(statusFilter);
    }, [statusFilter]);

    const handleRespond = async (ticketId) => {
        const responseText = (replyById[ticketId] || '').trim();
        if (!responseText) {
            setError('Debes escribir una respuesta antes de enviar.');
            return;
        }
        setSavingId(ticketId);
        const result = await respondCommunicationRequest(ticketId, responseText);
        setSavingId(null);
        if (!result.success) {
            setError(result.message || 'No se pudo enviar la respuesta.');
            return;
        }
        setTickets((prev) => prev.map((t) => (t.id === ticketId ? result.data : t)));
        setReplyById((prev) => ({ ...prev, [ticketId]: '' }));
    };

    const handleClose = async (ticketId) => {
        setClosingId(ticketId);
        const result = await closeCommunicationRequest(ticketId, 'doctor');
        setClosingId(null);
        if (!result.success) {
            setError(result.message || 'No se pudo cerrar la solicitud.');
            return;
        }
        setTickets((prev) => prev.map((t) => (t.id === ticketId ? result.data : t)));
    };

    return (
        <div className="cita-container">
            <h2>Comunicacion con pacientes</h2>
            <p style={{ color: '#6c757d', marginBottom: '12px' }}>
                Bandeja asincronica para responder consultas no urgentes.
            </p>

            <div style={{ marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <label><strong>Filtro:</strong></label>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #ccc' }}
                >
                    <option value="open">Abiertas</option>
                    <option value="responded">Respondidas</option>
                    <option value="closed">Cerradas</option>
                    <option value="">Todas</option>
                </select>
                <button
                    onClick={() => loadTickets(statusFilter)}
                    style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#20B2AA', color: 'white', cursor: 'pointer' }}
                >
                    Recargar
                </button>
            </div>

            {error && <p style={{ color: 'red', marginBottom: '10px' }}>{error}</p>}

            {loading ? (
                <p style={{ color: '#888' }}>Cargando bandeja...</p>
            ) : tickets.length === 0 ? (
                <p style={{ color: '#888' }}>No hay solicitudes en este filtro.</p>
            ) : (
                tickets.map((t) => (
                    <div key={t.id} style={cardStyle}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                            <strong>{t.subject}</strong>
                            <span style={{ color: badgeColor(t.status), fontWeight: 'bold' }}>
                                {statusLabel(t.status)}
                            </span>
                        </div>

                        <p style={{ margin: '0 0 6px', color: '#555' }}>
                            <strong>Paciente:</strong> {t.patient_name || `ID ${t.patient_id}`}
                        </p>
                        <p style={{ margin: '0 0 6px', color: '#555' }}>
                            <strong>Categoria:</strong> {CATEGORY_LABELS[t.category] || t.category}
                        </p>
                        <p style={{ margin: '0 0 8px', color: '#444' }}>{t.message}</p>

                        {t.doctor_response && (
                            <div style={{ background: '#eef8f7', border: '1px solid #c9e9e5', borderRadius: '8px', padding: '10px', marginBottom: '8px' }}>
                                <strong>Respuesta enviada</strong>
                                <p style={{ margin: '6px 0 0' }}>{t.doctor_response}</p>
                            </div>
                        )}

                        {t.status !== 'closed' && (
                            <div>
                                <textarea
                                    value={replyById[t.id] || ''}
                                    onChange={(e) => setReplyById((prev) => ({ ...prev, [t.id]: e.target.value }))}
                                    rows={3}
                                    placeholder="Escribe tu respuesta..."
                                    style={{ display: 'block', width: '100%', marginBottom: '8px', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}
                                />
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    <button
                                        onClick={() => handleRespond(t.id)}
                                        disabled={savingId === t.id}
                                        style={{
                                            padding: '6px 12px',
                                            border: 'none',
                                            borderRadius: '6px',
                                            background: savingId === t.id ? '#adb5bd' : '#20B2AA',
                                            color: 'white',
                                            cursor: savingId === t.id ? 'not-allowed' : 'pointer',
                                        }}
                                    >
                                        {savingId === t.id ? 'Enviando...' : 'Responder'}
                                    </button>
                                    <button
                                        onClick={() => handleClose(t.id)}
                                        disabled={closingId === t.id}
                                        style={{
                                            padding: '6px 12px',
                                            border: 'none',
                                            borderRadius: '6px',
                                            background: '#6c757d',
                                            color: 'white',
                                            cursor: closingId === t.id ? 'not-allowed' : 'pointer',
                                        }}
                                    >
                                        {closingId === t.id ? 'Cerrando...' : 'Cerrar'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))
            )}
        </div>
    );
};

export default ComunicacionDoctor;
