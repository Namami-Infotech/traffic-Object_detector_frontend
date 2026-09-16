import React from 'react';
import { Loader2 } from 'lucide-react';

export interface LoadingSpinnerProps {
  size?: number;
  message?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 24,
  message,
  className = '',
  style,
}) => {
  return (
    <div
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        color: 'var(--text-secondary)',
        padding: '1rem',
        ...style,
      }}
    >
      <Loader2 size={size} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
      {message && <span style={{ fontSize: '0.85rem' }}>{message}</span>}
    </div>
  );
};
