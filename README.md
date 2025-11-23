🏥 Sistema de Gestión de Citas Médicas

Este proyecto es una plataforma web integral diseñada para la gestión eficiente y segura de citas médicas. Permite a los pacientes programar, consultar y gestionar sus citas, mientras que a los profesionales médicos les facilita la visualización y administración de su agenda diaria.

La aplicación sigue una arquitectura Full Stack y ha sido desarrollada con un fuerte enfoque en la separación de responsabilidades y la experiencia de usuario (UX).

🚀 Características Principales

1. Dashboards Dedicados

La aplicación ofrece dos interfaces de usuario completamente separadas y optimizadas para cada rol:

Dashboard del Paciente:

Selección de Centro: Permite al paciente elegir el centro de salud donde desea ser atendido.

Búsqueda y Programación: Facilita la búsqueda de doctores disponibles por especialidad y la reserva de citas en horarios libres.

Gestión de Citas: Permite a los pacientes revisar sus citas futuras y cancelarlas según sea necesario.

Dashboard del Doctor:

Asignación de Centro: El médico puede seleccionar el centro donde va a trabajar para cargar su agenda.

Agenda Interactiva: Visualización clara de las citas diarias a través de un calendario dinámico.

Control de Estado (Misión Crítica): Implementa un menú desplegable interactivo para que el médico pueda actualizar el estado de la cita en tiempo real (Pendiente, En Progreso, Finalizada, Cancelada), reflejando el cambio directamente en la base de datos.

Seguridad: Persistencia de sesión segura para el acceso al panel.

2. Arquitectura de Servicios y Seguridad

Se implementó una arquitectura de API con rutas exclusivas para cada acción crítica, mejorando la robustez y la claridad del código:

Ruta Atómica para el Estado: Se definió la ruta PATCH /appointments/status/<id> que está dedicada exclusivamente al cambio del campo status de una cita. Esto garantiza la integridad de los datos y minimiza riesgos de manipulación accidental de otros campos.

💻 Tecnologías Utilizadas

El proyecto se basa en una arquitectura de servicios moderna que separa claramente el Front-end y el Back-end.

Front-end (Interfaz de Usuario)

El Front-end está construido sobre una pila React robusta y optimizada:

Tecnología Principal: React.

Lenguaje: JavaScript (ES6+).

Manejo de Estado: Uso intensivo de React Hooks (useState, useEffect, useMemo) para la gestión del estado y la optimización del rendimiento (ej: filtrado de citas).

Navegación: react-router-dom para gestionar las rutas de la aplicación.

Estilización: CSS y clases para un diseño responsivo y claro.

Back-end (API y Servicios)

El servidor y la lógica de negocio se gestionan con las siguientes tecnologías:

Lenguaje de Servidor: Python (Asumiendo un framework como Flask o Django).

Arquitectura: RESTful API para definir las rutas HTTP (GET, POST, PATCH) y la comunicación entre el Front-end y la base de datos.

Persistencia de Datos: Base de Datos (SQL o NoSQL) para almacenar información de centros, doctores, pacientes y citas.

Seguridad y Comunicación

Autenticación: Uso de Tokens de Autenticación (Bearer Token) almacenados en localStorage para proteger las rutas críticas.

Conexión Segura: Se recomienda el uso de HTTPS para el cifrado de datos en tránsito.

Manejo de Errores: Implementación de manejadores de errores en las funciones de fetch para notificar fallos del servidor de forma clara al usuario.

⚙️ Configuración y Ejecución

Para ejecutar este proyecto localmente, necesitarás configurar el Back-end y el Front-end.

Clonar el Repositorio:

git clone [https://aws.amazon.com/es/what-is/repo/](https://aws.amazon.com/es/what-is/repo/)
cd [Nombre del proyecto]


Configuración del Back-end (Python):

Instalar dependencias de Python (ej: pip install -r requirements.txt).

Configurar la conexión a la base de datos.

Iniciar el servidor (Ej: python app.py).

Asegúrese de que la API esté disponible en la URL definida como OWN_API.

Configuración del Front-end (React):

Navegar al directorio del Front-end.

Instalar dependencias de Node: npm install o yarn install.

Iniciar la aplicación de React: npm start o yarn start.

La aplicación de React se ejecutará típicamente en http://localhost:3000.
