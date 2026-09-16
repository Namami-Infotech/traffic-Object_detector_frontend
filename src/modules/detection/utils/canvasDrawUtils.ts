import type { LineConfig, TrackedObject } from '../types/detection.types';

const CLASS_COLORS: Record<string, string> = {
  car: '#10b981',       // emerald green
  bus: '#f59e0b',       // amber yellow
  truck: '#ef4444',     // red
  motorcycle: '#8b5cf6',// purple
  person: '#06b6d4',    // cyan
  bicycle: '#3b82f6',   // blue
};

export function drawVirtualLine(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  lineConfig: LineConfig,
  customLineCoord?: number
): void {
  const lineCoord =
    customLineCoord !== undefined
      ? customLineCoord
      : lineConfig.orientation === 'HORIZONTAL'
      ? (height * lineConfig.positionPercent) / 100
      : (width * lineConfig.positionPercent) / 100;

  // Don't draw if completely out of view
  if (lineCoord < -50 || (lineConfig.orientation === 'HORIZONTAL' ? lineCoord > height + 50 : lineCoord > width + 50)) {
    return;
  }

  ctx.save();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = '#f59e0b';
  ctx.shadowColor = 'rgba(245, 158, 11, 0.5)';
  ctx.shadowBlur = 6;

  ctx.beginPath();
  if (lineConfig.orientation === 'HORIZONTAL') {
    ctx.moveTo(0, lineCoord);
    ctx.lineTo(width, lineCoord);
  } else {
    ctx.moveTo(lineCoord, 0);
    ctx.lineTo(lineCoord, height);
  }
  ctx.stroke();
  ctx.restore();

  // Badges & Directional Arrows
  const isLarge = width >= 900;
  const fontMain = isLarge ? 'bold 13px Outfit, sans-serif' : 'bold 12px Outfit, sans-serif';
  const fontBadge = isLarge ? 'bold 12px Outfit, sans-serif' : 'bold 11px Outfit, sans-serif';

  if (lineConfig.orientation === 'HORIZONTAL') {
    // Center / Left line label badge
    ctx.fillStyle = 'rgba(217, 119, 6, 0.94)';
    ctx.beginPath();
    ctx.roundRect(16, lineCoord - 28, 205, 24, 6);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = fontMain;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(`FULL-BODY LINE (${lineConfig.positionPercent}%)`, 24, lineCoord - 16);

    // IN badge (Green)
    ctx.fillStyle = 'rgba(5, 150, 105, 0.94)';
    ctx.beginPath();
    ctx.roundRect(width - 138, lineCoord + 6, 126, 24, 6);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = fontBadge;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText('▼ IN (Full Body)', width - 130, lineCoord + 18);

    // OUT badge (Red)
    ctx.fillStyle = 'rgba(220, 38, 38, 0.94)';
    ctx.beginPath();
    ctx.roundRect(width - 138, lineCoord - 30, 126, 24, 6);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = fontBadge;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText('▲ OUT (Full Body)', width - 130, lineCoord - 18);
  } else {
    // Vertical line labels
    ctx.fillStyle = 'rgba(217, 119, 6, 0.94)';
    ctx.beginPath();
    ctx.roundRect(lineCoord - 100, 16, 200, 24, 6);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = fontMain;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(`FULL-BODY LINE (${lineConfig.positionPercent}%)`, lineCoord - 92, 28);

    // IN badge
    ctx.fillStyle = 'rgba(5, 150, 105, 0.94)';
    ctx.beginPath();
    ctx.roundRect(lineCoord + 8, 50, 126, 24, 6);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = fontBadge;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText('IN (Full Body) ►', lineCoord + 16, 62);

    // OUT badge
    ctx.fillStyle = 'rgba(220, 38, 38, 0.94)';
    ctx.beginPath();
    ctx.roundRect(lineCoord - 134, 50, 126, 24, 6);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = fontBadge;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText('◄ OUT (Full Body)', lineCoord - 126, 62);
  }
}

export function drawTrackedObjects(
  ctx: CanvasRenderingContext2D,
  objects: TrackedObject[],
  showTrajectories: boolean = true
): void {
  objects.forEach((obj) => {
    if (obj.disappeared > 0) return;

    const [x, y, width, height] = obj.bbox;
    const [cx, cy] = obj.centroid;
    const label = obj.label.toLowerCase();
    const baseColor = CLASS_COLORS[label] || '#3b82f6';

    // 1. Motion Trail Trajectory
    if (showTrajectories && obj.trajectory.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.moveTo(obj.trajectory[0][0], obj.trajectory[0][1]);
      for (let i = 1; i < obj.trajectory.length; i++) {
        ctx.lineTo(obj.trajectory[i][0], obj.trajectory[i][1]);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      obj.trajectory.forEach(([tx, ty]) => {
        ctx.beginPath();
        ctx.arc(tx, ty, 3, 0, 2 * Math.PI);
        ctx.fillStyle = baseColor;
        ctx.fill();
      });
    }

    // 2. Bounding Box
    ctx.strokeStyle = obj.isCrossing ? '#f59e0b' : baseColor;
    ctx.lineWidth = obj.isCrossing ? 3.5 : obj.isStationary ? 2 : 2.5;
    ctx.strokeRect(x, y, width, height);

    // 3. Centroid Dot
    ctx.beginPath();
    ctx.arc(cx, cy, 4.5, 0, 2 * Math.PI);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = obj.isCrossing ? '#f59e0b' : baseColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // 4. Header Badge
    let statusBadge = '';
    if (obj.isStationary) {
      statusBadge = ' [STABLE]';
    } else if (obj.isCrossing) {
      statusBadge = ' [CROSSING LINE...]';
    } else if (obj.crossedIn) {
      statusBadge = ' [FULL BODY IN]';
    } else if (obj.crossedOut) {
      statusBadge = ' [FULL BODY OUT]';
    }

    const badgeText = `${obj.label.toUpperCase()} #${obj.id} ${Math.round(obj.score * 100)}%${statusBadge}`;
    ctx.font = 'bold 12px Outfit, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const textWidth = ctx.measureText(badgeText).width;

    const badgeHeight = 22;
    const badgeY = y > badgeHeight + 2 ? y - badgeHeight - 2 : y + 2;

    ctx.fillStyle = obj.isCrossing ? '#d97706' : obj.isStationary ? '#475569' : baseColor;
    ctx.beginPath();
    ctx.roundRect(x, badgeY, textWidth + 14, badgeHeight, 4);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.fillText(badgeText, x + 7, badgeY + badgeHeight / 2);

    // 5. Pulse banner if recently crossed line (< 2s)
    if (obj.lastCrossedTimestamp && Date.now() - obj.lastCrossedTimestamp < 2000) {
      const crossedType = obj.crossedIn ? 'FULL BODY IN (+1)' : 'FULL BODY OUT (+1)';
      const pulseColor = obj.crossedIn ? '#059669' : '#dc2626';

      ctx.fillStyle = pulseColor;
      ctx.beginPath();
      ctx.roundRect(cx - 75, cy - 35, 150, 26, 6);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(crossedType, cx, cy - 22);
      ctx.textAlign = 'left';
    }
  });
}
