import React from 'react';

export interface BadgeProps {
  variant?: 'live' | 'warning' | 'danger' | 'info' | 'neutral';
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  icon,
  children,
  className = '',
  style,
}) => {
  const variantClass = `badge-${variant}`;

  return (
    <span className={`badge ${variantClass} ${className}`.trim()} style={style}>
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
