export const initialStore = () => ({
    user: null,   // { id, email, first_name, last_name, ... }
    token: null,  // JWT string
    role: null,   // "paciente" | "doctor"
});

export default function storeReducer(store, action = {}) {
    switch (action.type) {
        case 'set_user':
            return {
                ...store,
                user: action.payload.user,
                token: action.payload.token,
                role: action.payload.role,
            };
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
