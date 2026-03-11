/**
 * HIPAA Compliance: Inactivity Warning Modal
 * 
 * Shows a countdown warning before automatic logout due to inactivity.
 * Users can extend their session or log out immediately.
 */

import React from 'react';

interface InactivityWarningModalProps {
  secondsRemaining: number;
  onStayLoggedIn: () => void;
  onLogout: () => void;
}

const InactivityWarningModal: React.FC<InactivityWarningModalProps> = ({
  secondsRemaining,
  onStayLoggedIn,
  onLogout,
}) => {
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const isUrgent = secondsRemaining <= 30;

  return (
    <div
      className="inactivity-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="inactivity-title"
      aria-describedby="inactivity-desc"
    >
      <div className="inactivity-modal">
        {/* Warning icon */}
        <div className={`inactivity-icon ${isUrgent ? 'urgent' : ''}`}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>

        <h2 id="inactivity-title" className="inactivity-title">
          Sesión por Expirar
        </h2>

        <p id="inactivity-desc" className="inactivity-desc">
          Por seguridad de sus datos médicos (HIPAA), su sesión se cerrará
          automáticamente por inactividad.
        </p>

        <div className={`inactivity-countdown ${isUrgent ? 'urgent' : ''}`}>
          {timeDisplay}
        </div>

        <div className="inactivity-actions">
          <button
            className="inactivity-btn-stay"
            onClick={onStayLoggedIn}
            autoFocus
          >
            Continuar Sesión
          </button>
          <button
            className="inactivity-btn-logout"
            onClick={onLogout}
          >
            Cerrar Sesión
          </button>
        </div>
      </div>

      <style>{`
        .inactivity-overlay {
          position: fixed;
          inset: 0;
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          animation: inactivityFadeIn 0.3s ease-out;
        }

        @keyframes inactivityFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .inactivity-modal {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          max-width: 420px;
          width: 90%;
          text-align: center;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          animation: inactivitySlideUp 0.3s ease-out;
        }

        @keyframes inactivitySlideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .inactivity-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 64px;
          height: 64px;
          border-radius: 50%;
          background: #fef3c7;
          color: #d97706;
          margin-bottom: 1rem;
          transition: all 0.3s;
        }

        .inactivity-icon.urgent {
          background: #fee2e2;
          color: #dc2626;
          animation: inactivityPulse 1s ease-in-out infinite;
        }

        @keyframes inactivityPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .inactivity-title {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 0.5rem;
        }

        .inactivity-desc {
          color: #6b7280;
          font-size: 0.875rem;
          line-height: 1.5;
          margin: 0 0 1.5rem;
        }

        .inactivity-countdown {
          font-size: 3rem;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
          color: #d97706;
          margin-bottom: 1.5rem;
          transition: color 0.3s;
        }

        .inactivity-countdown.urgent {
          color: #dc2626;
        }

        .inactivity-actions {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .inactivity-btn-stay {
          padding: 0.75rem 1.5rem;
          border-radius: 10px;
          border: none;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          background: linear-gradient(135deg, #2563eb, #1d4ed8);
          color: white;
          transition: all 0.2s;
        }

        .inactivity-btn-stay:hover {
          background: linear-gradient(135deg, #1d4ed8, #1e40af);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
        }

        .inactivity-btn-logout {
          padding: 0.75rem 1.5rem;
          border-radius: 10px;
          border: 1px solid #e5e7eb;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          background: transparent;
          color: #6b7280;
          transition: all 0.2s;
        }

        .inactivity-btn-logout:hover {
          background: #f9fafb;
          border-color: #d1d5db;
          color: #374151;
        }

        @media (prefers-color-scheme: dark) {
          .inactivity-modal {
            background: #1f2937;
          }
          .inactivity-title { color: #f9fafb; }
          .inactivity-desc { color: #9ca3af; }
          .inactivity-btn-logout {
            border-color: #4b5563;
            color: #9ca3af;
          }
          .inactivity-btn-logout:hover {
            background: #374151;
            color: #e5e7eb;
          }
        }
      `}</style>
    </div>
  );
};

export default InactivityWarningModal;
