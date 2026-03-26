import React from 'react';

const Reportes = ({ appointments, patients }) => {
    const now          = new Date();
    const currentMonth = now.getMonth();
    const currentYear  = now.getFullYear();

    // ── KPIs ──────────────────────────────────────────────────────────────────
    const total     = appointments.length;
    const thisMonth = appointments.filter(a => {
        const d = new Date(a.appointment_date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;
    const completed = appointments.filter(a => a.status === 'Completed').length;
    const cancelled = appointments.filter(a => a.status === 'Cancelled').length;
    const pending   = appointments.filter(a => a.status === 'Pending').length;

    // ── Citas por mes (últimos 6 meses) ───────────────────────────────────────
    const months = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(currentYear, currentMonth - (5 - i), 1);
        return { label: d.toLocaleString('es-ES', { month: 'short' }), month: d.getMonth(), year: d.getFullYear(), count: 0 };
    });
    appointments.forEach(a => {
        const d = new Date(a.appointment_date);
        const m = months.find(mo => mo.month === d.getMonth() && mo.year === d.getFullYear());
        if (m) m.count++;
    });
    const maxCount = Math.max(...months.map(m => m.count), 1);

    // ── Distribución de estados ───────────────────────────────────────────────
    const statuses = [
        { label: 'Pendientes',  count: pending,   color: '#0056b3' },
        { label: 'Completadas', count: completed, color: '#2e7d32' },
        { label: 'Canceladas',  count: cancelled, color: '#c62828' },
    ];

    return (
        <div className="reportes-container">
            <h2>Reportes y estadísticas</h2>

            {/* KPI Cards */}
            <div className="kpi-grid">
                <div className="kpi-card">
                    <span className="kpi-value">{total}</span>
                    <span className="kpi-label">Total citas</span>
                </div>
                <div className="kpi-card">
                    <span className="kpi-value">{thisMonth}</span>
                    <span className="kpi-label">Este mes</span>
                </div>
                <div className="kpi-card">
                    <span className="kpi-value">{patients.length}</span>
                    <span className="kpi-label">Pacientes únicos</span>
                </div>
                <div className="kpi-card kpi-green">
                    <span className="kpi-value">{completed}</span>
                    <span className="kpi-label">Completadas</span>
                </div>
            </div>

            {/* Gráfico de barras: citas por mes */}
            <div className="stats-section">
                <h3>Citas por mes — últimos 6 meses</h3>
                <div className="bar-chart">
                    {months.map((m, i) => (
                        <div key={i} className="bar-col">
                            <div className="bar-wrapper">
                                <div
                                    className="bar-fill"
                                    style={{ height: `${(m.count / maxCount) * 100}%` }}
                                    title={`${m.count} citas`}
                                />
                            </div>
                            <span className="bar-value">{m.count}</span>
                            <span className="bar-label">{m.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Distribución de estados */}
            <div className="stats-section">
                <h3>Distribución de estados</h3>
                {total === 0 ? (
                    <p className="no-data">Sin datos para mostrar.</p>
                ) : (
                    <div className="status-dist">
                        {statuses.map((s, i) => (
                            <div key={i} className="status-row">
                                <span className="status-dist-label">{s.label}</span>
                                <div className="status-dist-bar-track">
                                    <div
                                        className="status-dist-bar-fill"
                                        style={{ width: `${Math.round((s.count / total) * 100)}%`, background: s.color }}
                                    />
                                </div>
                                <span className="status-dist-count">
                                    {s.count} ({Math.round((s.count / total) * 100)}%)
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Reportes;

