import React, { useState, useEffect } from 'react';
import { getMyDocuments, uploadDocument, deleteDocument } from '../../../services/fetch';

const DOC_LABELS = {
    dni: 'DNI / Documento de identidad',
    tarjeta_sanitaria: 'Tarjeta sanitaria',
};

/**
 * DocumentosPersonales
 *
 * Permite al paciente subir, ver y eliminar su DNI y tarjeta sanitaria.
 * Los archivos se almacenan en Cloudinary; solo se guarda la URL en la BD.
 * Cada tipo de documento admite un único archivo (upsert).
 *
 * Tipos disponibles:
 *   - "dni"               → DNI / Documento de identidad
 *   - "tarjeta_sanitaria" → Tarjeta sanitaria
 */
const DocumentosPersonales = () => {
    const [docs, setDocs]         = useState({});   // { dni: {...}, tarjeta_sanitaria: {...} }
    const [loading, setLoading]   = useState(true);
    const [uploading, setUploading] = useState(''); // doc_type en proceso de subida
    const [deleting, setDeleting]   = useState(''); // doc_type en proceso de eliminación
    const [error, setError]       = useState('');
    const [success, setSuccess]   = useState('');

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const result = await getMyDocuments();
            if (result.success) {
                const map = {};
                result.data.forEach(d => { map[d.doc_type] = d; });
                setDocs(map);
            } else {
                setError(result.message || 'Error al cargar documentos.');
            }
            setLoading(false);
        };
        load();
    }, []);

    const handleUpload = async (docType, e) => {
        const file = e.target.files[0];
        if (!file) return;
        setError('');
        setSuccess('');
        setUploading(docType);
        const result = await uploadDocument(docType, file);
        setUploading('');
        if (result.success) {
            setDocs(prev => ({ ...prev, [docType]: result.data }));
            setSuccess(`${DOC_LABELS[docType]} subido correctamente.`);
        } else {
            setError(result.message || 'Error al subir el documento.');
        }
        e.target.value = '';
    };

    const handleDelete = async (docType) => {
        setError('');
        setSuccess('');
        setDeleting(docType);
        const result = await deleteDocument(docType);
        setDeleting('');
        if (result.success) {
            setDocs(prev => { const next = { ...prev }; delete next[docType]; return next; });
            setSuccess(`${DOC_LABELS[docType]} eliminado.`);
        } else {
            setError(result.message || 'Error al eliminar el documento.');
        }
    };

    return (
        <div className="cita-container">
            <h2>📁 Documentos Personales</h2>
            <p style={{ color: '#6c757d', marginBottom: '24px' }}>
                Sube tu DNI y tarjeta sanitaria. Los archivos se almacenan de forma segura.
            </p>

            {loading ? (
                <p style={{ color: '#888' }}>Cargando documentos...</p>
            ) : (
                <>
                    {error   && <p style={{ color: 'red',   marginBottom: '12px' }}>{error}</p>}
                    {success && <p style={{ color: 'green', marginBottom: '12px' }}>{success}</p>}

                    {['dni', 'tarjeta_sanitaria'].map(docType => {
                        const existing = docs[docType];
                        const isUploading = uploading === docType;
                        const isDeleting  = deleting  === docType;

                        return (
                            <div
                                key={docType}
                                className="appointment-view gestion-item"
                                style={{ marginBottom: '16px', borderLeft: '4px solid #20B2AA' }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                                    <div>
                                        <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>{DOC_LABELS[docType]}</p>
                                        {existing ? (
                                            <p style={{ fontSize: '0.85em', color: '#6c757d' }}>
                                                Subido el {new Date(existing.uploaded_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                                            </p>
                                        ) : (
                                            <p style={{ fontSize: '0.85em', color: '#aaa' }}>No subido aún</p>
                                        )}
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        {existing && (
                                            <a
                                                href={existing.cloudinary_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="confirm-button"
                                                style={{ fontSize: '0.85em', padding: '6px 14px', textDecoration: 'none', display: 'inline-block' }}
                                            >
                                                Ver
                                            </a>
                                        )}

                                        <label
                                            style={{
                                                background: '#20B2AA',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                padding: '6px 14px',
                                                fontSize: '0.85em',
                                                cursor: isUploading ? 'not-allowed' : 'pointer',
                                                opacity: isUploading ? 0.7 : 1,
                                            }}
                                        >
                                            {isUploading ? 'Subiendo...' : existing ? 'Reemplazar' : 'Subir'}
                                            <input
                                                type="file"
                                                accept="image/*,.pdf"
                                                style={{ display: 'none' }}
                                                disabled={isUploading}
                                                onChange={e => handleUpload(docType, e)}
                                            />
                                        </label>

                                        {existing && (
                                            <button
                                                onClick={() => handleDelete(docType)}
                                                disabled={isDeleting}
                                                style={{
                                                    background: '#dc3545',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    padding: '6px 14px',
                                                    fontSize: '0.85em',
                                                    cursor: isDeleting ? 'not-allowed' : 'pointer',
                                                    opacity: isDeleting ? 0.7 : 1,
                                                }}
                                            >
                                                {isDeleting ? 'Eliminando...' : 'Eliminar'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </>
            )}
        </div>
    );
};

export default DocumentosPersonales;
