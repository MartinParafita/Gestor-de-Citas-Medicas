import React from 'react';
import { Link } from 'react-router-dom';
import HeroSection from '../components/HeroSection';
import useGlobalReducer from '../hooks/useGlobalReducer';

export const Home = () => {
    const { store } = useGlobalReducer();
    const dashboardPath = store.role === 'doctor' ? '/DoctorDashboard' : '/PatientDashboard';

    return (
        <div>
            <HeroSection />

            <div style={styles.ctaSection}>
                {store.token ? (
                    <Link to={dashboardPath} style={styles.primaryButton}>
                        Ir a Mi Panel →
                    </Link>
                ) : (
                    <>
                        <Link to="/Login" style={styles.primaryButton}>
                            Iniciar sesión
                        </Link>
                        <Link to="/Register" style={styles.secondaryButton}>
                            Crear cuenta gratis
                        </Link>
                    </>
                )}
            </div>

            <div style={styles.featuresSection}>
                <div style={styles.feature}>
                    <span style={styles.featureIcon}>📅</span>
                    <h3>Citas Online</h3>
                    <p>Reserva tu cita médica en segundos, sin esperas ni llamadas.</p>
                </div>
                <div style={styles.feature}>
                    <span style={styles.featureIcon}>🧑‍⚕️</span>
                    <h3>Especialistas Verificados</h3>
                    <p>Accede a médicos cualificados en múltiples especialidades.</p>
                </div>
                <div style={styles.feature}>
                    <span style={styles.featureIcon}>🔒</span>
                    <h3>Datos Seguros</h3>
                    <p>Tu información médica protegida con los más altos estándares.</p>
                </div>
            </div>
        </div>
    );
};

const styles = {
    ctaSection: {
        display: 'flex',
        justifyContent: 'center',
        gap: '20px',
        padding: '40px 20px',
        backgroundColor: '#fff',
    },
    primaryButton: {
        backgroundColor: '#20B2AA',
        color: 'white',
        padding: '14px 32px',
        textDecoration: 'none',
        borderRadius: '8px',
        fontSize: '1.1em',
        fontWeight: 'bold',
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        color: '#20B2AA',
        padding: '14px 32px',
        textDecoration: 'none',
        borderRadius: '8px',
        fontSize: '1.1em',
        fontWeight: 'bold',
        border: '2px solid #20B2AA',
    },
    featuresSection: {
        display: 'flex',
        justifyContent: 'center',
        gap: '40px',
        padding: '60px 40px',
        backgroundColor: '#F0F8FF',
        flexWrap: 'wrap',
    },
    feature: {
        textAlign: 'center',
        maxWidth: '220px',
    },
    featureIcon: {
        fontSize: '3em',
    },
};
