import { CameraCard } from '../modules/camera/components/CameraCard';
import type { CameraCardProps } from '../modules/camera/components/CameraCard';
import type { DetectionUpdateData } from '../modules/detection/types/detection.types';

export type { DetectionUpdateData };

export const CctvViewer: React.FC<CameraCardProps> = (props) => {
  return <CameraCard {...props} />;
};

export default CctvViewer;
