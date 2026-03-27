import React, { useState, useEffect } from 'react';
import { updatePatientProfile, getMyHeadDoctors } from '../../../services/fetch';

/**
 * PerfilPaciente
 *
 * Muestra los datos del paciente y permite editar:
 *   - Email
 *   - Fecha de nacimiento
 *   - Contraseña (requiere ingresar la contraseña actual)
 *
 * Nombre y apellido son de solo lectura (dato de identidad médica).
 *
 * Props:
 *   user        {Object}   - Datos del usuario del store global.
 *   onSave      {Function} - Callback que recibe el objeto actualizado tras guardar.
 */
const PerfilPaciente = ({ user, onSave }) => {
    const [email, setEmail]               = useState(user?.email || '');
    const [birthDate, setBirthDate]       = useState(user?.birth_date
        ? (() => {
            // El backend devuelve "DD-MM-YYYY"; el input type="date" necesita "YYYY-MM-DD"
            const [d, m, y] = user.birth_date.split('-');
            return `${y}-${m}-${d}`;
          })()
        : '');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword]         = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [headDoctors, setHeadDoctors]         = useState([]);
    const [selectedHeadDoctor, setSelectedHeadDoctor] = useState(
        user?.assign_doctor ? String(user.assign_doctor) : ''
    );
    const [loading, setLoading]   = useState(false);
    const [loadingDoctors, setLoadingDoctors] = useState(true);
    const [error, setError]       = useState('');
    const [success, setSuccess]   = useState('');

    useEffect(() => {
        const loadHeadDoctors = async () => {
            setLoadingDoctors(true);
            const result = await getMyHeadDoctors();
            if (result.success) {
                setHeadDoctors(result.data || []);
            }
            setLoadingDoctors(false);
        };
        loadHeadDoctors();
    }, []);

    /**
     * handleSubmit
     * Construye el payload solo con los campos que el usuario modificó
     * y llama a la API. Si hubo cambio de contraseña, valida que coincidan.
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        const payload = {};

        if (email !== user.email) {
            payload.email = email;
        }

        if (birthDate) {
            // Convertir de "YYYY-MM-DD" a "DD-MM-YYYY" para comparar con el valor del backend
            const [y, m, d] = birthDate.split('-');
            const formatted = `${d}-${m}-${y}`;
            if (formatted !== user.birth_date) {
                payload.birth_date = birthDate; // el backend acepta "YYYY-MM-DD"
            }
        }

        const currentAssign = user?.assign_doctor ? String(user.assign_doctor) : '';
        if (selectedHeadDoctor !== currentAssign) {
            payload.assign_doctor = selectedHeadDoctor ? Number(selectedHeadDoctor) : null;
        }

        if (newPassword) {
            if (newPassword !== confirmPassword) {
                setError('Las contraseñas nuevas no coinciden.');
                return;
            }
            if (!currentPassword) {
                setError('Debes ingresar tu contraseña actual para cambiarla.');
                return;
            }
            payload.current_password = currentPassword;
            payload.new_password     = newPassword;
        }

        if (Object.keys(payload).length === 0) {
            setError('No hay cambios para guardar.');
            return;
        }

        setLoading(true);
        const result = await updatePatientProfile(payload);
        setLoading(false);

        if (result.success) {
            setSuccess('Perfil actualizado correctamente.');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            onSave(result.data);
        } else {
            setError(result.message || 'Error al actualizar el perfil.');
        }
    };

    return (
        <div className="cita-container">
            <h2>⚙️ Mi Perfil</h2>

            {/* Datos de solo lectura */}
            <div className="appointment-view gestion-item" style={{ marginBottom: '24px' }}>
                <div className="details-grid">
                    <span><strong>Nombre:</strong> {user?.first_name} {user?.last_name}</span>
                    <span><strong>Estado:</strong> {user?.is_active ? '✅ Activo' : '❌ Inactivo'}</span>
                </div>
            </div>

            <form onSubmit={handleSubmit}>

                {/* Email */}
                <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label><strong>Email</strong></label>
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        style={{ display: 'block', width: '100%', marginTop: '6px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc' }}
                    />
                </div>

                {/* Fecha de nacimiento */}
                <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label><strong>Fecha de nacimiento</strong></label>
                    <input
                        type="date"
                        value={birthDate}
                        onChange={e => setBirthDate(e.target.value)}
                        style={{ display: 'block', marginTop: '6px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc' }}
                    />
                </div>

                {/* Médico de cabecera */}
                <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label><strong>Médico de cabecera</strong></label>
                    <select
                        value={selectedHeadDoctor}
                        onChange={e => setSelectedHeadDoctor(e.target.value)}
                        disabled={loadingDoctors}
                        style={{ display: 'block', width: '100%', marginTop: '6px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc' }}
                    >
                        <option value="">-- Sin médico de cabecera --</option>
                        {headDoctors.map((d) => (
                            <option key={d.id} value={String(d.id)}>
                                Dr/a. {d.first_name} {d.last_name}{d.specialty ? ` - ${d.specialty}` : ''}
                            </option>
                        ))}
                    </select>
                    <p style={{ marginTop: '6px', color: '#6c757d', fontSize: '0.85em' }}>
                        Solo puedes elegir médicos con los que ya hayas tenido una cita.
                    </p>
                </div>

                {/* Cambio de contraseña */}
                <div style={{ borderTop: '1px solid #e0e0e0', paddingTop: '20px', marginTop: '8px', marginBottom: '16px' }}>
                    <p><strong>Cambiar contraseña</strong> <span style={{ fontSize: '13px', color: '#888' }}>(opcional)</span></p>

                    <div className="form-group" style={{ marginBottom: '12px' }}>
                        <label>Contraseña actual</label>
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={e => setCurrentPassword(e.target.value)}
                            placeholder="Ingresa tu contraseña actual"
                            style={{ display: 'block', width: '100%', marginTop: '6px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc' }}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: '12px' }}>
                        <label>Nueva contraseña</label>
                        <input
                            type="password"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            placeholder="Nueva contraseña"
                            style={{ display: 'block', width: '100%', marginTop: '6px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc' }}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: '12px' }}>
                        <label>Confirmar nueva contraseña</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            placeholder="Repite la nueva contraseña"
                            style={{ display: 'block', width: '100%', marginTop: '6px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc' }}
                        />
                    </div>
                </div>

                {error   && <p style={{ color: 'red',   marginBottom: '12px' }}>{error}</p>}
                {success && <p style={{ color: 'green', marginBottom: '12px' }}>{success}</p>}

                <button
                    type="submit"
                    className="confirm-button"
                    disabled={loading}
                >
                    {loading ? 'Guardando...' : 'Guardar cambios'}
                </button>
            </form>
        </div>
    );
};

export default PerfilPaciente;
