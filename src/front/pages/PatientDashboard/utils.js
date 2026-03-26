/**
 * Genera el array de horas laborables en intervalos de 30 minutos (09:00–14:00).
 * @returns {string[]} Ej: ["09:00", "09:30", ..., "14:00"]
 */
export const generateHours = () => {
    const hours = [];
    for (let minutes = 540; minutes <= 840; minutes += 30) {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        hours.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
    return hours;
};

export const workingHours = generateHours();

/** Devuelve true si la fecha cae en sábado (6) o domingo (0). */
export const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
};

/**
 * Formatea una Date + hora seleccionada al string que espera el backend.
 * @param {Date}   date - Objeto Date con la fecha seleccionada.
 * @param {string} hour - Hora en formato "HH:mm".
 * @returns {string} Ej: "15-03-2026 09:30"
 */
export const formatForAPI = (date, hour) => {
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
export const parseAPIDate = (isoString) => {
    if (!isoString) return null;
    return new Date(isoString);
};
