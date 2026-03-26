import React, { useState, useEffect } from 'react';
import useGlobalReducer from '../../hooks/useGlobalReducer';
import { getMyAppointments, cancelAppointmentAPI, getDoctors, getCenters } from '../../services/fetch';
import '../../css/PatientDashboard.css';

import AgendarCita          from './components/AgendarCita';
import GestionarCitas       from './components/GestionarCitas';
import HistorialCitas       from './components/HistorialCitas';
import PerfilPaciente       from './components/PerfilPaciente';
import MisRecetas           from './components/MisRecetas';
import ResultadosInformes   from './components/ResultadosInformes';
import DocumentosPersonales from './components/DocumentosPersonales';
import WelcomePatient       from './components/WelcomePatient';
import { patientMenuData }  from './constants';

/**
 * PatientDashboard
 *
 * Componente raíz del panel del paciente. Gestiona:
 *   - Carga inicial de citas, médicos y centros en paralelo.
 *   - Estado de navegación entre vistas (currentView).
 *   - Menú lateral en acordeón (patientMenuData).
 *   - Botones de acceso rápido para las acciones más frecuentes.
 *   - Sincronización del store global al guardar el perfil.
 *
 * Vistas disponibles:
 *   "welcome"              → WelcomePatient (próxima cita + última receta + CTA agendar).
 *   "agendar-cita"         → AgendarCita (calendario + selección de médico).
 *   "gestionar-citas"      → GestionarCitas (cancelar / reagendar citas activas).
 *   "historial-citas"      → HistorialCitas (todas las citas con filtros por estado).
 *   "mis-recetas"          → MisRecetas (prescripciones emitidas por cualquier médico).
 *   "perfil"               → PerfilPaciente (editar email, fecha de nacimiento y contraseña).
 *   "resultados-informes"  → ResultadosInformes (informes médicos subidos por médicos).
 *   "documentos-personales"→ DocumentosPersonales (DNI y tarjeta sanitaria).
 *   "placeholder"          → Vista temporal para secciones en desarrollo.
 */
const PatientDashboard = () => {
    const { store, dispatch } = useGlobalReducer();
    const [currentView, setCurrentView]           = useState('welcome');
    const [openAccordion, setOpenAccordion]       = useState(null);
    const [appointments, setAppointments]         = useState([]);
    const [doctors, setDoctors]                   = useState([]);
    const [centers, setCenters]                   = useState([]);
    const [loadingData, setLoadingData]           = useState(true);
    const [citaToReschedule, setCitaToReschedule] = useState(null);

    const patientName = store.user
        ? `${store.user.first_name} ${store.user.last_name}`
        : 'Paciente';

    useEffect(() => {
        const load = async () => {
            setLoadingData(true);
            const [apptResult, docResult, centerResult] = await Promise.all([
                getMyAppointments(),
                getDoctors(),
                getCenters(),
            ]);
            if (apptResult.success)   setAppointments(apptResult.data);
            if (docResult.success)    setDoctors(docResult.data);
            if (centerResult.success) setCenters(centerResult.data);
            setLoadingData(false);
        };
        load();
    }, []);

    /**
     * handleAppointmentConfirmed
     * Añade la nueva cita al estado local y redirige a "Gestionar citas".
     * También limpia el estado de reagendamiento si estaba activo.
     */
    const handleAppointmentConfirmed = (newAppt) => {
        setAppointments(prev => [...prev, newAppt]);
        setCitaToReschedule(null);
        setCurrentView('gestionar-citas');
    };

    /**
     * handleCancel
     * Cancela una cita llamando a la API.
     * Si tiene éxito, actualiza el estado local sin recargar.
     *
     * @param {number} id - ID de la cita a cancelar.
     */
    const handleCancel = async (id) => {
        const result = await cancelAppointmentAPI(id);
        if (result.success) {
            setAppointments(prev => prev.map(a => a.id === id ? result.data : a));
        }
    };

    /**
     * handleReschedule
     * Guarda la cita a reagendar en estado y navega al calendario de agendamiento.
     *
     * @param {Object} cita - Cita a reagendar.
     */
    const handleReschedule = (cita) => {
        setCitaToReschedule(cita);
        setCurrentView('agendar-cita');
    };

    /**
     * handleProfileSave
     * Recibe los datos actualizados del paciente desde PerfilPaciente
     * y los sincroniza en el store global.
     */
    const handleProfileSave = (updatedUser) => {
        dispatch({ type: 'update_user', payload: updatedUser });
    };

    const renderContent = () => {
        if (loadingData) return <div className="placeholder-content"><p>Cargando...</p></div>;

        switch (currentView) {
            case 'agendar-cita':
                return (
                    <AgendarCita
                        patientName={patientName}
                        doctors={doctors}
                        centers={centers}
                        onConfirm={handleAppointmentConfirmed}
                        existingAppointments={appointments}
                    />
                );
            case 'gestionar-citas':
                return (
                    <GestionarCitas
                        appointments={appointments}
                        onCancel={handleCancel}
                        onReschedule={handleReschedule}
                    />
                );
            case 'historial-citas':
                return <HistorialCitas appointments={appointments} />;
            case 'mis-recetas':
                return <MisRecetas />;
            case 'perfil':
                return (
                    <PerfilPaciente
                        user={store.user}
                        onSave={handleProfileSave}
                    />
                );
            case 'resultados-informes':
                return <ResultadosInformes />;
            case 'documentos-personales':
                return <DocumentosPersonales />;
            case 'placeholder':
                return (
                    <div className="placeholder-content">
                        <h3>🚧 Próximamente</h3>
                        <p>Esta sección está en desarrollo.</p>
                    </div>
                );
            default:
                return (
                    <WelcomePatient
                        appointments={appointments}
                        onNavigate={setCurrentView}
                        onCancel={handleCancel}
                        onReschedule={handleReschedule}
                    />
                );
        }
    };

    return (
        <div className="dashboard-container">
            <div className="sidebar">
                <h2 className="main-title">👋 Panel del Paciente</h2>

                {patientMenuData.map((item) => {
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
                <h1>Bienvenido/a, {patientName}</h1>
                <p>Tu información de salud a un clic.</p>

                <div className="quick-access-buttons">
                    <button className="quick-button button-agenda" onClick={() => setCurrentView('agendar-cita')}>
                        <span className="button-icon">📅</span> Agendar cita
                    </button>
                    <button className="quick-button button-modificar" onClick={() => setCurrentView('gestionar-citas')}>
                        <span className="button-icon">✏️</span> Gestionar citas
                    </button>
                    <button className="quick-button" style={{ backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 18px', cursor: 'pointer' }} onClick={() => setCurrentView('historial-citas')}>
                        <span className="button-icon">📋</span> Historial
                    </button>
                    <button className="quick-button" style={{ backgroundColor: '#20B2AA', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 18px', cursor: 'pointer' }} onClick={() => setCurrentView('mis-recetas')}>
                        <span className="button-icon">💊</span> Mis recetas
                    </button>
                </div>

                {renderContent()}
            </div>
        </div>
    );
};

export default PatientDashboard;
