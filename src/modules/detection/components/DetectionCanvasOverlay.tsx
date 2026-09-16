import React, { forwardRef } from 'react';

export interface DetectionCanvasOverlayProps {
  className?: string;
  style?: React.CSSProperties;
}

export const DetectionCanvasOverlay = forwardRef<HTMLCanvasElement, DetectionCanvasOverlayProps>(
  ({ className = '', style }, ref) => {
    return (
      <canvas
        ref={ref}
        className={className}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 3,
          ...style,
        }}
      />
    );
  }
);

DetectionCanvasOverlay.displayName = 'DetectionCanvasOverlay';
