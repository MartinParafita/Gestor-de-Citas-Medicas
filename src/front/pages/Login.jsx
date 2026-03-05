import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from '../services/fetch';
import useGlobalReducer from '../hooks/useGlobalReducer';
import '../css/Login.css';

function Login() {
    const navigate = useNavigate();
    const { dispatch } = useGlobalReducer();

    const [email, setEmail]       = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole]         = useState('paciente');
    const [message, setMessage]   = useState(null);
    const [loading, setLoading]   = useState(false);

    const handleLogin = async (e) => {
        e.preventDefault();
        setMessage(null);

        if (email.length < 3 || password.length < 6) {
            setMessage({ text: 'Por favor, introduce credenciales válidas.', type: 'error' });
            return;
        }

        setLoading(true);
        const result = await loginUser(email, password, role);
        setLoading(false);

        if (!result.success) {
            setMessage({ text: result.message || 'Credenciales incorrectas.', type: 'error' });
            return;
        }

        dispatch({ type: 'set_user', payload: { user: result.user, token: result.token, role: result.role } });

        if (result.role === 'doctor') {
            navigate('/DoctorDashboard');
        } else {
            navigate('/PatientDashboard');
        }
    };

    return (
        <div className="login-container">
            <h2>Iniciar Sesión</h2>

            <form onSubmit={handleLogin}>
                <table className="login-table">
                    <thead>
                        <tr>
                            <th colSpan="2" style={{ textAlign: 'center', color: '#5c67f2' }}>
                                Accede a tu cuenta
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <th><label htmlFor="email">Usuario:</label></th>
                            <td>
                                <input
                                    type="email"
                                    id="email"
                                    placeholder="Correo electrónico"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </td>
                        </tr>

                        <tr>
                            <th><label htmlFor="password">Contraseña:</label></th>
                            <td>
                                <input
                                    type="password"
                                    id="password"
                                    placeholder="Tu contraseña"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </td>
                        </tr>

                        <tr>
                            <th><label>Soy:</label></th>
                            <td>
                                <div style={{ display: 'flex', gap: '20px' }}>
                                    <label style={{ cursor: 'pointer' }}>
                                        <input
                                            type="radio"
                                            name="role"
                                            value="paciente"
                                            checked={role === 'paciente'}
                                            onChange={() => setRole('paciente')}
                                        /> Paciente 🧍
                                    </label>
                                    <label style={{ cursor: 'pointer' }}>
                                        <input
                                            type="radio"
                                            name="role"
                                            value="doctor"
                                            checked={role === 'doctor'}
                                            onChange={() => setRole('doctor')}
                                        /> Médico 🧑‍⚕️
                                    </label>
                                </div>
                            </td>
                        </tr>

                        <tr>
                            <td colSpan="2" className="register-link-cell" style={{ textAlign: 'center', paddingTop: '10px' }}>
                                ¿Todavía no estás registrado?{' '}
                                <Link to="/Register" className="register-link-button">
                                    Pulsa aquí
                                </Link>
                            </td>
                        </tr>

                        <tr>
                            <td colSpan="2" className="submit-cell">
                                <button type="submit" className="login-button" disabled={loading}>
                                    {loading ? 'Accediendo...' : 'ACCEDER'}
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </form>

            {message && (
                <div
                    className="message"
                    style={{ color: message.type === 'error' ? 'red' : 'green' }}
                >
                    {message.text}
                </div>
            )}
        </div>
    );
}

export default Login;
