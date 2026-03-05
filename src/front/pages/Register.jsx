import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../css/Register.css';
import { register } from '../services/fetch';

function Register() {
    const navigate = useNavigate();

    const [first_name, setFirst_name]         = useState('');
    const [last_name, setLast_name]           = useState('');
    const [birth_date, setBirth_date]         = useState('');
    const [email, setEmail]                   = useState('');
    const [phoneNumber, setPhoneNumber]       = useState('');
    const [role, setRole]                     = useState('');
    const [licenseNumber, setLicenseNumber]   = useState('');
    const [specialty, setSpecialty]           = useState('');
    const [password, setPassword]             = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [message, setMessage]               = useState(null);
    const [loading, setLoading]               = useState(false);

    const isValidEmail = (email) => /\S+@\S+\.\S+/.test(email);

    const handleRoleChange = (selectedRole) => {
        setRole(selectedRole);
        if (selectedRole !== 'doctor') {
            setLicenseNumber('');
            setSpecialty('');
        }
    };

    const handleRegistration = async (event) => {
        event.preventDefault();
        setMessage(null);

        if (!first_name || !last_name || !birth_date || !email || !password || !confirmPassword) {
            setMessage({ text: 'Todos los campos básicos son obligatorios. 📝', type: 'error' });
            return;
        }
        if (!role) {
            setMessage({ text: 'Debes seleccionar si eres Médico o Paciente. 🧑‍⚕️/🧍', type: 'error' });
            return;
        }
        if (role === 'doctor') {
            if (!licenseNumber || !/^\d{9}$/.test(licenseNumber)) {
                setMessage({ text: 'El Número de Matrícula debe tener exactamente 9 dígitos. 🔢', type: 'error' });
                return;
            }
            if (!specialty || specialty.trim().length < 3) {
                setMessage({ text: 'Por favor, introduce tu especialidad médica.', type: 'error' });
                return;
            }
        }
        if (!isValidEmail(email)) {
            setMessage({ text: 'Por favor, introduce un correo electrónico válido. 📧', type: 'error' });
            return;
        }
        if (phoneNumber && !/^\d{9,}$/.test(phoneNumber)) {
            setMessage({ text: 'Número de teléfono inválido (mín. 9 dígitos). 📞', type: 'error' });
            return;
        }
        if (password.length < 6) {
            setMessage({ text: 'La contraseña debe tener al menos 6 caracteres. 🔑', type: 'error' });
            return;
        }
        if (password !== confirmPassword) {
            setMessage({ text: 'Las contraseñas no coinciden. ❌', type: 'error' });
            return;
        }

        const registrationData = { first_name, last_name, birth_date, email, password, role };
        if (role === 'doctor') {
            registrationData.license_number = licenseNumber;
            registrationData.specialty = specialty;
        }

        setLoading(true);
        const result = await register(registrationData);
        setLoading(false);

        if (result && result.success) {
            setMessage({ text: `¡Registro exitoso como ${role.toUpperCase()}! Redirigiendo al login... 🎉`, type: 'success' });
            setTimeout(() => navigate('/Login'), 1500);
        } else {
            setMessage({ text: result?.message || 'Fallo en el registro. Inténtalo de nuevo.', type: 'error' });
        }
    };

    return (
        <div className="register-container">
            <h2>Crear una Cuenta Nueva</h2>

            <form onSubmit={handleRegistration} className="register-form">
                <div className="form-group">
                    <label>Nombre:</label>
                    <input type="text" value={first_name} onChange={(e) => setFirst_name(e.target.value)} placeholder="Tu nombre" required />
                </div>
                <div className="form-group">
                    <label>Apellidos:</label>
                    <input type="text" value={last_name} onChange={(e) => setLast_name(e.target.value)} placeholder="Tus apellidos" required />
                </div>
                <div className="form-group">
                    <label>Fecha de Nacimiento:</label>
                    <input type="date" value={birth_date} onChange={(e) => setBirth_date(e.target.value)} required />
                </div>
                <div className="form-group">
                    <label>Correo Electrónico:</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ejemplo@dominio.com" required />
                </div>
                <div className="form-group">
                    <label>Número de Teléfono:</label>
                    <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Ej. 600112233" />
                </div>

                <hr className="divider" />

                <div className="form-group role-selection">
                    <label>Selecciona tu Rol:</label>
                    <div className="checkbox-group">
                        <label>
                            <input type="checkbox" checked={role === 'doctor'} onChange={() => handleRoleChange('doctor')} />
                            Médico 🧑‍⚕️
                        </label>
                        <label>
                            <input type="checkbox" checked={role === 'paciente'} onChange={() => handleRoleChange('paciente')} />
                            Paciente 🧍
                        </label>
                    </div>
                </div>

                {role === 'doctor' && (
                    <>
                        <div className="form-group license-group">
                            <label>Número de Matrícula de Colegiado (9 dígitos):</label>
                            <input
                                type="number"
                                value={licenseNumber}
                                onChange={(e) => setLicenseNumber(e.target.value)}
                                placeholder="Ej: 123456789"
                                required
                                maxLength="9"
                            />
                        </div>
                        <div className="form-group specialty-group">
                            <label>Especialidad:</label>
                            <input
                                type="text"
                                value={specialty}
                                onChange={(e) => setSpecialty(e.target.value)}
                                placeholder="Ej. Cardiología, Pediatría..."
                                required
                            />
                        </div>
                    </>
                )}

                <hr className="divider" />

                <div className="form-group">
                    <label>Contraseña (Mín. 6 chars):</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Crea una contraseña segura" required />
                </div>
                <div className="form-group">
                    <label>Repetir Contraseña:</label>
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repite la contraseña" required />
                </div>

                <button type="submit" className="register-button" disabled={loading}>
                    {loading ? 'Registrando...' : 'REGISTRARME'}
                </button>

                <p style={{ textAlign: 'center', marginTop: '15px' }}>
                    ¿Ya tienes cuenta? <Link to="/Login">Inicia sesión aquí</Link>
                </p>
            </form>

            {message && (
                <div
                    className="message"
                    style={{ color: message.type === 'error' ? '#e74c3c' : '#2ecc71', fontWeight: 'bold', marginTop: '15px' }}
                >
                    {message.text}
                </div>
            )}
        </div>
    );
}

export default Register;
