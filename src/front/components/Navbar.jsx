import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useGlobalReducer from '../hooks/useGlobalReducer';

export const Navbar = () => {
    const { store, dispatch } = useGlobalReducer();
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.removeItem("jwt_token");
        localStorage.removeItem("user_role");
        dispatch({ type: 'logout' });
        navigate('/');
    };

    const dashboardPath = store.role === 'doctor' ? '/DoctorDashboard' : '/PatientDashboard';

    return (
        <header style={styles.header}>
            <Link to="/" style={{ textDecoration: 'none' }}>
                <h1 style={styles.logo}><strong>GG Salud</strong></h1>
            </Link>
            <nav style={styles.nav}>
                {store.token ? (
                    <>
                        <span style={styles.welcome}>
                            Hola, {store.user?.first_name || 'Usuario'} {store.role === 'doctor' ? '🧑‍⚕️' : '🧍'}
                        </span>
                        <Link to={dashboardPath} style={styles.navLink}>Mi Panel</Link>
                        <button onClick={handleLogout} style={styles.logoutButton}>
                            Cerrar sesión
                        </button>
                    </>
                ) : (
                    <>
                        <Link to="/" style={styles.navLink}>Inicio</Link>
                        <Link to="/Login" style={styles.navLink}>Iniciar sesión</Link>
                        <Link to="/Register" style={styles.navLinkButton}>Registrarse</Link>
                    </>
                )}
            </nav>
        </header>
    );
};

const styles = {
    header: {
        backgroundColor: '#20B2AA',
        color: 'white',
        padding: '15px 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    logo: {
        margin: 0,
        fontSize: '1.8em',
        color: 'white',
    },
    nav: {
        display: 'flex',
        alignItems: 'center',
        gap: '15px',
    },
    welcome: {
        color: 'white',
        fontSize: '0.95em',
    },
    navLink: {
        color: 'white',
        textDecoration: 'none',
        fontSize: '1.1em',
    },
    navLinkButton: {
        color: 'white',
        textDecoration: 'none',
        fontSize: '1em',
        backgroundColor: '#FF6347',
        padding: '7px 16px',
        borderRadius: '5px',
        fontWeight: 'bold',
    },
    logoutButton: {
        backgroundColor: 'transparent',
        border: '2px solid white',
        color: 'white',
        padding: '6px 14px',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '0.95em',
    },
};

export default Navbar;
