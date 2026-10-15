import React from 'react';
import { useAuth } from '../auth/context/AuthContext';
import { CctvView } from './CctvView';
import { DetectionView } from './DetectionView';
import { UsersView } from './UsersView';
import { StaffView } from './StaffView';
import { ParkingView } from './ParkingView';
import { BookingTable } from './bookingtable';
import { RolesView } from './RolesView';
import { TollView } from './TollView';

export interface ModuleViewsProps {
  moduleId: string;
  cameras?: any[];
  activeCamera?: any;
  viewMode?: 'GRID' | 'SINGLE';
  handleDetectionUpdate?: (camId: string, data: any) => void;
  setIsAiLoading?: (loading: boolean) => void;
  displayLiveCounts?: Record<string, number>;
  mergedVehicleInOut?: Record<string, { in: number; out: number }>;
  displayInCount?: number;
  displayOutCount?: number;
  displayActiveCount?: number;
  displayTotalDetections?: number;
  dbCameraStats?: any;
  cameraVehicleInOutMap?: Record<string, Record<string, { in: number; out: number }>>;
  liveLogs?: any[];
  onClearLogs?: () => void;
  onOpenPlateScanner?: () => void;
  onOpenAddCamera?: () => void;
}

export const ModuleViews: React.FC<ModuleViewsProps> = ({
  moduleId,
  cameras = [],
  activeCamera,
  viewMode = 'GRID',
  handleDetectionUpdate,
  setIsAiLoading,
  displayLiveCounts = {},
  mergedVehicleInOut = {},
  displayInCount = 0,
  displayOutCount = 0,
  displayActiveCount = 0,
  displayTotalDetections = 0,
  dbCameraStats = {},
  cameraVehicleInOutMap = {},
  liveLogs = [],
  onClearLogs,
  onOpenPlateScanner,
  onOpenAddCamera,
}) => {
  const { hasActionPermission } = useAuth();
  const canRead = hasActionPermission(moduleId, 'read');
  const canWrite = hasActionPermission(moduleId, 'write');
  const canDelete = hasActionPermission(moduleId, 'delete');

  if (moduleId === 'cctv') {
    return (
      <CctvView
        canWrite={canWrite}
        cameras={cameras}
        activeCamera={activeCamera}
        viewMode={viewMode}
        handleDetectionUpdate={handleDetectionUpdate}
        setIsAiLoading={setIsAiLoading}
        displayLiveCounts={displayLiveCounts}
        mergedVehicleInOut={mergedVehicleInOut}
        displayInCount={displayInCount}
        displayOutCount={displayOutCount}
        displayActiveCount={displayActiveCount}
        dbCameraStats={dbCameraStats}
        cameraVehicleInOutMap={cameraVehicleInOutMap}
        onOpenPlateScanner={onOpenPlateScanner}
        onOpenAddCamera={onOpenAddCamera}
      />
    );
  }

  if (moduleId === 'detection') {
    return (
      <DetectionView
        displayInCount={displayInCount}
        displayOutCount={displayOutCount}
        displayActiveCount={displayActiveCount}
        displayTotalDetections={displayTotalDetections}
        liveLogs={liveLogs}
        onClearLogs={onClearLogs}
        onOpenPlateScanner={onOpenPlateScanner}
      />
    );
  }

  if (moduleId === 'users') {
    return <UsersView canWrite={canWrite} canDelete={canDelete} />;
  }

  if (moduleId === 'staff') {
    return <StaffView canWrite={canWrite} canDelete={canDelete} />;
  }

  if (moduleId === 'parking') {
    return (
      <ParkingView
        canWrite={canWrite}
        canDelete={canDelete}
        cameras={cameras}
        activeCamera={activeCamera}
        viewMode={viewMode}
        handleDetectionUpdate={handleDetectionUpdate}
        setIsAiLoading={setIsAiLoading}
        displayLiveCounts={displayLiveCounts}
        mergedVehicleInOut={mergedVehicleInOut}
        displayInCount={displayInCount}
        displayOutCount={displayOutCount}
        displayActiveCount={displayActiveCount}
        dbCameraStats={dbCameraStats}
        cameraVehicleInOutMap={cameraVehicleInOutMap}
      />
    );
  }

  if (moduleId === 'booking') {
    return <BookingTable canWrite={canWrite} canDelete={canDelete} />;
  }

  if (moduleId === 'roles') {
    return <RolesView canWrite={canWrite} canDelete={canDelete} />;
  }

  if (moduleId === 'toll') {
    return <TollView canWrite={canWrite} canDelete={canDelete} />;
  }

  return (
    <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
      <h3>Module: {moduleId}</h3>
      <p>
        Permission Status: Read ({canRead ? 'Yes' : 'No'}), Write ({canWrite ? 'Yes' : 'No'}), Delete ({canDelete ? 'Yes' : 'No'})
      </p>
    </div>
  );
};
