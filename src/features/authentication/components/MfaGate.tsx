/**
 * HIPAA Compliance: MFA Gate
 * 
 * Full-screen page shown to users whose role requires MFA (doctors, admins)
 * before they can access any protected features. Guides them through
 * TOTP enrollment or verification.
 */

import React, { useEffect, useState } from 'react';
import { useMfa } from '../hooks/useMfa';

interface MfaGateProps {
  userRole: string | null | undefined;
  clinicRole?: string | null;
  children: React.ReactNode;
}

const MfaGate: React.FC<MfaGateProps> = ({ userRole, clinicRole, children }) => {
  const {
    status,
    qrCodeUri,
    secret,
    error,
    startEnrollment,
    verifyCode,
  } = useMfa(userRole, clinicRole);

  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Auto-start enrollment when needed
  useEffect(() => {
    if (status === 'needs_enrollment' && !qrCodeUri) {
      startEnrollment();
    }
  }, [status, qrCodeUri, startEnrollment]);

  // If MFA is not required or already verified, render children
  if (status === 'loading') {
    return (
      <div style={styles.container}>
        <div style={styles.spinner} />
        <p style={styles.loadingText}>Verificando seguridad...</p>
      </div>
    );
  }

  if (status === 'not_required' || status === 'verified') {
    return <>{children}</>;
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6 || verifying) return;
    
    setVerifying(true);
    await verifyCode(code);
    setVerifying(false);
    setCode('');
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Shield icon */}
        <div style={styles.iconContainer}>
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="M9 12l2 2 4-4"/>
          </svg>
        </div>

        <h1 style={styles.title}>
          {status === 'needs_enrollment' ? 'Configurar Verificación en Dos Pasos' : 'Verificación Requerida'}
        </h1>

        <p style={styles.subtitle}>
          {status === 'needs_enrollment'
            ? 'Por requisito de seguridad HIPAA, su cuenta médica requiere autenticación de dos factores (MFA).'
            : 'Ingrese el código de 6 dígitos de su aplicación de autenticación.'}
        </p>

        {status === 'needs_enrollment' && qrCodeUri && (
          <div style={styles.enrollSection}>
            <div style={styles.stepBadge}>Paso 1</div>
            <p style={styles.stepText}>
              Escanee este código QR con su aplicación de autenticación (Google Authenticator, Authy, etc.):
            </p>
            
            <div style={styles.qrContainer}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrCodeUri)}`}
                alt="QR Code para MFA"
                style={styles.qrImage}
              />
            </div>

            {secret && (
              <div style={styles.secretContainer}>
                <p style={styles.secretLabel}>O ingrese esta clave manualmente:</p>
                <code style={styles.secretCode}>{secret}</code>
              </div>
            )}

            <div style={styles.stepBadge}>Paso 2</div>
            <p style={styles.stepText}>
              Ingrese el código de 6 dígitos que aparece en su aplicación:
            </p>
          </div>
        )}

        <form onSubmit={handleVerify} style={styles.form}>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            style={styles.codeInput}
            autoFocus
            autoComplete="one-time-code"
          />

          {error && (
            <p style={styles.errorText}>{error}</p>
          )}

          <button
            type="submit"
            disabled={code.length !== 6 || verifying}
            style={{
              ...styles.verifyButton,
              opacity: code.length !== 6 || verifying ? 0.5 : 1,
            }}
          >
            {verifying ? 'Verificando...' : 'Verificar Código'}
          </button>
        </form>

        <p style={styles.footerText}>
          🔒 Protección HIPAA — Expediente Clínico Electrónico
        </p>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    padding: '1rem',
  },
  spinner: {
    width: 40,
    height: 40,
    border: '3px solid rgba(255,255,255,0.2)',
    borderTopColor: '#60a5fa',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: '1rem',
    fontSize: '0.875rem',
  },
  card: {
    background: 'white',
    borderRadius: '20px',
    padding: '2.5rem',
    maxWidth: '480px',
    width: '100%',
    textAlign: 'center' as const,
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
  iconContainer: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
    height: 72,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #dbeafe, #ede9fe)',
    color: '#2563eb',
    marginBottom: '1.5rem',
  },
  title: {
    fontSize: '1.375rem',
    fontWeight: 700,
    color: '#1f2937',
    margin: '0 0 0.5rem',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: '0.875rem',
    lineHeight: 1.6,
    margin: '0 0 1.5rem',
  },
  enrollSection: {
    textAlign: 'left' as const,
    marginBottom: '1rem',
  },
  stepBadge: {
    display: 'inline-block',
    background: '#2563eb',
    color: 'white',
    padding: '0.2rem 0.75rem',
    borderRadius: '999px',
    fontSize: '0.75rem',
    fontWeight: 600,
    marginBottom: '0.5rem',
  },
  stepText: {
    color: '#4b5563',
    fontSize: '0.875rem',
    lineHeight: 1.5,
    marginBottom: '1rem',
  },
  qrContainer: {
    display: 'flex',
    justifyContent: 'center',
    padding: '1rem',
    background: '#f9fafb',
    borderRadius: '12px',
    marginBottom: '1rem',
  },
  qrImage: {
    width: 200,
    height: 200,
    borderRadius: '8px',
  },
  secretContainer: {
    background: '#f3f4f6',
    borderRadius: '8px',
    padding: '0.75rem',
    marginBottom: '1.5rem',
  },
  secretLabel: {
    color: '#6b7280',
    fontSize: '0.75rem',
    margin: '0 0 0.25rem',
  },
  secretCode: {
    color: '#1f2937',
    fontSize: '0.875rem',
    fontWeight: 600,
    letterSpacing: '0.05em',
    wordBreak: 'break-all' as const,
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '0.75rem',
    alignItems: 'center',
  },
  codeInput: {
    width: '180px',
    padding: '0.875rem',
    fontSize: '1.5rem',
    fontWeight: 700,
    textAlign: 'center' as const,
    letterSpacing: '0.3em',
    border: '2px solid #e5e7eb',
    borderRadius: '12px',
    outline: 'none',
    fontVariantNumeric: 'tabular-nums',
  },
  errorText: {
    color: '#dc2626',
    fontSize: '0.8rem',
    margin: 0,
  },
  verifyButton: {
    width: '100%',
    maxWidth: '280px',
    padding: '0.875rem',
    fontSize: '1rem',
    fontWeight: 600,
    color: 'white',
    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  footerText: {
    color: '#9ca3af',
    fontSize: '0.75rem',
    marginTop: '1.5rem',
    marginBottom: 0,
  },
};

export default MfaGate;
