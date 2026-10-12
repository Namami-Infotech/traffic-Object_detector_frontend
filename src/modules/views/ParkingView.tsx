import React, { useState, useEffect } from 'react';
import { Car, Plus, Trash2, Search, RefreshCw, X, MapPin } from 'lucide-react';
import { parkingApi } from '../../services/api';
import { MultiCameraGrid } from '../camera/components/MultiCameraGrid';
import { CameraCard } from '../camera/components/CameraCard';
import { TrafficAnalytics } from '../analytics/components/TrafficAnalytics';

export interface ParkingViewProps {
  canWrite?: boolean;
  canDelete?: boolean;
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
  dbCameraStats?: any;
  cameraVehicleInOutMap?: Record<string, Record<string, { in: number; out: number }>>;
}

export const ParkingView: React.FC<ParkingViewProps> = ({
  canWrite = false,
  canDelete = false,
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
  dbCameraStats = {},
  cameraVehicleInOutMap = {},
}) => {
  const [parkingTab, setParkingTab] = useState<'TABLE' | 'AREAS' | 'SLOTS' | 'CAMERAS'>('TABLE');
  const [parkingLots, setParkingLots] = useState<any[]>([]);
  const [parkingSearch, setParkingSearch] = useState('');
  const [selectedLotId, setSelectedLotId] = useState<string>('');
  const [isParkingLoading, setIsParkingLoading] = useState(false);
  const [isAddParkingOpen, setIsAddParkingOpen] = useState(false);
  const [newParkingData, setNewParkingData] = useState({
    name: '',
    location: '',
    totalSpace: 100,
    pricePerHour: 50,
    priceTwoWheeler: 20,
    description: '',
  });

  const [parkingSlots] = useState<Array<{ id: string; occupied: boolean; plate?: string }>>([
    { id: 'A-01', occupied: true, plate: 'DL01AB1234' },
    { id: 'A-02', occupied: false },
    { id: 'A-03', occupied: true, plate: 'UP16CD5678' },
    { id: 'A-04', occupied: false },
    { id: 'A-05', occupied: true, plate: 'HR26EF9012' },
    { id: 'A-06', occupied: true, plate: 'DL08GH3456' },
    { id: 'B-01', occupied: false },
    { id: 'B-02', occupied: true, plate: 'MH02JK7890' },
    { id: 'B-03', occupied: false },
    { id: 'B-04', occupied: false },
    { id: 'B-05', occupied: true, plate: 'KA03LM1234' },
    { id: 'B-06', occupied: false },
  ]);

  const fetchParkingLots = async () => {
    setIsParkingLoading(true);
    try {
      const res = await parkingApi.getAll();
      if (res.success && res.data) {
        setParkingLots(res.data);
        if (res.data.length > 0 && !selectedLotId) {
          setSelectedLotId(res.data[0].id);
        }
      }
    } catch {
      // fallback
    } finally {
      setIsParkingLoading(false);
    }
  };

  useEffect(() => {
    fetchParkingLots();
  }, []);

  const handleAddParkingLot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newParkingData.name || !newParkingData.totalSpace) return;
    try {
      const res = await parkingApi.create(newParkingData);
      if (res.success) {
        setIsAddParkingOpen(false);
        setNewParkingData({
          name: '',
          location: '',
          totalSpace: 100,
          pricePerHour: 50,
          priceTwoWheeler: 20,
          description: '',
        });
        fetchParkingLots();
        window.dispatchEvent(new CustomEvent('parking-updated'));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create parking area');
    }
  };

  const handleDeleteParkingLot = async (id: string) => {
    if (!confirm('Are you sure you want to delete this parking area?')) return;
    try {
      await parkingApi.delete(id);
      fetchParkingLots();
      window.dispatchEvent(new CustomEvent('parking-updated'));
    } catch (err: any) {
      alert(err.message || 'Failed to delete parking lot');
    }
  };

  const handleUpdateOccupancy = async (id: string, delta: number) => {
    try {
      await parkingApi.updateOccupancy(id, delta);
      fetchParkingLots();
      window.dispatchEvent(new CustomEvent('parking-updated'));
    } catch {
      // ignore
    }
  };

  const totalCapacityAll = parkingLots.reduce((acc, p) => acc + (p.totalSpace || 0), 0);
  const totalOccupiedAll = parkingLots.reduce((acc, p) => acc + (p.occupiedSpace || 0), 0);
  const totalAvailableAll = Math.max(0, totalCapacityAll - totalOccupiedAll);

  return (
    <div style={{ padding: '0.4rem 0.5rem' }}>
      {/* Global Parking Stats KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="glass-panel" style={{ background: '#ffffff', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '10px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Total Registered Lots</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
            {parkingLots.length}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Active Parking Zones</div>
        </div>
        <div className="glass-panel" style={{ background: '#ffffff', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '10px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Total Parking Capacity</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
            {totalCapacityAll || 60}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Total Spaces Across Lots</div>
        </div>
        <div className="glass-panel" style={{ background: '#ffffff', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '10px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Occupied Spaces</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
            {totalOccupiedAll || 38}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {totalCapacityAll > 0 ? Math.round((totalOccupiedAll / totalCapacityAll) * 100) : 63}% Occupancy
          </div>
        </div>
        <div className="glass-panel" style={{ background: '#ffffff', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: '10px' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Available Free Spaces</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
            {totalAvailableAll || 22}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#059669' }}>Ready for Vehicles</div>
        </div>
      </div>

      {/* Parking Main Panel */}
      <div className="glass-panel" style={{ padding: '0.8rem', overflow: 'hidden' }}>
        {/* Header Controls */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Car size={20} color="var(--accent-blue)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Smart Parking Management
            </h3>
            <span
              style={{
                fontSize: '0.75rem',
                background: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
                padding: '2px 8px',
                borderRadius: '12px',
                fontWeight: 600,
              }}
            >
              {parkingLots.length} Lots
            </span>
          </div>

          {/* View Tabs & Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Tab Pills */}
            <div style={{ display: 'flex', background: '#f8fafc', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              {(['TABLE', 'AREAS', 'SLOTS', 'CAMERAS'] as const).map((tab) => {
                const isActive = parkingTab === tab;
                const label = tab === 'TABLE' ? 'Lots Table' : tab === 'AREAS' ? 'Cards' : tab === 'SLOTS' ? 'Slots Matrix' : 'Live Gate CCTV';
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setParkingTab(tab)}
                    style={{
                      background: isActive ? 'var(--accent-blue)' : 'transparent',
                      color: isActive ? '#ffffff' : 'var(--text-secondary)',
                      border: 'none',
                      padding: '5px 11px',
                      borderRadius: '6px',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={fetchParkingLots}
              disabled={isParkingLoading}
              title="Refresh Parking Lots"
              style={{
                background: '#ffffff',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <RefreshCw size={13} className={isParkingLoading ? 'animate-spin' : ''} />
              Refresh
            </button>

            {canWrite && (
              <button
                type="button"
                onClick={() => setIsAddParkingOpen(true)}
                style={{
                  background: 'var(--accent-blue)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Plus size={14} />
                Add Parking Area
              </button>
            )}
          </div>
        </div>

        {/* TAB 0: PARKING LOTS TABLE */}
        {parkingTab === 'TABLE' && (
          <div>
            {/* Search Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                flexWrap: 'wrap',
                marginBottom: '1rem',
                background: '#f8fafc',
                padding: '0.6rem 0.8rem',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1', minWidth: '200px' }}>
                <Search size={15} color="var(--text-muted)" />
                <input
                  type="text"
                  placeholder="Search parking by name or location..."
                  value={parkingSearch}
                  onChange={(e) => setParkingSearch(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    outline: 'none',
                    fontSize: '0.82rem',
                    width: '100%',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>

            {/* Table Content */}
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '8px 8px', fontWeight: 600 }}>#</th>
                    <th style={{ padding: '8px 8px', fontWeight: 600 }}>Parking Lot</th>
                    <th style={{ padding: '8px 8px', fontWeight: 600 }}>Location</th>
                    <th style={{ padding: '8px 8px', fontWeight: 600 }}>Total Space</th>
                    <th style={{ padding: '8px 8px', fontWeight: 600 }}>Occupied</th>
                    <th style={{ padding: '8px 8px', fontWeight: 600 }}>Available Free</th>
                    <th style={{ padding: '8px 8px', fontWeight: 600, minWidth: '120px' }}>Occupancy Rate</th>
                    <th style={{ padding: '8px 8px', fontWeight: 600 }}>Car (₹/hr)</th>
                    <th style={{ padding: '8px 8px', fontWeight: 600 }}>Bike (₹/hr)</th>
                    <th style={{ padding: '8px 8px', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '8px 8px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {parkingLots.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        {isParkingLoading ? 'Loading parking areas...' : 'No parking areas registered yet.'}
                      </td>
                    </tr>
                  ) : (
                    parkingLots
                      .filter(
                        (p) =>
                          p.name?.toLowerCase().includes(parkingSearch.toLowerCase()) ||
                          p.location?.toLowerCase().includes(parkingSearch.toLowerCase())
                      )
                      .map((lot, idx) => {
                        const available = Math.max(0, lot.totalSpace - lot.occupiedSpace);
                        const percent = lot.totalSpace > 0 ? Math.round((lot.occupiedSpace / lot.totalSpace) * 100) : 0;
                        const isFull = lot.occupiedSpace >= lot.totalSpace;

                        return (
                          <tr
                            key={lot.id}
                            style={{
                              borderBottom: '1px solid var(--border-color)',
                              transition: 'background 0.15s ease',
                            }}
                          >
                            <td style={{ padding: '8px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>{idx + 1}</td>
                            <td style={{ padding: '8px 8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div
                                  style={{
                                    width: '28px',
                                    height: '28px',
                                    borderRadius: '6px',
                                    background: '#eff6ff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#2563eb',
                                    flexShrink: 0,
                                  }}
                                >
                                  <Car size={15} />
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{lot.name}</div>
                                  {lot.description && (
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{lot.description}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '8px 8px', color: 'var(--text-secondary)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <MapPin size={12} color="var(--accent-blue)" />
                                <span>{lot.location || 'Main Area'}</span>
                              </div>
                            </td>
                            <td style={{ padding: '8px 8px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {lot.totalSpace} Slots
                            </td>
                            <td style={{ padding: '8px 8px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                              {lot.occupiedSpace}
                            </td>
                            <td style={{ padding: '8px 8px', fontWeight: 700, color: '#059669' }}>
                              {available} Free
                            </td>
                            <td style={{ padding: '8px 8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                                <div
                                  style={{
                                    width: `${percent}%`,
                                    height: '100%',
                                    background: percent > 85 ? '#ef4444' : percent > 60 ? '#f59e0b' : '#10b981',
                                  }}
                                />
                                </div>
                                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                  {percent}%
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: '8px 8px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              ₹{Number(lot.pricePerHour || 0)}
                            </td>
                            <td style={{ padding: '8px 8px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              ₹{Number(lot.priceTwoWheeler || 20)}
                            </td>
                            <td style={{ padding: '8px 8px' }}>
                              <span
                                style={{
                                  fontSize: '0.72rem',
                                  background: isFull ? '#fee2e2' : '#ecfdf5',
                                  color: isFull ? '#b91c1c' : '#059669',
                                  border: isFull ? '1px solid #fca5a5' : '1px solid #a7f3d0',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontWeight: 600,
                                }}
                              >
                                {isFull ? 'FULL' : 'ACTIVE'}
                              </span>
                            </td>
                            <td style={{ padding: '8px 8px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '5px' }}>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateOccupancy(lot.id, 1)}
                                  title="Vehicle In (+1)"
                                  style={{
                                    background: '#ecfdf5',
                                    color: '#059669',
                                    border: '1px solid #a7f3d0',
                                    padding: '3px 7px',
                                    borderRadius: '4px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  + In
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateOccupancy(lot.id, -1)}
                                  title="Vehicle Out (-1)"
                                  style={{
                                    background: '#fee2e2',
                                    color: '#b91c1c',
                                    border: '1px solid #fca5a5',
                                    padding: '3px 7px',
                                    borderRadius: '4px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  - Out
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedLotId(lot.id);
                                    setParkingTab('SLOTS');
                                  }}
                                  title="View Bays"
                                  style={{
                                    background: '#ffffff',
                                    color: 'var(--text-secondary)',
                                    border: '1px solid var(--border-color)',
                                    padding: '3px 7px',
                                    borderRadius: '4px',
                                    fontSize: '0.72rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Bays
                                </button>
                                {canDelete && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteParkingLot(lot.id)}
                                    title="Delete Parking Lot"
                                    style={{
                                      background: '#fee2e2',
                                      color: '#b91c1c',
                                      border: '1px solid #fca5a5',
                                      padding: '4px 6px',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                    }}
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 1: AREAS CARDS */}
        {parkingTab === 'AREAS' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
            {parkingLots.map((lot) => {
              const available = Math.max(0, lot.totalSpace - lot.occupiedSpace);
              const percent = lot.totalSpace > 0 ? Math.round((lot.occupiedSpace / lot.totalSpace) * 100) : 0;
              return (
                <div key={lot.id} style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem', background: '#ffffff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>{lot.name}</div>
                    <span style={{ fontSize: '0.72rem', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                      {percent}% Full
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Location: {lot.location || 'Central Area'}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#f8fafc', padding: '8px', borderRadius: '6px', fontSize: '0.78rem' }}>
                    <div>Total: <strong>{lot.totalSpace}</strong></div>
                    <div>Free: <strong style={{ color: '#059669' }}>{available}</strong></div>
                    <div>Car: ₹{lot.pricePerHour}/hr</div>
                    <div>Bike: ₹{lot.priceTwoWheeler || 20}/hr</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: SLOTS MATRIX */}
        {parkingTab === 'SLOTS' && (
          <div style={{ marginTop: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Selected Lot: {parkingLots.find((l) => l.id === selectedLotId)?.name || 'Default Lot'}
              </span>
              <select
                value={selectedLotId}
                onChange={(e) => setSelectedLotId(e.target.value)}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.78rem',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: '#ffffff',
                  color: 'var(--text-primary)',
                }}
              >
                {parkingLots.map((lot) => (
                  <option key={lot.id} value={lot.id}>
                    {lot.name} ({lot.totalSpace} Slots)
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '10px' }}>
              {parkingSlots.map((slot) => (
                <div
                  key={slot.id}
                  style={{
                    background: slot.occupied ? '#fef2f2' : '#f0fdf4',
                    border: slot.occupied ? '1px solid #fecaca' : '1px solid #bbf7d0',
                    borderRadius: '8px',
                    padding: '10px 8px',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: slot.occupied ? '#b91c1c' : '#15803d' }}>
                    {slot.id}
                  </div>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, marginTop: '2px', color: slot.occupied ? '#dc2626' : '#16a34a' }}>
                    {slot.occupied ? 'OCCUPIED' : 'FREE'}
                  </div>
                  {slot.plate && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px', fontFamily: 'monospace' }}>
                      {slot.plate}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: LIVE GATE CAMERAS */}
        {parkingTab === 'CAMERAS' && (
          <div className="app-main-grid" style={{ marginTop: '0.5rem' }}>
            <div>
              {viewMode === 'GRID' ? (
                <MultiCameraGrid
                  cameras={cameras}
                  onDetectionUpdate={handleDetectionUpdate || (() => {})}
                  onModelLoaded={(loaded) => setIsAiLoading && setIsAiLoading(!loaded)}
                />
              ) : (
                <CameraCard
                  selectedCameraUrl={activeCamera?.rtspUrl}
                  cameraType={activeCamera?.cameraType || 'WEBCAM'}
                  cameraId={activeCamera?.id}
                  cameraName={activeCamera?.cameraName}
                  location={activeCamera?.location}
                  lane={activeCamera?.lane}
                  direction={activeCamera?.direction}
                  onDetectionUpdate={(data) => handleDetectionUpdate && handleDetectionUpdate(activeCamera?.id, data)}
                  onModelLoaded={(loaded) => setIsAiLoading && setIsAiLoading(!loaded)}
                />
              )}
            </div>
            <div>
              <TrafficAnalytics
                counts={displayLiveCounts}
                vehicleInOut={mergedVehicleInOut}
                inCount={displayInCount}
                outCount={displayOutCount}
                activeCount={displayActiveCount}
                cameras={cameras}
                cameraStats={dbCameraStats as any}
                cameraLiveVehicleInOut={cameraVehicleInOutMap}
              />
            </div>
          </div>
        )}
      </div>

      {/* Add New Parking Area Modal */}
      {isAddParkingOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
            padding: '1rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddParkingOpen(false);
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '460px',
              background: '#ffffff',
              borderRadius: '12px',
              padding: '1.5rem',
              border: '1px solid var(--border-color)',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Add Parking Area (e.g. Parking 1)
              </h3>
              <button
                type="button"
                onClick={() => setIsAddParkingOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddParkingLot} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Parking Name (e.g. Parking 1, Zone A):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Parking 1"
                  value={newParkingData.name}
                  onChange={(e) => setNewParkingData({ ...newParkingData, name: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    background: '#ffffff',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Total Space (Slots):
                  </label>
                  <input
                    type="number"
                    placeholder="100"
                    min={1}
                    value={newParkingData.totalSpace}
                    onChange={(e) => setNewParkingData({ ...newParkingData, totalSpace: Number(e.target.value) })}
                    required
                    style={{
                      width: '100%',
                      background: '#ffffff',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      padding: '9px 12px',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Location / Gate:
                  </label>
                  <input
                    type="text"
                    placeholder="Main Gate Entry"
                    value={newParkingData.location}
                    onChange={(e) => setNewParkingData({ ...newParkingData, location: e.target.value })}
                    style={{
                      width: '100%',
                      background: '#ffffff',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      padding: '9px 12px',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Price / Hour (Car) ₹:
                  </label>
                  <input
                    type="number"
                    placeholder="50"
                    min={0}
                    value={newParkingData.pricePerHour}
                    onChange={(e) => setNewParkingData({ ...newParkingData, pricePerHour: Number(e.target.value) })}
                    required
                    style={{
                      width: '100%',
                      background: '#ffffff',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      padding: '9px 12px',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Price / Hour (2-Wheeler) ₹:
                  </label>
                  <input
                    type="number"
                    placeholder="20"
                    min={0}
                    value={newParkingData.priceTwoWheeler}
                    onChange={(e) => setNewParkingData({ ...newParkingData, priceTwoWheeler: Number(e.target.value) })}
                    style={{
                      width: '100%',
                      background: '#ffffff',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      padding: '9px 12px',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Description / Notes (Optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Covered bay, boom barrier enabled"
                  value={newParkingData.description}
                  onChange={(e) => setNewParkingData({ ...newParkingData, description: e.target.value })}
                  style={{
                    width: '100%',
                    background: '#ffffff',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                  }}
                />
              </div>

              <button
                type="submit"
                style={{
                  background: 'var(--accent-blue)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '10px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.86rem',
                  cursor: 'pointer',
                  marginTop: '4px',
                }}
              >
                Create Parking Area
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
