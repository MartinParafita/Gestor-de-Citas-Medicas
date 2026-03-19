export const initialStore = () => ({
    user: null,   // { id, email, first_name, last_name, ... }
    token: null,  // JWT string
    role: null,   // "paciente" | "doctor"
});

export default function storeReducer(store, action = {}) {
    switch (action.type) {

        /**
         * set_user
         * Se dispara al hacer login exitoso.
         * payload: { user, token, role }
         */
        case 'set_user':
            return {
                ...store,
                user: action.payload.user,
                token: action.payload.token,
                role: action.payload.role,
            };

        /**
         * update_user
         * Se dispara al guardar cambios de perfil.
         * Actualiza solo los campos de `user` que vengan en el payload,
         * manteniendo token y role intactos.
         * payload: campos actualizados del usuario (parcial o completo)
         */
        case 'update_user':
            return {
                ...store,
                user: { ...store.user, ...action.payload },
            };

        /**
         * logout
         * Limpia toda la sesión del store.
         */
        case 'logout':
            return {
                ...store,
                user: null,
                token: null,
                role: null,
            };

        default:
            throw Error(`Unknown action: ${action.type}`);
    }
}
