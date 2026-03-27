import React, { useState, useEffect } from 'react';
import useGlobalReducer from '../../hooks/useGlobalReducer';
import { getMyAppointmentsDoctor, completeAppointment, getMyPatients } from '../../services/fetch';
import '../../css/DoctorDashboard.css';

import AgendaHoy from './components/AgendaHoy';
import HistorialCitas from './components/HistorialCitas';
import MisPacientes from './components/MisPacientes';
import PerfilMedico from './components/PerfilMedico';
import WelcomeDoctor from './components/WelcomeDoctor';
import Reportes from './components/Reportes';
import ComunicacionDoctor from './components/ComunicacionDoctor';
import Telemedicina from './components/Telemedicina';
import { doctorMenuData } from './constants';

/**
 * DoctorDashboard
 *
 * Componente raiz del panel del medico. Gestiona:
 *   - Carga inicial de citas al montar.
 *   - Carga lazy de pacientes (solo cuando se navega a "mis-pacientes").
 *   - Estado de navegacion entre vistas (currentView).
 *   - Menu lateral en acordeon (doctorMenuData).
 *   - Botones de acceso rapido para las acciones mas frecuentes.
 *   - Sincronizacion del store global al guardar el perfil.
 */
const DoctorDashboard = () => {
    const { store, dispatch } = useGlobalReducer();
    const [currentView, setCurrentView] = useState('welcome');
    const [openAccordion, setOpenAccordion] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [patients, setPatients] = useState([]);
    const [loadingPatients, setLoadingPatients] = useState(false);
    const [patientsFetched, setPatientsFetched] = useState(false);

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

    const handleProfileSave = (updatedUser) => {
        dispatch({ type: 'update_user', payload: updatedUser });
    };

    const loadPatients = async () => {
        if (patientsFetched) return;
        setLoadingPatients(true);
        const result = await getMyPatients();
        if (result.success) setPatients(result.data);
        setLoadingPatients(false);
        setPatientsFetched(true);
    };

    useEffect(() => {
        if (currentView === 'mis-pacientes' || currentView === 'reportes') loadPatients();
    }, [currentView]);

    const handleComplete = async (appointmentId) => {
        const result = await completeAppointment(appointmentId);
        if (result.success) {
            setAppointments(prev =>
                prev.map(a => a.id === appointmentId ? { ...a, status: 'Completed' } : a)
            );
        }
    };

    const renderContent = () => {
        if (loadingData) return <div className="placeholder-content-doctor"><p>Cargando...</p></div>;

        switch (currentView) {
            case 'agenda-hoy':
                return <AgendaHoy appointments={appointments} onComplete={handleComplete} />;
            case 'historial-citas':
                return <HistorialCitas appointments={appointments} />;
            case 'mis-pacientes':
                return <MisPacientes patients={patients} appointments={appointments} loading={loadingPatients} />;
            case 'reportes':
                return <Reportes appointments={appointments} patients={patients} />;
            case 'perfil':
                return <PerfilMedico user={store.user} onSave={handleProfileSave} />;
            case 'comunicacion':
                return <ComunicacionDoctor />;
            case 'telemedicina':
                return <Telemedicina />;
            default:
                return <WelcomeDoctor appointments={appointments} onComplete={handleComplete} onNavigate={setCurrentView} />;
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
                                <span className={`arrow ${isOpen ? 'rotated' : ''}`}>{'>'}</span>
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
                        style={{ backgroundColor: '#20B2AA', color: 'white', border: 'none', borderRadius: '8px', padding: '10px 18px', cursor: 'pointer' }}
                        onClick={() => setCurrentView('mis-pacientes')}
                    >
                        <span className="button-icon">👥</span> Mis pacientes
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
