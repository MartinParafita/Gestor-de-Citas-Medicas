import React, { useEffect, useState } from 'react';
import {
    createCommunicationRequest,
    getMyCommunicationDoctors,
    getMyCommunicationRequests,
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

const ComunicacionPaciente = () => {
    const [tickets, setTickets] = useState([]);
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [closingId, setClosingId] = useState(null);
    const [doctorId, setDoctorId] = useState('');
    const [category, setCategory] = useState('receta');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const loadTickets = async () => {
        setLoading(true);
        const [ticketsResult, doctorsResult] = await Promise.all([
            getMyCommunicationRequests(),
            getMyCommunicationDoctors(),
        ]);

        if (ticketsResult.success) {
            setTickets(ticketsResult.data);
        } else {
            setError(ticketsResult.message || 'No se pudo cargar la bandeja de comunicacion.');
        }

        if (doctorsResult.success) {
            setDoctors(doctorsResult.data);
            if (doctorsResult.data.length > 0 && !doctorId) {
                setDoctorId(String(doctorsResult.data[0].id));
            }
        } else {
            setError(doctorsResult.message || 'No se pudo cargar la lista de medicos habilitados.');
        }
        setLoading(false);
    };

    useEffect(() => {
        loadTickets();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        if (!doctorId) {
            setError('Debes seleccionar un medico con quien ya hayas tenido una cita.');
            return;
        }
        setSending(true);
        const result = await createCommunicationRequest({
            doctorId: Number(doctorId),
            category,
            subject,
            message,
        });
        setSending(false);

        if (!result.success) {
            setError(result.message || 'No se pudo crear la solicitud.');
            return;
        }

        setTickets((prev) => [result.data, ...prev]);
        setSubject('');
        setMessage('');
        setCategory('receta');
        setSuccess('Solicitud enviada. Tu medico respondera cuando este disponible.');
    };

    const handleClose = async (ticketId) => {
        setClosingId(ticketId);
        const result = await closeCommunicationRequest(ticketId, 'paciente');
        setClosingId(null);
        if (!result.success) {
            setError(result.message || 'No se pudo cerrar la solicitud.');
            return;
        }
        setTickets((prev) => prev.map((t) => (t.id === ticketId ? result.data : t)));
    };

    return (
        <div className="cita-container">
            <h2>Comunicacion con tu medico</h2>
            <p style={{ color: '#6c757d', marginBottom: '14px' }}>
                Canal asincronico para consultas no urgentes. No usar para emergencias.
            </p>

            <form onSubmit={handleSubmit} style={{ ...cardStyle, marginBottom: '16px' }}>
                <h4 style={{ marginTop: 0, marginBottom: '10px' }}>Nueva solicitud</h4>

                <div style={{ marginBottom: '10px' }}>
                    <label><strong>Medico</strong></label>
                    <select
                        value={doctorId}
                        onChange={(e) => setDoctorId(e.target.value)}
                        style={{ display: 'block', width: '100%', marginTop: '6px', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}
                    >
                        {doctors.length === 0 ? (
                            <option value="">No hay medicos habilitados aun</option>
                        ) : (
                            doctors.map((d) => (
                                <option key={d.id} value={d.id}>
                                    Dr/a. {d.first_name} {d.last_name}{d.specialty ? ` - ${d.specialty}` : ''}
                                </option>
                            ))
                        )}
                    </select>
                    <p style={{ margin: '6px 0 0', fontSize: '0.85em', color: '#6c757d' }}>
                        Solo puedes contactar medicos con los que ya tuviste una cita pasada.
                    </p>
                </div>

                <div style={{ marginBottom: '10px' }}>
                    <label><strong>Categoria</strong></label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        style={{ display: 'block', width: '100%', marginTop: '6px', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}
                    >
                        {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                </div>

                <div style={{ marginBottom: '10px' }}>
                    <label><strong>Asunto</strong></label>
                    <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        required
                        placeholder="Ej: Duda sobre dosis de la medicacion"
                        style={{ display: 'block', width: '100%', marginTop: '6px', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}
                    />
                </div>

                <div style={{ marginBottom: '12px' }}>
                    <label><strong>Mensaje</strong></label>
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        required
                        minLength={10}
                        rows={4}
                        placeholder="Describe tu consulta con detalle (minimo 10 caracteres)."
                        style={{ display: 'block', width: '100%', marginTop: '6px', padding: '8px', borderRadius: '6px', border: '1px solid #ccc' }}
                    />
                </div>

                {error && <p style={{ color: 'red', marginBottom: '10px' }}>{error}</p>}
                {success && <p style={{ color: 'green', marginBottom: '10px' }}>{success}</p>}

                <button
                    type="submit"
                    disabled={sending || doctors.length === 0}
                    style={{
                        padding: '8px 16px',
                        border: 'none',
                        borderRadius: '8px',
                        background: sending ? '#adb5bd' : '#20B2AA',
                        color: 'white',
                        cursor: sending ? 'not-allowed' : 'pointer',
                    }}
                >
                    {doctors.length === 0 ? 'Sin medicos disponibles' : sending ? 'Enviando...' : 'Enviar solicitud'}
                </button>
            </form>

            <h4 style={{ marginBottom: '10px' }}>Mis solicitudes</h4>
            {loading ? (
                <p style={{ color: '#888' }}>Cargando bandeja...</p>
            ) : tickets.length === 0 ? (
                <p style={{ color: '#888' }}>Todavia no has enviado consultas.</p>
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
                            <strong>Categoria:</strong> {CATEGORY_LABELS[t.category] || t.category}
                        </p>
                        <p style={{ margin: '0 0 8px', color: '#444' }}>{t.message}</p>
                        <p style={{ margin: '0 0 8px', color: '#6c757d', fontSize: '0.9em' }}>
                            Creada el {new Date(t.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>

                        {t.doctor_response && (
                            <div style={{ background: '#eef8f7', border: '1px solid #c9e9e5', borderRadius: '8px', padding: '10px', marginBottom: '8px' }}>
                                <strong>Respuesta del medico</strong>
                                <p style={{ margin: '6px 0 0' }}>{t.doctor_response}</p>
                            </div>
                        )}

                        {t.status !== 'closed' && (
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
                                {closingId === t.id ? 'Cerrando...' : 'Cerrar solicitud'}
                            </button>
                        )}
                    </div>
                ))
            )}
        </div>
    );
};

export default ComunicacionPaciente;
