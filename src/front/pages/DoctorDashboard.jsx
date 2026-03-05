import React, { useState, useEffect } from 'react';
import useGlobalReducer from '../hooks/useGlobalReducer';
import { getMyAppointmentsDoctor } from '../services/fetch';
import '../css/DoctorDashboard.css';

// ── Vista: Agenda del día ─────────────────────────────────────────────────────

const AgendaHoy = ({ appointments }) => {
    const today = new Date();
    const todayStr = today.toDateString();

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
                                <span><strong>Estado:</strong> <span style={{ color: cita.status === 'Pending' ? 'orange' : 'green' }}>{cita.status}</span></span>
                            </div>
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

// ── Vista: Historial de citas ─────────────────────────────────────────────────

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

// ── Vista: Perfil del médico ──────────────────────────────────────────────────

const PerfilMedico = ({ user }) => (
    <div className="cita-container">
        <h2>⚙️ Mi Perfil</h2>
        {user ? (
            <div className="appointment-view gestion-item">
                <div className="details-grid">
                    <span><strong>Nombre:</strong> {user.first_name} {user.last_name}</span>
                    <span><strong>Email:</strong> {user.email}</span>
                    <span><strong>Especialidad:</strong> {user.specialty || '—'}</span>
                    <span><strong>Días de trabajo / semana:</strong> {user.work_days ?? '—'}</span>
                    <span><strong>Estado:</strong> {user.is_active ? '✅ Activo' : '❌ Inactivo'}</span>
                </div>
            </div>
        ) : (
            <p>No se pudieron cargar los datos del perfil.</p>
        )}
    </div>
);

// ── Menú del médico ───────────────────────────────────────────────────────────

const doctorMenuData = [
    {
        title: '1. Agenda y citas', icon: '📅',
        links: [
            { name: 'Citas de hoy y próximas', view: 'agenda-hoy' },
            { name: 'Historial de citas', view: 'historial-citas' },
        ],
    },
    { title: '2. Información de pacientes', icon: '📄', links: [{ name: 'Próximamente', view: 'placeholder' }] },
    { title: '3. Prescripciones', icon: '✍️', links: [{ name: 'Próximamente', view: 'placeholder' }] },
    { title: '4. Comunicación', icon: '💬', links: [{ name: 'Próximamente', view: 'placeholder' }] },
    { title: '5. Reportes y estadísticas', icon: '📈', links: [{ name: 'Próximamente', view: 'placeholder' }] },
    {
        title: '6. Administración y perfil', icon: '⚙️',
        links: [{ name: 'Mi perfil', view: 'perfil' }],
    },
    { title: '7. Telemedicina', icon: '💻', links: [{ name: 'Próximamente', view: 'placeholder' }] },
];

// ── Dashboard principal ───────────────────────────────────────────────────────

const DoctorDashboard = () => {
    const { store } = useGlobalReducer();
    const [currentView, setCurrentView]     = useState('welcome');
    const [openAccordion, setOpenAccordion] = useState(null);
    const [appointments, setAppointments]   = useState([]);
    const [loadingData, setLoadingData]     = useState(true);

    const doctorName = store.user
        ? `Dr/a. ${store.user.first_name} ${store.user.last_name}`
        : 'Médico';

    useEffect(() => {
        const load = async () => {
            setLoadingData(true);
            const result = await getMyAppointmentsDoctor();
            if (result.success) setAppointments(result.data);
            setLoadingData(false);
        };
        load();
    }, []);

    const todayCount = appointments.filter(a => {
        if (a.status === 'Cancelled') return false;
        const d = a.appointment_date ? new Date(a.appointment_date) : null;
        return d && d.toDateString() === new Date().toDateString();
    }).length;

    const renderContent = () => {
        if (loadingData) return <div className="placeholder-content-doctor"><p>Cargando...</p></div>;

        switch (currentView) {
            case 'agenda-hoy':
                return <AgendaHoy appointments={appointments} />;
            case 'historial-citas':
                return <HistorialCitas appointments={appointments} />;
            case 'perfil':
                return <PerfilMedico user={store.user} />;
            case 'placeholder':
                return (
                    <div className="placeholder-content-doctor">
                        <h3>🚧 Próximamente</h3>
                        <p>Esta sección está en desarrollo.</p>
                    </div>
                );
            default:
                return (
                    <div className="placeholder-content-doctor">
                        <h3>Resumen del día</h3>
                        <p>Tienes <strong>{todayCount}</strong> cita(s) para hoy.</p>
                        <p>Total citas activas: <strong>{appointments.filter(a => a.status !== 'Cancelled').length}</strong></p>
                        <br />
                        <p>Usa el menú lateral para navegar.</p>
                    </div>
                );
        }
    };

    return (
        <div className="dashboard-container">
            <div className="sidebar">
                <h2 className="main-title-doctor">👨‍⚕️ Panel del Médico</h2>

                {doctorMenuData.map((item) => {
                    const isOpen = openAccordion === item.title;
                    return (
                        <div key={item.title} className="accordion-item">
                            <div className="accordion-header" onClick={() => setOpenAccordion(isOpen ? null : item.title)}>
                                <div><span className="icon">{item.icon}</span> {item.title}</div>
                                <span className={`arrow ${isOpen ? 'rotated' : ''}`}>&gt;</span>
                            </div>
                            <div className={`accordion-content ${isOpen ? 'active' : ''}`}>
                                {item.links.map((link) => (
                                    <a
                                        key={link.name}
                                        href="#"
                                        className="secondary-link"
                                        onClick={(e) => { e.preventDefault(); setCurrentView(link.view); }}
                                    >
                                        {link.name}
                                    </a>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="content">
                <h1>Bienvenido, {doctorName}</h1>
                <p>Gestiona tu agenda y tus pacientes desde aquí.</p>

                <div className="quick-access-buttons" style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                    <button
                        className="quick-button button-agenda"
                        onClick={() => setCurrentView('agenda-hoy')}
                    >
                        <span className="button-icon">📅</span> Agenda hoy
                    </button>
                    <button
                        className="quick-button button-modificar"
                        onClick={() => setCurrentView('historial-citas')}
                    >
                        <span className="button-icon">📋</span> Historial
                    </button>
                    <button
                        className="quick-button"
                        style={{ backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 18px', cursor: 'pointer' }}
                        onClick={() => setCurrentView('perfil')}
                    >
                        <span className="button-icon">⚙️</span> Mi perfil
                    </button>
                </div>

                {renderContent()}
            </div>
        </div>
    );
};

export default DoctorDashboard;
