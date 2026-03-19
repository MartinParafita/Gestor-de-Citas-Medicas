const BASE = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getToken() {
    return localStorage.getItem("jwt_token");
}

function authHeaders() {
    return {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
    };
}

async function handleResponse(response) {
    const data = await response.json();
    if (!response.ok) {
        return { success: false, message: data.msg || data.error || "Error desconocido" };
    }
    return { success: true, data };
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function register(userData) {
    if (userData.role === "paciente") return registerPatient(userData);
    if (userData.role === "doctor")   return registerDoctor(userData);
    return { success: false, message: "Rol no válido" };
}

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
 *   - email          {string}  Nuevo email.
 *   - specialty      {string}  Nueva especialidad.
 *   - work_days      {number}  Días de trabajo por semana (1-7).
 *   - current_password {string} Contraseña actual (requerida para cambiar contraseña).
 *   - new_password   {string}  Nueva contraseña (requerida para cambiar contraseña).
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

export async function getCenters() {
    try {
        const response = await fetch(`${BASE}/api/centers`);
        return handleResponse(response);
    } catch {
        return { success: false, message: "Error de conexión" };
    }
}
