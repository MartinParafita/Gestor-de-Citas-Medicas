import React, { useEffect, useMemo, useState } from 'react';
import {
    getMyInsurance,
    upsertMyInsurance,
    getMyBillingItems,
    payMyBillingItem,
} from '../../../services/fetch';

const cardStyle = {
    background: '#f8f9fa',
    border: '1px solid #e3e6ea',
    borderRadius: '10px',
    padding: '16px',
    marginBottom: '12px',
};

const STATUS_LABEL = {
    pendiente: 'Pendiente',
    pagado: 'Pagado',
    anulado: 'Anulado',
};

const statusColor = (status) => {
    if (status === 'pendiente') return '#ff9800';
    if (status === 'pagado') return '#2e7d32';
    if (status === 'anulado') return '#6c757d';
    return '#6c757d';
};

const FacturacionSeguros = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [insurance, setInsurance] = useState(null);
    const [providerName, setProviderName] = useState('');
    const [policyNumber, setPolicyNumber] = useState('');
    const [planName, setPlanName] = useState('');
    const [coveragePercent, setCoveragePercent] = useState(0);
    const [savingInsurance, setSavingInsurance] = useState(false);

    const [items, setItems] = useState([]);
    const [statusFilter, setStatusFilter] = useState('');
    const [payingId, setPayingId] = useState(null);

    const copayPercent = useMemo(() => Math.max(0, 100 - Number(coveragePercent || 0)), [coveragePercent]);

    const pendingTotal = useMemo(
        () => items.filter(i => i.status === 'pendiente').reduce((acc, i) => acc + Number(i.amount || 0), 0),
        [items]
    );

    const loadData = async (status = statusFilter) => {
        setLoading(true);
        const [insuranceResult, itemsResult] = await Promise.all([
            getMyInsurance(),
            getMyBillingItems(status),
        ]);

        if (insuranceResult.success) {
            const data = insuranceResult.data;
            setInsurance(data);
            setProviderName(data?.provider_name || '');
            setPolicyNumber(data?.policy_number || '');
            setPlanName(data?.plan_name || '');
            setCoveragePercent(data?.coverage_percent ?? 0);
        } else {
            setError(insuranceResult.message || 'No se pudo cargar tu póliza.');
        }

        if (itemsResult.success) {
            setItems(itemsResult.data || []);
        } else {
            setError(itemsResult.message || 'No se pudo cargar tu historial de cargos.');
        }

        setLoading(false);
    };

    useEffect(() => {
        loadData(statusFilter);
    }, [statusFilter]);

    const handleSaveInsurance = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!providerName.trim() || !policyNumber.trim()) {
            setError('Aseguradora y número de póliza son obligatorios.');
            return;
        }

        setSavingInsurance(true);
        const result = await upsertMyInsurance({
            provider_name: providerName.trim(),
            policy_number: policyNumber.trim(),
            plan_name: planName.trim() || null,
            coverage_percent: Number(coveragePercent),
            is_active: true,
        });
        setSavingInsurance(false);

        if (!result.success) {
            setError(result.message || 'No se pudo guardar la póliza.');
            return;
        }

        setInsurance(result.data);
        setSuccess('Póliza actualizada correctamente.');
    };

    const handlePay = async (itemId) => {
        setPayingId(itemId);
        const result = await payMyBillingItem(itemId);
        setPayingId(null);
        if (!result.success) {
            setError(result.message || 'No se pudo marcar como pagado.');
            return;
        }
        setItems(prev => prev.map(i => i.id === itemId ? result.data : i));
    };

    if (loading) return <p style={{ color: '#888' }}>Cargando facturación y seguros...</p>;

    return (
        <div className="cita-container">
            <h2>Facturación y seguros</h2>
            <p style={{ color: '#6c757d', marginBottom: '18px' }}>
                Información orientativa de cobertura y cargos. No sustituye factura fiscal.
            </p>

            {error && <p style={{ color: 'red', marginBottom: '10px' }}>{error}</p>}
            {success && <p style={{ color: 'green', marginBottom: '10px' }}>{success}</p>}

            <form onSubmit={handleSaveInsurance} style={cardStyle}>
                <h4 style={{ marginTop: 0, marginBottom: '10px' }}>Mi póliza</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <input
                        placeholder="Aseguradora"
                        value={providerName}
                        onChange={e => setProviderName(e.target.value)}
                        style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }}
                    />
                    <input
                        placeholder="Número de póliza"
                        value={policyNumber}
                        onChange={e => setPolicyNumber(e.target.value)}
                        style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }}
                    />
                    <input
                        placeholder="Plan (opcional)"
                        value={planName}
                        onChange={e => setPlanName(e.target.value)}
                        style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }}
                    />
                    <input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="Cobertura (%)"
                        value={coveragePercent}
                        onChange={e => setCoveragePercent(e.target.value)}
                        style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '6px' }}
                    />
                </div>
                <button
                    type="submit"
                    disabled={savingInsurance}
                    style={{ marginTop: '10px', padding: '8px 14px', border: 'none', borderRadius: '8px', background: '#20B2AA', color: 'white', cursor: 'pointer' }}
                >
                    {savingInsurance ? 'Guardando...' : insurance ? 'Actualizar póliza' : 'Guardar póliza'}
                </button>
            </form>

            <div style={cardStyle}>
                <h4 style={{ marginTop: 0, marginBottom: '8px' }}>Resumen de cobertura</h4>
                {insurance ? (
                    <>
                        <p style={{ margin: '0 0 6px' }}><strong>Aseguradora:</strong> {insurance.provider_name}</p>
                        <p style={{ margin: '0 0 6px' }}><strong>Póliza:</strong> {insurance.policy_number}</p>
                        <p style={{ margin: '0 0 6px' }}><strong>Cobertura:</strong> {insurance.coverage_percent}%</p>
                        <p style={{ margin: '0 0 6px' }}><strong>Copago estimado:</strong> {copayPercent}%</p>
                    </>
                ) : (
                    <p style={{ margin: 0, color: '#666' }}>Aún no tienes póliza registrada.</p>
                )}
            </div>

            <div style={cardStyle}>
                <h4 style={{ marginTop: 0, marginBottom: '8px' }}>Cargos automáticos</h4>
                <p style={{ margin: 0, color: '#555' }}>
                    Los cargos se generan automáticamente cuando una cita queda completada.
                    Esta sección es de solo lectura para el paciente.
                </p>
            </div>

            <div style={cardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '10px', flexWrap: 'wrap' }}>
                    <h4 style={{ margin: 0 }}>Historial de cargos</h4>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <label><strong>Filtro:</strong></label>
                        <select
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            style={{ padding: '6px', border: '1px solid #ccc', borderRadius: '6px' }}
                        >
                            <option value="">Todos</option>
                            <option value="pendiente">Pendientes</option>
                            <option value="pagado">Pagados</option>
                            <option value="anulado">Anulados</option>
                        </select>
                    </div>
                </div>

                <p style={{ marginTop: 0, marginBottom: '10px' }}>
                    <strong>Total pendiente:</strong> {pendingTotal.toFixed(2)} EUR
                </p>

                {items.length === 0 ? (
                    <p style={{ color: '#666', margin: 0 }}>No hay cargos para mostrar.</p>
                ) : (
                    items.map((item) => (
                        <div key={item.id} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '10px', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                                <strong>{item.concept}</strong>
                                <span style={{ color: statusColor(item.status), fontWeight: 'bold' }}>
                                    {STATUS_LABEL[item.status] || item.status}
                                </span>
                            </div>
                            <p style={{ margin: '6px 0' }}>
                                {Number(item.amount).toFixed(2)} {item.currency}
                                {item.due_date ? ` · Vence ${new Date(item.due_date).toLocaleDateString('es-ES')}` : ''}
                            </p>
                            {item.status === 'pendiente' && (
                                <button
                                    onClick={() => handlePay(item.id)}
                                    disabled={payingId === item.id}
                                    style={{ padding: '6px 12px', border: 'none', borderRadius: '6px', background: '#28a745', color: 'white', cursor: 'pointer' }}
                                >
                                    {payingId === item.id ? 'Procesando...' : 'Marcar pagado'}
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default FacturacionSeguros;
