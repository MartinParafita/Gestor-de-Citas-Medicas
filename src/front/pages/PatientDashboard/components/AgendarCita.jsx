import React, { useState } from 'react';
import { createAppointmentAPI } from '../../../services/fetch';
import { workingHours, isWeekend, formatForAPI, parseAPIDate } from '../utils';

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

export default AgendarCita;
