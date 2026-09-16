import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export interface ErrorAlertProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryText?: string;
  style?: React.CSSProperties;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  title = 'An error occurred',
  message,
  onRetry,
  retryText = 'Retry',
  style,
}) => {
  return (
    <div
      style={{
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '10px',
        padding: '1rem 1.2rem',
        color: '#dc2626',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        ...style,
      }}
    >
      <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
      <div style={{ flex: 1 }}>
        <h4 style={{ fontSize: '0.9rem', fontWeight: 600, margin: '0 0 4px 0' }}>{title}</h4>
        <p style={{ fontSize: '0.82rem', margin: 0, color: 'var(--text-secondary)' }}>{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              marginTop: '10px',
              background: '#dc2626',
              color: '#ffffff',
              border: 'none',
              padding: '5px 12px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RefreshCw size={12} />
            {retryText}
          </button>
        )}
      </div>
    </div>
  );
};
