import React, { useState, useEffect } from 'react';
import useGlobalReducer from '../hooks/useGlobalReducer';
import { getMyAppointments, createAppointmentAPI, cancelAppointmentAPI, rescheduleAppointmentAPI, getDoctors, getCenters, updatePatientProfile, getMyPrescriptions } from '../services/fetch';
import '../css/PatientDashboard.css';

// ── Utilidades ────────────────────────────────────────────────────────────────

/**
 * Genera el array de horas laborables en intervalos de 30 minutos (09:00–14:00).
 * @returns {string[]} Ej: ["09:00", "09:30", ..., "14:00"]
 */
const generateHours = () => {
    const hours = [];
    for (let minutes = 540; minutes <= 840; minutes += 30) {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        hours.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
    return hours;
};
const workingHours = generateHours();

/** Devuelve true si la fecha cae en sábado (6) o domingo (0). */
const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
};

/**
 * Formatea una Date + hora seleccionada al string que espera el backend.
 * @param {Date}   date - Objeto Date con la fecha seleccionada.
 * @param {string} hour - Hora en formato "HH:mm".
 * @returns {string} Ej: "15-03-2026 09:30"
 */
const formatForAPI = (date, hour) => {
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}-${m}-${y} ${hour}`;
};

/**
 * Convierte un ISO string del backend a un objeto Date, o null si está vacío.
 * @param {string|null} isoString
 * @returns {Date|null}
 */
const parseAPIDate = (isoString) => {
    if (!isoString) return null;
    return new Date(isoString);
};

// ── Componente: Seleccionar Cita (Calendario) ─────────────────────────────────

/**
 * AgendarCita
 *
 * Formulario de agendamiento con calendario interactivo y dos modos de busqueda:
 *   - Por especialidad: elige especialidad -> medico -> centro automatico.
 *   - Por centro: elige centro cercano -> ve medicos disponibles ahi.
 *
 * Props:
 *   patientName          {string}   - Nombre del paciente.
 *   doctors              {Array}    - Lista de medicos disponibles del backend.
 *   centers              {Array}    - Lista de centros sanitarios del backend.
 *   onConfirm            {Function} - Callback(newAppointment) al confirmar la cita exitosamente.
 *   existingAppointments {Array}    - Citas del paciente para marcar dias ocupados en el calendario.
 */
const AgendarCita = ({ patientName, doctors, centers, onConfirm, existingAppointments }) => {
    const today = new Date();

    // Modo de busqueda
    const [searchMode, setSearchMode] = useState('specialty'); // 'specialty' | 'center'

    // Filtros modo especialidad
    const [selectedSpecialty, setSelectedSpecialty] = useState('');

    // Filtros modo centro
    const [centerSearch, setCenterSearch] = useState('');
    const [selectedCenter, setSelectedCenter] = useState('');

    // Seleccion comun
    const [selectedDoctor, setSelectedDoctor] = useState('');
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear]   = useState(today.getFullYear());
    const [selectedDate, setSelectedDate]  = useState(null);
    const [selectedHour, setSelectedHour]  = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Especialidades unicas extraidas de la lista de medicos
    const specialties = [...new Set(doctors.map(d => d.specialty).filter(Boolean))].sort();

    // Medicos filtrados segun el modo activo
    const filteredDoctors = (() => {
        if (searchMode === 'specialty') {
            if (!selectedSpecialty) return doctors;
            return doctors.filter(d => d.specialty === selectedSpecialty);
        }
        // Modo centro: mostrar medicos asignados al centro seleccionado
        if (!selectedCenter) return [];
        return doctors.filter(d => String(d.center_id) === String(selectedCenter));
    })();

    // Centro del medico seleccionado
    const doctorObj = doctors.find(d => String(d.id) === String(selectedDoctor)) || null;

    // En modo centro, el centro ya esta determinado por la seleccion del paciente
    const resolvedCenter = (() => {
        if (searchMode === 'center' && selectedCenter) {
            return centers.find(c => String(c.id) === String(selectedCenter)) || null;
        }
        if (doctorObj && doctorObj.center_id) {
            return centers.find(c => c.id === doctorObj.center_id) || {
                id: doctorObj.center_id,
                name: doctorObj.center_name || `Centro #${doctorObj.center_id}`,
            };
        }
        return null;
    })();

    // Centros filtrados por busqueda (modo centro)
    const filteredCenters = centers.filter(c => {
        if (!centerSearch.trim()) return true;
        const q = centerSearch.toLowerCase();
        return (
            c.name.toLowerCase().includes(q) ||
            (c.zip_code    && c.zip_code.includes(q)) ||
            (c.type_center && c.type_center.toLowerCase().includes(q)) ||
            (c.address     && c.address.toLowerCase().includes(q))
        );
    });

    // Reset selecciones dependientes al cambiar de modo
    const handleModeChange = (mode) => {
        setSearchMode(mode);
        setSelectedDoctor('');
        setSelectedSpecialty('');
        setSelectedCenter('');
        setCenterSearch('');
        setSelectedDate(null);
        setSelectedHour(null);
        setError('');
    };

    const daysInMonth    = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
    const startOffset    = (firstDayOfWeek + 6) % 7;
    const monthName      = new Date(currentYear, currentMonth, 1)
        .toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

    const hasAppointmentOnDay = (day) =>
        existingAppointments.some(a => {
            const d = parseAPIDate(a.appointment_date);
            return d && d.getDate() === day && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });

    const prevMonth = () => {
        if (currentYear === today.getFullYear() && currentMonth === today.getMonth()) return;
        if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
        else setCurrentMonth(m => m - 1);
        setSelectedDate(null);
    };

    const nextMonth = () => {
        if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
        else setCurrentMonth(m => m + 1);
        setSelectedDate(null);
    };

    const handleConfirm = async () => {
        if (!selectedDate || !selectedHour || !selectedDoctor) {
            setError('Selecciona fecha, hora y medico.');
            return;
        }

        const centerIdToSend = resolvedCenter
            ? resolvedCenter.id
            : null;

        if (!centerIdToSend) {
            setError('No se ha determinado un centro. Selecciona uno o elige un medico con centro asignado.');
            return;
        }

        setError('');
        setLoading(true);
        const result = await createAppointmentAPI({
            doctor_id:        parseInt(selectedDoctor),
            center_id:        centerIdToSend,
            appointment_date: formatForAPI(selectedDate, selectedHour),
        });
        setLoading(false);
        if (result.success) {
            onConfirm(result.data);
        } else {
            setError(result.message || 'Error al crear la cita.');
        }
    };

    const availableHours = selectedDate && !isWeekend(selectedDate) ? workingHours : [];

    // Estilos para los botones de modo
    const modeBtn = (mode) => ({
        padding: '8px 20px',
        borderRadius: '20px',
        border: `2px solid ${searchMode === mode ? '#20B2AA' : '#dee2e6'}`,
        backgroundColor: searchMode === mode ? '#20B2AA' : 'white',
        color: searchMode === mode ? 'white' : '#555',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: searchMode === mode ? 'bold' : 'normal',
        transition: 'all 0.15s',
    });

    return (
        <div className="cita-container">
            <h2>Agendar Nueva Cita</h2>

            {/* Selector de modo de busqueda */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <button style={modeBtn('specialty')} onClick={() => handleModeChange('specialty')}>
                    Buscar por Especialidad
                </button>
                <button style={modeBtn('center')} onClick={() => handleModeChange('center')}>
                    Buscar por Centro
                </button>
            </div>

            {/* ── Modo Especialidad ──────────────────────────────────────────── */}
            {searchMode === 'specialty' && (
                <>
                    {/* Filtro de especialidad */}
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label><strong>Paso 1: Elige la especialidad</strong></label>
                        <select
                            value={selectedSpecialty}
                            onChange={e => { setSelectedSpecialty(e.target.value); setSelectedDoctor(''); }}
                            style={{ display: 'block', width: '100%', marginTop: '6px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc' }}
                        >
                            <option value="">-- Todas las especialidades --</option>
                            {specialties.map(s => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>

                    {/* Selector de medico (filtrado por especialidad) */}
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label><strong>Paso 2: Elige tu medico</strong></label>
                        <select
                            value={selectedDoctor}
                            onChange={e => setSelectedDoctor(e.target.value)}
                            style={{ display: 'block', width: '100%', marginTop: '6px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc' }}
                        >
                            <option value="">-- Elige un medico --</option>
                            {filteredDoctors.map(d => (
                                <option key={d.id} value={d.id}>
                                    Dr/a. {d.first_name} {d.last_name} — {d.specialty}
                                    {d.center_name ? ` (${d.center_name})` : ''}
                                </option>
                            ))}
                        </select>
                        <div style={{ fontSize: '0.8em', color: '#6c757d', marginTop: '4px' }}>
                            {filteredDoctors.length} medico{filteredDoctors.length !== 1 ? 's' : ''} disponible{filteredDoctors.length !== 1 ? 's' : ''}
                        </div>
                    </div>

                    {/* Centro de atencion (automatico o selector si no tiene) */}
                    {selectedDoctor && (
                        <div className="form-group" style={{ marginBottom: '16px' }}>
                            <label><strong>Centro de atencion:</strong></label>
                            {resolvedCenter ? (
                                <div style={{ marginTop: '8px', padding: '10px 14px', background: '#f0fafa', border: '1px solid #b2dfdb', borderRadius: '6px' }}>
                                    <strong>{resolvedCenter.name}</strong>
                                    {resolvedCenter.type_center && <span style={{ color: '#6c757d', marginLeft: '8px' }}> — {resolvedCenter.type_center}</span>}
                                    {resolvedCenter.address && <div style={{ fontSize: '0.85em', color: '#6c757d', marginTop: '2px' }}>{resolvedCenter.address}{resolvedCenter.zip_code ? `, ${resolvedCenter.zip_code}` : ''}</div>}
                                </div>
                            ) : (
                                <>
                                    <p style={{ fontSize: '0.85em', color: '#888', margin: '6px 0' }}>
                                        Este medico no tiene centro asignado. Selecciona uno:
                                    </p>
                                    <input
                                        type="text"
                                        placeholder="Buscar por nombre, CP, tipo o direccion..."
                                        value={centerSearch}
                                        onChange={e => setCenterSearch(e.target.value)}
                                        style={{ display: 'block', width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', marginBottom: '6px' }}
                                    />
                                    <select
                                        value={selectedCenter}
                                        onChange={e => setSelectedCenter(e.target.value)}
                                        style={{ display: 'block', width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc' }}
                                    >
                                        <option value="">-- Selecciona un centro --</option>
                                        {filteredCenters.map(c => (
                                            <option key={c.id} value={c.id}>
                                                {c.name}{c.zip_code ? ` (${c.zip_code})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                    <div style={{ fontSize: '0.8em', color: '#6c757d', marginTop: '4px' }}>
                                        {filteredCenters.length} centro{filteredCenters.length !== 1 ? 's' : ''} encontrado{filteredCenters.length !== 1 ? 's' : ''}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* ── Modo Centro ────────────────────────────────────────────────── */}
            {searchMode === 'center' && (
                <>
                    {/* Buscar y seleccionar centro */}
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                        <label><strong>Paso 1: Busca un centro cercano</strong></label>
                        <input
                            type="text"
                            placeholder="Buscar por nombre, CP, tipo o direccion..."
                            value={centerSearch}
                            onChange={e => setCenterSearch(e.target.value)}
                            style={{ display: 'block', width: '100%', marginTop: '6px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', marginBottom: '6px' }}
                        />
                        <select
                            value={selectedCenter}
                            onChange={e => { setSelectedCenter(e.target.value); setSelectedDoctor(''); }}
                            style={{ display: 'block', width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc' }}
                        >
                            <option value="">-- Selecciona un centro --</option>
                            {filteredCenters.map(c => (
                                <option key={c.id} value={c.id}>
                                    {c.name}{c.zip_code ? ` (${c.zip_code})` : ''}
                                </option>
                            ))}
                        </select>
                        <div style={{ fontSize: '0.8em', color: '#6c757d', marginTop: '4px' }}>
                            {filteredCenters.length} centro{filteredCenters.length !== 1 ? 's' : ''} encontrado{filteredCenters.length !== 1 ? 's' : ''}
                        </div>
                    </div>

                    {/* Info del centro seleccionado */}
                    {resolvedCenter && (
                        <div style={{ marginBottom: '16px', padding: '10px 14px', background: '#f0fafa', border: '1px solid #b2dfdb', borderRadius: '6px' }}>
                            <strong>{resolvedCenter.name}</strong>
                            {resolvedCenter.type_center && <span style={{ color: '#6c757d', marginLeft: '8px' }}> — {resolvedCenter.type_center}</span>}
                            {resolvedCenter.address && <div style={{ fontSize: '0.85em', color: '#6c757d', marginTop: '2px' }}>{resolvedCenter.address}{resolvedCenter.zip_code ? `, ${resolvedCenter.zip_code}` : ''}</div>}
                            {resolvedCenter.phone && <div style={{ fontSize: '0.85em', color: '#6c757d', marginTop: '2px' }}>Tel: {resolvedCenter.phone}</div>}
                        </div>
                    )}

                    {/* Medicos disponibles en ese centro */}
                    {selectedCenter && (
                        <div className="form-group" style={{ marginBottom: '16px' }}>
                            <label><strong>Paso 2: Elige tu medico en este centro</strong></label>
                            {filteredDoctors.length === 0 ? (
                                <p style={{ color: '#888', fontSize: '0.9em', marginTop: '8px' }}>
                                    No hay medicos registrados en este centro.
                                </p>
                            ) : (
                                <>
                                    <select
                                        value={selectedDoctor}
                                        onChange={e => setSelectedDoctor(e.target.value)}
                                        style={{ display: 'block', width: '100%', marginTop: '6px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc' }}
                                    >
                                        <option value="">-- Elige un medico --</option>
                                        {filteredDoctors.map(d => (
                                            <option key={d.id} value={d.id}>
                                                Dr/a. {d.first_name} {d.last_name} — {d.specialty}
                                            </option>
                                        ))}
                                    </select>
                                    <div style={{ fontSize: '0.8em', color: '#6c757d', marginTop: '4px' }}>
                                        {filteredDoctors.length} medico{filteredDoctors.length !== 1 ? 's' : ''} en este centro
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* ── Calendario (comun a ambos modos) ──────────────────────────── */}
            {selectedDoctor && (
                <>
                    <p style={{ marginTop: '8px' }}>Paso 3: Selecciona la fecha (Lun-Vie) y la hora (9:00 a 14:00)</p>

                    <div className="date-selector-mock">
                        <button onClick={prevMonth}>&lt;</button>
                        <span>{monthName.charAt(0).toUpperCase() + monthName.slice(1)}</span>
                        <button onClick={nextMonth}>&gt;</button>
                    </div>

                    <div className="centered-calendar-container">
                        <div className="calendar-grid">
                            {['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].map(d => (
                                <div key={d} className="day-header">{d}</div>
                            ))}
                            {[...Array(startOffset)].map((_, i) => <div key={`e-${i}`} className="day-cell empty" />)}
                            {[...Array(daysInMonth)].map((_, i) => {
                                const day  = i + 1;
                                const date = new Date(currentYear, currentMonth, day);
                                const unavail  = isWeekend(date);
                                const occupied = hasAppointmentOnDay(day);
                                const isSelected = selectedDate?.getDate() === day && selectedDate?.getMonth() === currentMonth;

                                return (
                                    <div
                                        key={day}
                                        className={`day-cell ${isSelected ? 'selected' : ''} ${unavail ? 'unavailable-day' : 'working-day'}`}
                                        onClick={() => !unavail && setSelectedDate(date)}
                                    >
                                        {day}
                                        {occupied && <span className="appointment-indicator" style={{ color: '#dc3545', fontWeight: 'bold' }}>●</span>}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {selectedDate && !isWeekend(selectedDate) && (
                        <div className="availability-panel">
                            <h3>Horas disponibles — {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
                            <div className="hours-list">
                                {availableHours.map(hour => (
                                    <button
                                        key={hour}
                                        className={`hour-button ${selectedHour === hour ? 'selected-hour' : ''}`}
                                        onClick={() => setSelectedHour(hour)}
                                    >
                                        {hour}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {selectedDate && selectedHour && (
                        <div className="confirmation-box">
                            <p>
                                Pre-seleccion: <strong>{selectedDate.toLocaleDateString('es-ES')} a las {selectedHour}</strong>
                            </p>
                            {resolvedCenter && (
                                <p style={{ fontSize: '0.9em', color: '#555' }}>
                                    Centro: <strong>{resolvedCenter.name}</strong>
                                    {' — '}Dr/a. {doctorObj?.first_name} {doctorObj?.last_name}
                                </p>
                            )}
                            {error && <p style={{ color: 'red' }}>{error}</p>}
                            <button className="confirm-button" onClick={handleConfirm} disabled={loading}>
                                {loading ? 'Confirmando...' : 'Confirmar Cita'}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

// ── Helpers de estado ─────────────────────────────────────────────────────────

const STATUS_COLOR = {
    Pending:   'orange',
    Completed: 'green',
    Cancelled: 'red',
};

const STATUS_LABEL = {
    Pending:   'Pendiente',
    Completed: 'Completada',
    Cancelled: 'Cancelada',
};

// ── Componente: Gestionar Citas ────────────────────────────────────────────────

/**
 * GestionarCitas
 *
 * Muestra las citas activas (Pending y Completed) del paciente.
 * Solo las citas en estado Pending pueden cancelarse.
 * Usa confirmación inline en lugar de window.confirm para mejor UX.
 *
 * Props:
 *   appointments {Array}    - Lista completa de citas del paciente.
 *   onCancel     {Function} - Callback(id) para cancelar una cita.
 *   onReschedule {Function} - Callback(cita) para reagendar una cita.
 */
const GestionarCitas = ({ appointments, onCancel, onReschedule }) => {
    const [confirmingId, setConfirmingId] = useState(null); // ID de la cita con confirmación abierta
    const [cancelling, setCancelling]     = useState(null); // ID en proceso de cancelación

    const active = appointments
        .filter(a => a.status !== 'Cancelled')
        .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date));

    /**
     * handleConfirmCancel
     * Ejecuta la cancelación y cierra la confirmación inline.
     */
    const handleConfirmCancel = async (id) => {
        setCancelling(id);
        await onCancel(id);
        setCancelling(null);
        setConfirmingId(null);
    };

    return (
        <div className="cita-container">
            <h2>✏️ Gestionar Citas</h2>
            {active.length === 0 ? (
                <div className="placeholder-content">
                    <p>No tienes citas activas.</p>
                </div>
            ) : (
                active.map((cita, i) => {
                    const date = parseAPIDate(cita.appointment_date);
                    const isConfirming = confirmingId === cita.id;
                    const isCancelling = cancelling === cita.id;

                    return (
                        <div key={cita.id} className="appointment-view gestion-item">
                            <h3>Cita {i + 1} — {date ? date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</h3>
                            <div className="confirmation-row current-appointment">
                                <div className="details-grid">
                                    <span><strong>Médico:</strong> {cita.doctor_name || `ID ${cita.doctor_id}`}</span>
                                    <span><strong>Hora:</strong> {date ? date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                                    {cita.center_name && <span><strong>Centro:</strong> {cita.center_name}</span>}
                                    <span>
                                        <strong>Estado:</strong>{' '}
                                        <span style={{ color: STATUS_COLOR[cita.status] || 'gray' }}>
                                            {STATUS_LABEL[cita.status] || cita.status}
                                        </span>
                                    </span>
                                </div>
                            </div>

                            {cita.status === 'Pending' && (
                                <div className="modification-actions">
                                    {isConfirming ? (
                                        // Confirmación inline
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                                            <span style={{ fontSize: '14px', color: '#555' }}>¿Confirmar cancelación?</span>
                                            <button
                                                onClick={() => handleConfirmCancel(cita.id)}
                                                disabled={isCancelling}
                                                style={{ padding: '5px 12px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '13px' }}
                                            >
                                                {isCancelling ? 'Cancelando...' : 'Sí, cancelar'}
                                            </button>
                                            <button
                                                onClick={() => setConfirmingId(null)}
                                                disabled={isCancelling}
                                                style={{ padding: '5px 12px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '13px' }}
                                            >
                                                No
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <button className="confirm-button" onClick={() => onReschedule(cita)}>
                                                Reagendar
                                            </button>
                                            <button
                                                className="quick-button button-cancelar cancel-btn"
                                                onClick={() => setConfirmingId(cita.id)}
                                            >
                                                Cancelar cita
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })
            )}
        </div>
    );
};

// ── Componente: Historial ──────────────────────────────────────────────────────

/**
 * HistorialCitas
 *
 * Muestra todas las citas del paciente con:
 *   - Resumen estadístico (totales por estado)
 *   - Filtros por estado con badge de cantidad
 *   - Borde lateral de color según el estado de cada cita
 *   - Ordenadas por fecha descendente
 *
 * Props:
 *   appointments {Array} - Lista completa de citas del paciente.
 */
const HistorialCitas = ({ appointments }) => {
    const [filter, setFilter] = useState('all');

    const sorted = [...appointments].sort((a, b) => new Date(b.appointment_date) - new Date(a.appointment_date));

    const counts = {
        all:       sorted.length,
        Pending:   sorted.filter(a => a.status === 'Pending').length,
        Completed: sorted.filter(a => a.status === 'Completed').length,
        Cancelled: sorted.filter(a => a.status === 'Cancelled').length,
    };

    const filtered = filter === 'all' ? sorted : sorted.filter(a => a.status === filter);

    const tabs = [
        { key: 'all',       label: 'Todas',      color: '#6c757d' },
        { key: 'Pending',   label: 'Pendientes', color: '#fd7e14' },
        { key: 'Completed', label: 'Completadas', color: '#28a745' },
        { key: 'Cancelled', label: 'Canceladas',  color: '#dc3545' },
    ];

    const STATUS_BORDER = {
        Pending:   '#fd7e14',
        Completed: '#28a745',
        Cancelled: '#dc3545',
    };

    return (
        <div className="cita-container">
            <h2>📋 Historial de Citas</h2>

            {/* Resumen estadístico */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {tabs.slice(1).map(t => (
                    <div
                        key={t.key}
                        style={{
                            padding: '10px 18px',
                            borderRadius: '8px',
                            backgroundColor: '#f8f9fa',
                            borderLeft: `4px solid ${t.color}`,
                            minWidth: '100px',
                        }}
                    >
                        <div style={{ fontSize: '22px', fontWeight: 'bold', color: t.color }}>{counts[t.key]}</div>
                        <div style={{ fontSize: '12px', color: '#555' }}>{t.label}</div>
                    </div>
                ))}
            </div>

            {/* Filtros */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                {tabs.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setFilter(t.key)}
                        style={{
                            padding: '6px 14px',
                            borderRadius: '20px',
                            border: `2px solid ${filter === t.key ? t.color : '#dee2e6'}`,
                            backgroundColor: filter === t.key ? t.color : 'white',
                            color: filter === t.key ? 'white' : '#555',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: filter === t.key ? 'bold' : 'normal',
                            transition: 'all 0.15s',
                        }}
                    >
                        {t.label}
                        <span style={{
                            marginLeft: '6px',
                            backgroundColor: filter === t.key ? 'rgba(255,255,255,0.3)' : '#e9ecef',
                            color: filter === t.key ? 'white' : '#666',
                            borderRadius: '10px',
                            padding: '1px 7px',
                            fontSize: '12px',
                        }}>
                            {counts[t.key]}
                        </span>
                    </button>
                ))}
            </div>

            {/* Lista */}
            {filtered.length === 0 ? (
                <p style={{ color: '#888' }}>No hay citas en esta categoría.</p>
            ) : (
                filtered.map((cita) => {
                    const date = parseAPIDate(cita.appointment_date);
                    return (
                        <div
                            key={cita.id}
                            className="appointment-view gestion-item"
                            style={{
                                opacity: cita.status === 'Cancelled' ? 0.7 : 1,
                                borderLeft: `4px solid ${STATUS_BORDER[cita.status] || '#ccc'}`,
                                paddingLeft: '12px',
                            }}
                        >
                            <div className="details-grid">
                                <span><strong>Fecha:</strong> {date ? date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</span>
                                <span><strong>Hora:</strong> {date ? date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                                <span><strong>Médico:</strong> {cita.doctor_name || `ID ${cita.doctor_id}`}</span>
                                {cita.center_name && <span><strong>Centro:</strong> {cita.center_name}</span>}
                                <span>
                                    <strong>Estado:</strong>{' '}
                                    <span style={{ color: STATUS_COLOR[cita.status] || 'gray', fontWeight: 'bold' }}>
                                        {STATUS_LABEL[cita.status] || cita.status}
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

// ── Componente: Perfil del paciente ───────────────────────────────────────────

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
    const [loading, setLoading]   = useState(false);
    const [error, setError]       = useState('');
    const [success, setSuccess]   = useState('');

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

// ── Componente: Mis Recetas ────────────────────────────────────────────────────

/**
 * MisRecetas
 *
 * Muestra todas las prescripciones emitidas al paciente, ordenadas de más
 * reciente a más antigua. Carga los datos al montar el componente.
 */
const MisRecetas = () => {
    const [prescriptions, setPrescriptions] = useState([]);
    const [loading, setLoading]             = useState(true);
    const [error, setError]                 = useState('');

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const result = await getMyPrescriptions();
            if (result.success) {
                setPrescriptions(result.data);
            } else {
                setError(result.message || 'Error al cargar las recetas.');
            }
            setLoading(false);
        };
        load();
    }, []);

    return (
        <div className="cita-container">
            <h2>💊 Mis Recetas</h2>

            {loading ? (
                <p style={{ color: '#888' }}>Cargando recetas...</p>
            ) : error ? (
                <p style={{ color: 'red' }}>{error}</p>
            ) : prescriptions.length === 0 ? (
                <div className="placeholder-content">
                    <p>No tienes recetas emitidas aún.</p>
                </div>
            ) : (
                <>
                    <p style={{ color: '#888', marginBottom: '16px' }}>
                        {prescriptions.length} receta(s) en tu historial.
                    </p>
                    {prescriptions.map((rx) => {
                        const fecha = rx.created_at
                            ? new Date(rx.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
                            : '—';
                        return (
                            <div
                                key={rx.id}
                                className="appointment-view gestion-item"
                                style={{ marginBottom: '12px', borderLeft: '4px solid #20B2AA' }}
                            >
                                <div className="details-grid">
                                    <span><strong>Fecha:</strong> {fecha}</span>
                                    <span><strong>Médico:</strong> {rx.doctor_name || `ID ${rx.doctor_id}`}</span>
                                    <span><strong>Medicamento:</strong> {rx.medication}</span>
                                    <span><strong>Dosis:</strong> {rx.dosage}</span>
                                    {rx.instructions && (
                                        <span><strong>Instrucciones:</strong> {rx.instructions}</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </>
            )}
        </div>
    );
};

// ── Vista: Bienvenida del paciente ────────────────────────────────────────────

/**
 * WelcomePatient
 *
 * Vista inicial del panel del paciente. Muestra un resumen accionable:
 *   - Próxima cita (con botones de cancelar / reagendar si está Pendiente).
 *   - Última receta emitida (cargada desde la API al montar).
 *
 * Recibe las citas ya cargadas desde PatientDashboard.
 * Las recetas se cargan internamente para no afectar el estado global.
 *
 * @param {{ appointments: Array, onNavigate: Function, onCancel: Function, onReschedule: Function }} props
 */
const WelcomePatient = ({ appointments, onNavigate, onCancel, onReschedule }) => {
    const [lastRx, setLastRx]       = useState(null);
    const [loadingRx, setLoadingRx] = useState(true);

    useEffect(() => {
        getMyPrescriptions().then(r => {
            if (r.success && r.data.length > 0) setLastRx(r.data[0]);
            setLoadingRx(false);
        });
    }, []);

    const now      = new Date();
    const nextAppt = appointments
        .filter(a => a.status !== 'Cancelled' && new Date(a.appointment_date) > now)
        .sort((a, b) => new Date(a.appointment_date) - new Date(b.appointment_date))[0] || null;

    const fmt = (iso, opts) => new Date(iso).toLocaleString('es-ES', opts);

    return (
        <div className="welcome-patient">
            {/* Próxima cita */}
            <div className="welcome-section">
                <div className="welcome-section-header">
                    <h3>Tu próxima cita</h3>
                    <button className="see-all-link" onClick={() => onNavigate('gestionar-citas')}>
                        Ver todas →
                    </button>
                </div>
                {!nextAppt ? (
                    <div className="welcome-no-appt">
                        <p className="welcome-empty">No tienes citas próximas programadas.</p>
                        <button className="welcome-cta-btn" onClick={() => onNavigate('agendar-cita')}>
                            + Agendar nueva cita
                        </button>
                    </div>
                ) : (
                    <div className="welcome-next-appt">
                        <div className="welcome-next-date-block">
                            <span className="welcome-next-weekday">
                                {fmt(nextAppt.appointment_date, { weekday: 'long', day: 'numeric', month: 'long' })}
                            </span>
                            <span className="welcome-next-time">
                                {fmt(nextAppt.appointment_date, { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                        <div className="welcome-next-info-row">
                            <span className="welcome-next-doctor">Dr/a. {nextAppt.doctor_name}</span>
                            <span className={`appointment-status status-${nextAppt.status.toLowerCase()}`}>
                                {STATUS_LABEL[nextAppt.status] || nextAppt.status}
                            </span>
                        </div>
                        {nextAppt.center_name && (
                            <div style={{ fontSize: '0.85em', color: '#6c757d', marginTop: '4px' }}>
                                {nextAppt.center_name}
                            </div>
                        )}
                        {nextAppt.status === 'Pending' && (
                            <div className="welcome-next-actions">
                                <button className="welcome-btn-cancel" onClick={() => onCancel(nextAppt.id)}>
                                    Cancelar
                                </button>
                                <button className="welcome-btn-reschedule" onClick={() => onReschedule(nextAppt)}>
                                    Reagendar
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Última receta */}
            <div className="welcome-section">
                <div className="welcome-section-header">
                    <h3>Última receta</h3>
                    <button className="see-all-link" onClick={() => onNavigate('mis-recetas')}>
                        Ver todas →
                    </button>
                </div>
                {loadingRx ? (
                    <p className="welcome-empty">Cargando...</p>
                ) : !lastRx ? (
                    <p className="welcome-empty">No tienes recetas registradas.</p>
                ) : (
                    <div className="welcome-rx-card">
                        <div className="welcome-rx-med">{lastRx.medication}</div>
                        <div className="welcome-rx-dosage">{lastRx.dosage}</div>
                        {lastRx.instructions && (
                            <div className="welcome-rx-inst">{lastRx.instructions}</div>
                        )}
                        <div className="welcome-rx-meta">
                            <span>Dr/a. {lastRx.doctor_name}</span>
                            <span>{fmt(lastRx.created_at, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Menú lateral ──────────────────────────────────────────────────────────────

const patientMenuData = [
    {
        title: '1. Citas médicas', icon: '📅',
        links: [
            { name: 'Agendar cita', view: 'agendar-cita' },
            { name: 'Gestionar citas', view: 'gestionar-citas' },
            { name: 'Historial de citas', view: 'historial-citas' },
        ],
    },
    { title: '2. Resultados e informes', icon: '🔬', links: [{ name: 'Próximamente', view: 'placeholder' }] },
    { title: '3. Prescripciones', icon: '💊', links: [{ name: 'Mis recetas', view: 'mis-recetas' }] },
    { title: '4. Facturación y seguros', icon: '💳', links: [{ name: 'Próximamente', view: 'placeholder' }] },
    { title: '5. Comunicación', icon: '💬', links: [{ name: 'Próximamente', view: 'placeholder' }] },
    { title: '6. Documentos personales', icon: '📁', links: [{ name: 'Próximamente', view: 'placeholder' }] },
    { title: '7. Perfil y configuración', icon: '⚙️', links: [{ name: 'Mi perfil', view: 'perfil' }] },
];

// ── Dashboard principal ───────────────────────────────────────────────────────

/**
 * PatientDashboard
 *
 * Componente raíz del panel del paciente. Gestiona:
 *   - Carga inicial de citas y médicos en paralelo.
 *   - Estado de navegación entre vistas (currentView).
 *   - Menú lateral en acordeón (patientMenuData).
 *   - Botones de acceso rápido para las acciones más frecuentes.
 *   - Sincronización del store global al guardar el perfil.
 *
 * Vistas disponibles:
 *   "welcome"          → WelcomePatient (próxima cita + última receta + CTA agendar).
 *   "agendar-cita"     → AgendarCita (calendario + selección de médico).
 *   "gestionar-citas"  → GestionarCitas (cancelar / reagendar citas activas).
 *   "historial-citas"  → HistorialCitas (todas las citas con filtros por estado).
 *   "mis-recetas"      → MisRecetas (prescripciones emitidas por cualquier médico).
 *   "perfil"           → PerfilPaciente (editar email, fecha de nacimiento y contraseña).
 *   "placeholder"      → Vista temporal para secciones en desarrollo.
 */
const PatientDashboard = () => {
    const { store, dispatch } = useGlobalReducer();
    const [currentView, setCurrentView]         = useState('welcome');
    const [openAccordion, setOpenAccordion]     = useState(null);
    const [appointments, setAppointments]       = useState([]);
    const [doctors, setDoctors]                 = useState([]);
    const [centers, setCenters]                 = useState([]);
    const [loadingData, setLoadingData]         = useState(true);
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
     * El error se ignora silenciosamente — GestionarCitas maneja su propio estado.
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
     * AgendarCita reutiliza el mismo flujo de creación; el backend maneja el reagendamiento
     * vía PUT /api/appointment/:id cuando se pasa una cita existente.
     * @param {Object} cita - Cita a reagendar.
     */
    const handleReschedule = (cita) => {
        setCitaToReschedule(cita);
        setCurrentView('agendar-cita');
    };

    /**
     * handleProfileSave
     * Recibe los datos actualizados del paciente desde PerfilPaciente
     * y los sincroniza en el store global para reflejar el cambio
     * inmediatamente en toda la app (ej: nombre en el header).
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
