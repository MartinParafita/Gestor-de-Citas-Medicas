export const STATUS_COLOR = {
    Pending:   'orange',
    Completed: 'green',
    Cancelled: 'red',
};

export const STATUS_LABEL = {
    Pending:   'Pendiente',
    Completed: 'Completada',
    Cancelled: 'Cancelada',
};

export const doctorMenuData = [
    {
        title: '1. Agenda y citas', icon: '📅',
        links: [
            { name: 'Citas de hoy y próximas', view: 'agenda-hoy' },
            { name: 'Historial de citas', view: 'historial-citas' },
        ],
    },
    { title: '2. Información de pacientes', icon: '📄', links: [{ name: 'Mis pacientes', view: 'mis-pacientes' }] },
    { title: '3. Prescripciones', icon: '✍️', links: [{ name: 'Ver recetas por paciente', view: 'mis-pacientes' }] },
    { title: '4. Comunicación', icon: '💬', links: [{ name: 'Próximamente', view: 'placeholder' }] },
    { title: '5. Reportes y estadísticas', icon: '📈', links: [{ name: 'Mis estadísticas', view: 'reportes' }] },
    {
        title: '6. Administración y perfil', icon: '⚙️',
        links: [{ name: 'Mi perfil', view: 'perfil' }],
    },
    { title: '7. Telemedicina', icon: '💻', links: [{ name: 'Próximamente', view: 'placeholder' }] },
];
