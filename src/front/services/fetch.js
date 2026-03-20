const BASE = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Recupera el JWT almacenado en localStorage tras el login. */
function getToken() {
    return localStorage.getItem("jwt_token");
}

/**
 * Construye los headers HTTP con autenticación JWT y Content-Type JSON.
 * Debe usarse en todas las peticiones a endpoints protegidos.
 */
function authHeaders() {
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
    };
}

/**
 * Procesa la respuesta de la API y la normaliza.
 * @param {Response} response - Objeto Response de fetch.
 * @returns {{ success: boolean, data?: any, message?: string }}
 */
async function handleResponse(response) {
    const data = await response.json();
    if (!response.ok) {
        return { success: false, message: data.msg || data.error || "Error desconocido" };
    }
    return { success: true, data };
}

// ── Auth ──────────────────────────────────────────────────────────────────────

/**
 * Dispatcher de registro: delega a registerPatient o registerDoctor según el rol.
 * @param {Object} userData - Datos del usuario. Debe incluir `role` ("paciente"|"doctor").
 */
export async function register(userData) {
    if (userData.role === "paciente") return registerPatient(userData);
    if (userData.role === "doctor")   return registerDoctor(userData);
    return { success: false, message: "Rol no válido" };
}

/** Registra un nuevo paciente en el sistema. */
export async function registerPatient(userData) {
    try {
        const response = await fetch(`${BASE}/api/register/patient`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userData),
        });
        return handleResponse(response);
    } catch {
        return { success: false, message: "Error de conexión" };
    }
}

/** Registra un nuevo médico en el sistema. */
export async function registerDoctor(userData) {
    try {
        const response = await fetch(`${BASE}/api/register/doctor`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userData),
        });
        return handleResponse(response);
    } catch {
        return { success: false, message: "Error de conexión" };
    }
}

/**
 * Autentica al usuario, almacena el JWT en localStorage y carga el perfil.
 * @param {string} email
 * @param {string} password
 * @param {string} role - "paciente" | "doctor"
 * @returns {{ success: boolean, token?: string, role?: string, user?: Object, message?: string }}
 */
export async function loginUser(email, password, role) {
    const roleMap = { paciente: "patient", doctor: "doctor" };
    const apiRole = roleMap[role] ?? role;
    try {
        const response = await fetch(`${BASE}/api/login/${apiRole}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });
        const result = await handleResponse(response);
        if (!result.success) return result;

        const { token, user_id } = result.data;
        localStorage.setItem("jwt_token", token);
        localStorage.setItem("user_role", role);

        // Cargar datos del usuario
        const profileResult = await getProfile(role);
        if (!profileResult.success) return { success: false, message: "Login ok pero no se pudo cargar el perfil" };

        return { success: true, token, role, user: profileResult.data };
    } catch {
        return { success: false, message: "Error de conexión" };
    }
}

/**
 * Carga el perfil del usuario autenticado desde el endpoint protegido.
 * Si no se pasa role, lo lee de localStorage.
 * @param {string} [role] - "paciente" | "doctor"
 */
export async function getProfile(role) {
    try {
        const raw = role || localStorage.getItem("user_role");
        const roleMap = { paciente: "patient", doctor: "doctor" };
        const roleParam = roleMap[raw] ?? raw;
        const response = await fetch(`${BASE}/api/protected/${roleParam}`, {
            headers: authHeaders(),
        });
        return handleResponse(response);
    } catch {
        return { success: false, message: "Error de conexión" };
    }
}

// ── Perfil ────────────────────────────────────────────────────────────────────

/**
 * Actualiza el perfil del paciente autenticado.
 *
 * El endpoint usa el JWT para identificar al paciente,
 * por lo que no es necesario pasar el ID explícitamente.
 *
 * @param {Object} data - Campos a actualizar. Puede contener:
 *   - email          {string}  Nuevo email.
 *   - birth_date     {string}  Fecha en formato "YYYY-MM-DD".
 *   - current_password {string} Contraseña actual (requerida para cambiar contraseña).
 *   - new_password   {string}  Nueva contraseña (requerida para cambiar contraseña).
 * @returns {{ success: boolean, data?: Object, message?: string }}
 */
export async function updatePatientProfile(data) {
    try {
        const response = await fetch(`${BASE}/api/profile/patient`, {
            method: "PUT",
            headers: authHeaders(),
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    } catch {
        return { success: false, message: "Error de conexión" };
    }
}

/**
 * Actualiza el perfil del médico autenticado.
 *
 * El endpoint usa el JWT para identificar al médico,
 * por lo que no es necesario pasar el ID explícitamente.
 *
 * @param {Object} data - Campos a actualizar. Puede contener:
 *   - email            {string}   Nuevo email.
 *   - specialty        {string}   Nueva especialidad.
 *   - center_id        {number|null} ID del centro donde trabaja (null para desasignar).
 *   - work_days        {number}   Días de trabajo por semana (1-7).
 *   - current_password {string}   Contraseña actual (requerida para cambiar contraseña).
 *   - new_password     {string}   Nueva contraseña (requerida para cambiar contraseña).
 * @returns {{ success: boolean, data?: Object, message?: string }}
 */
export async function updateDoctorProfile(data) {
    try {
        const response = await fetch(`${BASE}/api/profile/doctor`, {
            method: "PUT",
            headers: authHeaders(),
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    } catch {
        return { success: false, message: "Error de conexión" };
    }
}

// ── Citas ─────────────────────────────────────────────────────────────────────

/** Retorna todas las citas del paciente autenticado. */
export async function getMyAppointments() {
    try {
        const response = await fetch(`${BASE}/api/appointments/patient`, {
            headers: authHeaders(),
        });
        return handleResponse(response);
    } catch {
        return { success: false, message: "Error de conexión" };
    }
}

/** Retorna todas las citas del médico autenticado. */
export async function getMyAppointmentsDoctor() {
    try {
        const response = await fetch(`${BASE}/api/appointments/doctor`, {
            headers: authHeaders(),
        });
        return handleResponse(response);
    } catch {
        return { success: false, message: "Error de conexión" };
    }
}

/**
 * Marca una cita como completada.
 *
 * Solo puede llamarla el médico asignado a la cita.
 * La cita debe estar en estado 'Pending'.
 *
 * @param {number} appointmentId - ID de la cita a completar.
 * @returns {{ success: boolean, data?: Object, message?: string }}
 */
export async function completeAppointment(appointmentId) {
    try {
        const response = await fetch(`${BASE}/api/appointment/${appointmentId}/complete`, {
            method: "PUT",
            headers: authHeaders(),
        });
        return handleResponse(response);
    } catch {
        return { success: false, message: "Error de conexión" };
    }
}

/**
 * Crea una nueva cita médica para el paciente autenticado.
 * @param {{ doctor_id: number, center_id: number, appointment_date: string }} params
 */
export async function createAppointmentAPI({ doctor_id, center_id, appointment_date }) {
    try {
        const response = await fetch(`${BASE}/api/appointment`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify({ doctor_id, center_id, appointment_date }),
        });
        return handleResponse(response);
    } catch {
        return { success: false, message: "Error de conexión" };
    }
}

/**
 * Cancela una cita. Solo el paciente dueño de la cita puede llamar esto.
 * @param {number} appointment_id
 */
export async function cancelAppointmentAPI(appointment_id) {
    try {
        const response = await fetch(`${BASE}/api/appointment/${appointment_id}/cancel`, {
            method: "PUT",
            headers: authHeaders(),
        });
        return handleResponse(response);
    } catch {
        return { success: false, message: "Error de conexión" };
    }
}

/**
 * Reagenda una cita existente a una nueva fecha/hora.
 * @param {number} appointment_id
 * @param {string} appointment_date - Nueva fecha en formato "DD-MM-YYYY HH:mm".
 */
export async function rescheduleAppointmentAPI(appointment_id, appointment_date) {
    try {
        const response = await fetch(`${BASE}/api/appointment/${appointment_id}`, {
            method: "PUT",
            headers: authHeaders(),
            body: JSON.stringify({ appointment_date }),
        });
        return handleResponse(response);
    } catch {
        return { success: false, message: "Error de conexión" };
    }
}

// ── Médicos y Centros ─────────────────────────────────────────────────────────

/** Retorna la lista pública de todos los médicos (no requiere autenticación). */
export async function getDoctors() {
    try {
        const response = await fetch(`${BASE}/api/doctors`);
        return handleResponse(response);
    } catch {
        return { success: false, message: "Error de conexión" };
    }
}

/**
 * Retorna los pacientes únicos que tienen citas con el médico autenticado.
 *
 * @returns {{ success: boolean, data?: Array, message?: string }}
 */
export async function getMyPatients() {
    try {
        const response = await fetch(`${BASE}/api/doctor/patients`, {
            headers: authHeaders(),
        });
        return handleResponse(response);
    } catch {
        return { success: false, message: "Error de conexión" };
    }
}

/** Retorna todas las recetas del paciente autenticado (de cualquier médico), más recientes primero. */
export async function getMyPrescriptions() {
    try {
        const response = await fetch(`${BASE}/api/my/prescriptions`, {
            headers: authHeaders(),
        });
        return handleResponse(response);
    } catch {
        return { success: false, message: "Error de conexión" };
    }
}

/**
 * Crea una receta médica para un paciente. Solo médicos autenticados.
 * Intenta enviar un email al paciente si hay credenciales configuradas en el backend.
 * @param {{ patient_id: number, medication: string, dosage: string, instructions?: string }} data
 */
export async function createPrescription(data) {
    try {
        const response = await fetch(`${BASE}/api/prescription`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    } catch {
        return { success: false, message: "Error de conexión" };
    }
}

/**
 * Retorna las recetas que el médico autenticado ha emitido para un paciente específico.
 * @param {number} patientId
 */
export async function getPatientPrescriptions(patientId) {
    try {
        const response = await fetch(`${BASE}/api/patient/${patientId}/prescriptions`, {
            headers: authHeaders(),
        });
        return handleResponse(response);
    } catch {
        return { success: false, message: "Error de conexión" };
    }
}

/**
 * Crea una entrada en la historia clínica de un paciente. Solo médicos autenticados.
 * La cita referenciada debe estar en estado "Completed" y no tener registro previo.
 * @param {{ appointment_id: number, reason?: string, diagnosis?: string, notes?: string }} data
 */
export async function createClinicalRecord(data) {
    try {
        const response = await fetch(`${BASE}/api/clinical-record`, {
            method: "POST",
            headers: authHeaders(),
            body: JSON.stringify(data),
        });
        return handleResponse(response);
    } catch {
        return { success: false, message: "Error de conexión" };
    }
}

/**
 * Retorna la historia clínica escrita por el médico autenticado para un paciente.
 * @param {number} patientId
 */
export async function getPatientClinicalRecords(patientId) {
    try {
        const response = await fetch(`${BASE}/api/patient/${patientId}/clinical-records`, {
            headers: authHeaders(),
        });
        return handleResponse(response);
    } catch {
        return { success: false, message: "Error de conexión" };
    }
}

/** Retorna la lista pública de todos los centros médicos (no requiere autenticación). */
export async function getCenters() {
    try {
        const response = await fetch(`${BASE}/api/centers`);
        return handleResponse(response);
    } catch {
        return { success: false, message: "Error de conexión" };
    }
}
