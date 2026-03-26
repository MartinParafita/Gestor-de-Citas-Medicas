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

export const REPORT_TYPE_LABEL = {
    laboratorio: 'Laboratorio',
    imagen:      'Imagen / Diagnóstico por imagen',
    otro:        'Otro',
};

export const patientMenuData = [
    {
        title: '1. Citas médicas', icon: '📅',
        links: [
            { name: 'Agendar cita', view: 'agendar-cita' },
            { name: 'Gestionar citas', view: 'gestionar-citas' },
            { name: 'Historial de citas', view: 'historial-citas' },
        ],
    },
    { title: '2. Resultados e informes', icon: '🔬', links: [{ name: 'Mis informes', view: 'resultados-informes' }] },
    { title: '3. Prescripciones', icon: '💊', links: [{ name: 'Mis recetas', view: 'mis-recetas' }] },
    { title: '4. Facturación y seguros', icon: '💳', links: [{ name: 'Próximamente', view: 'placeholder' }] },
    { title: '5. Comunicación', icon: '💬', links: [{ name: 'Próximamente', view: 'placeholder' }] },
    { title: '6. Documentos personales', icon: '📁', links: [{ name: 'Mis documentos', view: 'documentos-personales' }] },
    { title: '7. Perfil y configuración', icon: '⚙️', links: [{ name: 'Mi perfil', view: 'perfil' }] },
];
