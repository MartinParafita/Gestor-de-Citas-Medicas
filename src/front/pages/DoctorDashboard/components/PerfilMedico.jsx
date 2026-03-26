import React, { useState, useEffect } from 'react';
import { updateDoctorProfile, getCenters } from '../../../services/fetch';

const PerfilMedico = ({ user, onSave }) => {
    const [email, setEmail]         = useState(user?.email || '');
    const [specialty, setSpecialty] = useState(user?.specialty || '');
    const [workDays, setWorkDays]   = useState(user?.work_days ?? '');
    const [centerId, setCenterId]       = useState(user?.center_id ?? '');
    const [centers, setCenters]         = useState([]);
    const [centerSearch, setCenterSearch] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword]         = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError]     = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        getCenters().then(r => { if (r.success) setCenters(r.data); });
    }, []);

    /**
     * handleSubmit
     * Construye el payload solo con los campos que el médico modificó
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
        if (specialty !== (user.specialty || '')) {
            payload.specialty = specialty;
        }
        if (workDays !== '' && Number(workDays) !== user.work_days) {
            payload.work_days = Number(workDays);
        }
        const centerIdNum = centerId === '' ? null : Number(centerId);
        if (centerIdNum !== (user.center_id ?? null)) {
            payload.center_id = centerIdNum;
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
        const result = await updateDoctorProfile(payload);
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

    if (!user) return <p>No se pudieron cargar los datos del perfil.</p>;

    return (
        <div className="cita-container">
            <h2>⚙️ Mi Perfil</h2>

            {/* Datos de solo lectura */}
            <div className="appointment-view gestion-item" style={{ marginBottom: '24px' }}>
                <div className="details-grid">
                    <span><strong>Nombre:</strong> {user.first_name} {user.last_name}</span>
                    <span><strong>Estado:</strong> {user.is_active ? '✅ Activo' : '❌ Inactivo'}</span>
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

                {/* Especialidad */}
                <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label><strong>Especialidad</strong></label>
                    <input
                        type="text"
                        value={specialty}
                        onChange={e => setSpecialty(e.target.value)}
                        placeholder="Ej: Cardiología"
                        style={{ display: 'block', width: '100%', marginTop: '6px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc' }}
                    />
                </div>

                {/* Centro de trabajo */}
                <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label><strong>Centro de trabajo</strong></label>
                    {(() => {
                        const filtered = centers.filter(c => {
                            if (!centerSearch.trim()) return true;
                            const q = centerSearch.toLowerCase();
                            return (
                                c.name.toLowerCase().includes(q) ||
                                (c.zip_code    && c.zip_code.includes(q)) ||
                                (c.type_center && c.type_center.toLowerCase().includes(q)) ||
                                (c.address     && c.address.toLowerCase().includes(q))
                            );
                        });
                        const selected = centers.find(c => String(c.id) === String(centerId));
                        return (
                            <>
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre, CP, tipo o dirección..."
                                    value={centerSearch}
                                    onChange={e => setCenterSearch(e.target.value)}
                                    style={{ display: 'block', width: '100%', marginTop: '6px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', marginBottom: '6px' }}
                                />
                                <select
                                    value={centerId}
                                    onChange={e => setCenterId(e.target.value)}
                                    style={{ display: 'block', width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc' }}
                                >
                                    <option value="">-- Sin centro asignado --</option>
                                    {filtered.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}{c.zip_code ? ` (${c.zip_code})` : ''}
                                        </option>
                                    ))}
                                </select>
                                <div style={{ fontSize: '0.8em', color: '#6c757d', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{filtered.length} centro{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}</span>
                                    {selected && <span style={{ color: '#20B2AA', fontWeight: 600 }}>Seleccionado: {selected.name}</span>}
                                </div>
                            </>
                        );
                    })()}
                </div>

                {/* Días de trabajo */}
                <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label><strong>Días de trabajo por semana</strong></label>
                    <input
                        type="number"
                        min="1"
                        max="7"
                        value={workDays}
                        onChange={e => setWorkDays(e.target.value)}
                        style={{ display: 'block', marginTop: '6px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', width: '80px' }}
                    />
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
                    className="quick-button button-agenda"
                    disabled={loading}
                >
                    {loading ? 'Guardando...' : 'Guardar cambios'}
                </button>
            </form>
        </div>
    );
};

export default PerfilMedico;

