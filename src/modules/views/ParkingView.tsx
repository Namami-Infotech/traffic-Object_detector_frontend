import React, { useState, useEffect, useMemo } from 'react';
import { Car, Plus, Trash2, Search, RefreshCw, X, MapPin, Image as ImageIcon, Upload, Eye, Loader2 } from 'lucide-react';
import { parkingApi } from '../../services/api';
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
}) => {
  const [parkingTab, setParkingTab] = useState<'TABLE' | 'AREAS' | 'SLOTS'>('TABLE');
  const [parkingLots, setParkingLots] = useState<any[]>([]);
  const [parkingSearch, setParkingSearch] = useState('');
  const [selectedLotId, setSelectedLotId] = useState<string>('');
  const [isParkingLoading, setIsParkingLoading] = useState(false);
  const [isAddParkingOpen, setIsAddParkingOpen] = useState(false);
  const [isUploadingBanners, setIsUploadingBanners] = useState(false);
  const [bannerUploadError, setBannerUploadError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [manageBannersLot, setManageBannersLot] = useState<any | null>(null);
  const [newParkingData, setNewParkingData] = useState({
    name: '',
    location: '',
    totalSpace: 100,
    pricePerHour: 50,
    priceTwoWheeler: 20,
    description: '',
    banners: [] as string[],
  });

  const selectedLot = parkingLots.find((l) => l.id === selectedLotId) || parkingLots[0];

  const dynamicSlots = useMemo(() => {
    if (!selectedLot) return [];
    const total = Number(selectedLot.totalSpace || 0);
    const occupied = Number(selectedLot.occupiedSpace || 0);

    const displayCount = Math.min(Math.max(total, 0), 120);
    return Array.from({ length: displayCount }, (_, i) => {
      const bayLetter = String.fromCharCode(65 + Math.floor(i / 10)); // A, B, C...
      const bayNumber = (i % 10) + 1;
      const slotId = `${bayLetter}-${String(bayNumber).padStart(2, '0')}`;
      return {
        id: slotId,
        occupied: i < occupied,
      };
    });
  }, [selectedLot]);

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

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetLot?: any) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingBanners(true);
    setBannerUploadError(null);

    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append('images', file);
    });

    try {
      const res = await parkingApi.uploadBanners(formData);
      if (res.success && res.data?.urls) {
        const newUrls = res.data.urls;
        if (targetLot) {
          const currentBanners = Array.isArray(targetLot.banners) ? targetLot.banners : [];
          const updatedBanners = [...currentBanners, ...newUrls];
          const updatedLot = { ...targetLot, banners: updatedBanners };
          setManageBannersLot(updatedLot);
          await parkingApi.update(targetLot.id, { banners: updatedBanners });
          fetchParkingLots();
        } else {
          setNewParkingData((prev) => ({
            ...prev,
            banners: [...(prev.banners || []), ...newUrls],
          }));
        }
      } else {
        setBannerUploadError(res.message || 'Failed to upload images');
      }
    } catch (err: any) {
      setBannerUploadError(err.message || 'Failed to upload images');
    } finally {
      setIsUploadingBanners(false);
      e.target.value = '';
    }
  };

  const handleRemoveBanner = async (idxToRemove: number, targetLot?: any) => {
    if (targetLot) {
      const currentBanners = Array.isArray(targetLot.banners) ? targetLot.banners : [];
      const updatedBanners = currentBanners.filter((_: any, idx: number) => idx !== idxToRemove);
      const updatedLot = { ...targetLot, banners: updatedBanners };
      setManageBannersLot(updatedLot);
      try {
        await parkingApi.update(targetLot.id, { banners: updatedBanners });
        fetchParkingLots();
      } catch (err: any) {
        console.error('Failed to remove banner from lot:', err);
      }
    } else {
      setNewParkingData((prev) => ({
        ...prev,
        banners: (prev.banners || []).filter((_, idx) => idx !== idxToRemove),
      }));
    }
  };

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
          banners: [],
        });
        setBannerUploadError(null);
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
              {(['TABLE', 'AREAS', 'SLOTS'] as const).map((tab) => {
                const isActive = parkingTab === tab;
                const label = tab === 'TABLE' ? 'Lots Table' : tab === 'AREAS' ? 'Cards' : 'Slots Matrix';
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
                    <th style={{ padding: '8px 8px', fontWeight: 600 }}>Car (₹/hr)</th>
                    <th style={{ padding: '8px 8px', fontWeight: 600 }}>Banners</th>
                    <th style={{ padding: '8px 8px', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '8px 8px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {parkingLots.length === 0 ? (
                    <tr>
                      <td colSpan={12} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
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
                        const isFull = lot.occupiedSpace >= lot.totalSpace;
                        const bannersList = Array.isArray(lot.banners) ? lot.banners : [];

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

                            <td style={{ padding: '8px 8px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              ₹{Number(lot.pricePerHour || 0)}
                            </td>
                            <td style={{ padding: '8px 8px' }}>
                              {bannersList.length > 0 ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <div
                                    onClick={() => setPreviewImage(bannersList[0])}
                                    style={{
                                      width: '38px',
                                      height: '24px',
                                      borderRadius: '4px',
                                      overflow: 'hidden',
                                      cursor: 'pointer',
                                      border: '1px solid var(--border-color)',
                                      background: '#000',
                                      flexShrink: 0,
                                    }}
                                    title="Click to preview banner image"
                                  >
                                    <img
                                      src={bannersList[0]}
                                      alt="Banner"
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setManageBannersLot(lot)}
                                    title="Manage Banner Images"
                                    style={{
                                      background: '#eff6ff',
                                      color: '#1d4ed8',
                                      border: '1px solid #bfdbfe',
                                      padding: '2px 7px',
                                      borderRadius: '12px',
                                      fontSize: '0.72rem',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}
                                  >
                                    <ImageIcon size={11} />
                                    {bannersList.length}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setManageBannersLot(lot)}
                                  title="Upload banner images for this lot"
                                  style={{
                                    background: '#f8fafc',
                                    color: 'var(--text-secondary)',
                                    border: '1px dashed var(--border-color)',
                                    padding: '3px 8px',
                                    borderRadius: '6px',
                                    fontSize: '0.72rem',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                  }}
                                >
                                  <Upload size={11} color="var(--accent-blue)" />
                                  Add Banners
                                </button>
                              )}
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
                                  onClick={() => setManageBannersLot(lot)}
                                  title="Upload / Manage Banners"
                                  style={{
                                    background: '#f0f9ff',
                                    color: '#0284c7',
                                    border: '1px solid #bae6fd',
                                    padding: '4px 7px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontSize: '0.72rem',
                                    fontWeight: 600,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                  }}
                                >
                                  <ImageIcon size={12} />
                                  Banners
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
              const bannersList = Array.isArray(lot.banners) ? lot.banners : [];

              return (
                <div key={lot.id} style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem', background: '#ffffff', display: 'flex', flexDirection: 'column' }}>
                  {/* Banner Image Preview / Uploader */}
                  {bannersList.length > 0 ? (
                    <div
                      style={{
                        position: 'relative',
                        height: '130px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        marginBottom: '10px',
                        cursor: 'pointer',
                        background: '#0f172a',
                      }}
                      onClick={() => setPreviewImage(bannersList[0])}
                      title="Click to view full banner"
                    >
                      <img
                        src={bannersList[0]}
                        alt={lot.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '6px',
                          right: '6px',
                          background: 'rgba(0,0,0,0.75)',
                          color: '#ffffff',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <ImageIcon size={11} />
                        {bannersList.length} {bannersList.length > 1 ? 'Banners' : 'Banner'}
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => setManageBannersLot(lot)}
                      style={{
                        height: '75px',
                        borderRadius: '8px',
                        border: '1px dashed var(--border-color)',
                        background: '#f8fafc',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        marginBottom: '10px',
                        cursor: 'pointer',
                        color: 'var(--text-muted)',
                        fontSize: '0.74rem',
                      }}
                      title="Upload banner images"
                    >
                      <Upload size={16} color="var(--accent-blue)" />
                      <span>Upload Banner Images</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>{lot.name}</div>
                    <span style={{ fontSize: '0.72rem', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                      {percent}% Full
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Location: {lot.location || 'Central Area'}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#f8fafc', padding: '8px', borderRadius: '6px', fontSize: '0.78rem', marginBottom: '10px' }}>
                    <div>Total: <strong>{lot.totalSpace}</strong></div>
                    <div>Free: <strong style={{ color: '#059669' }}>{available}</strong></div>
                    <div>Car: ₹{lot.pricePerHour}/hr</div>
                    <div>Bike: ₹{lot.priceTwoWheeler || 20}/hr</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setManageBannersLot(lot)}
                    style={{
                      marginTop: 'auto',
                      background: '#f0f9ff',
                      color: '#0284c7',
                      border: '1px solid #bae6fd',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                    }}
                  >
                    <ImageIcon size={13} />
                    Manage Banners ({bannersList.length})
                  </button>
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

            {/* Real-time Lot Slot Summary */}
            {selectedLot && (
              <div style={{ display: 'flex', gap: '12px', marginBottom: '1rem', flexWrap: 'wrap', fontSize: '0.8rem', background: '#f8fafc', padding: '6px 12px', borderRadius: '6px' }}>
                <div>Total Slots: <strong>{selectedLot.totalSpace || 0}</strong></div>
                <div style={{ color: '#b91c1c' }}>Occupied: <strong>{selectedLot.occupiedSpace || 0}</strong></div>
                <div style={{ color: '#15803d' }}>Available: <strong>{Math.max(0, (selectedLot.totalSpace || 0) - (selectedLot.occupiedSpace || 0))}</strong></div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '10px' }}>
              {dynamicSlots.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No parking slots configured for this area.
                </div>
              ) : (
                dynamicSlots.map((slot) => (
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
                  </div>
                ))
              )}
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
                Add Parking Area
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
                  Parking Name:
                </label>
                <input
                  type="text"
                  placeholder="Parking Name"
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

              {/* Banner Images Multiple Upload Field */}
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Banner Images (Multiple Upload):
                </label>
                <div
                  style={{
                    border: '1px dashed var(--border-color)',
                    borderRadius: '8px',
                    padding: '12px',
                    background: '#f8fafc',
                    textAlign: 'center',
                  }}
                >
                  <input
                    type="file"
                    id="parking-banner-input-new"
                    multiple
                    accept="image/*"
                    onChange={(e) => handleBannerUpload(e)}
                    disabled={isUploadingBanners}
                    style={{ display: 'none' }}
                  />
                  <label
                    htmlFor="parking-banner-input-new"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      background: '#ffffff',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      cursor: isUploadingBanners ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isUploadingBanners ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Uploading to Server...
                      </>
                    ) : (
                      <>
                        <Upload size={16} color="var(--accent-blue)" />
                        Select Banner Images (Multiple)
                      </>
                    )}
                  </label>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                    Images are uploaded to backend <code>uploads/parking</code> with LIVE_SERVER_URL.
                  </div>

                  {bannerUploadError && (
                    <div style={{ color: '#dc2626', fontSize: '0.74rem', marginTop: '6px' }}>
                      {bannerUploadError}
                    </div>
                  )}

                  {/* Previews of uploaded banners */}
                  {newParkingData.banners.length > 0 && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                        gap: '8px',
                        marginTop: '12px',
                      }}
                    >
                      {newParkingData.banners.map((url, idx) => (
                        <div
                          key={idx}
                          style={{
                            position: 'relative',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            border: '1px solid var(--border-color)',
                            aspectRatio: '16/9',
                            background: '#0f172a',
                          }}
                        >
                          <img
                            src={url}
                            alt={`Banner ${idx + 1}`}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              cursor: 'pointer',
                            }}
                            onClick={() => setPreviewImage(url)}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveBanner(idx)}
                            title="Remove Banner"
                            style={{
                              position: 'absolute',
                              top: '2px',
                              right: '2px',
                              background: 'rgba(0, 0, 0, 0.7)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '50%',
                              width: '20px',
                              height: '20px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
                Submit
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Manage Existing Parking Lot Banners Modal */}
      {manageBannersLot && (
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
            if (e.target === e.currentTarget) setManageBannersLot(null);
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '520px',
              background: '#ffffff',
              borderRadius: '12px',
              padding: '1.5rem',
              border: '1px solid var(--border-color)',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Manage Banners: {manageBannersLot.name}
                </h3>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Upload multiple banner images or remove existing banners.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setManageBannersLot(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Upload more banners section */}
            <div
              style={{
                border: '1px dashed var(--border-color)',
                borderRadius: '8px',
                padding: '14px',
                background: '#f8fafc',
                textAlign: 'center',
                marginBottom: '1rem',
              }}
            >
              <input
                type="file"
                id="manage-banner-input"
                multiple
                accept="image/*"
                onChange={(e) => handleBannerUpload(e, manageBannersLot)}
                disabled={isUploadingBanners}
                style={{ display: 'none' }}
              />
              <label
                htmlFor="manage-banner-input"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  background: '#ffffff',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  cursor: isUploadingBanners ? 'not-allowed' : 'pointer',
                }}
              >
                {isUploadingBanners ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Uploading to Server...
                  </>
                ) : (
                  <>
                    <Upload size={16} color="var(--accent-blue)" />
                    Upload More Banners (Multiple)
                  </>
                )}
              </label>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                Images are uploaded to <code>uploads/parking</code> with LIVE_SERVER_URL.
              </div>
              {bannerUploadError && (
                <div style={{ color: '#dc2626', fontSize: '0.74rem', marginTop: '6px' }}>
                  {bannerUploadError}
                </div>
              )}
            </div>

            {/* List of current banners */}
            <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              Current Banners ({Array.isArray(manageBannersLot.banners) ? manageBannersLot.banners.length : 0}):
            </div>
            {(!manageBannersLot.banners || manageBannersLot.banners.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.8rem', background: '#f8fafc', borderRadius: '6px' }}>
                No banner images uploaded yet for this parking lot.
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                  gap: '10px',
                  maxHeight: '260px',
                  overflowY: 'auto',
                  padding: '4px',
                }}
              >
                {manageBannersLot.banners.map((url: string, idx: number) => (
                  <div
                    key={idx}
                    style={{
                      position: 'relative',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '1px solid var(--border-color)',
                      aspectRatio: '16/9',
                      background: '#0f172a',
                    }}
                  >
                    <img
                      src={url}
                      alt={`Banner ${idx + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        cursor: 'pointer',
                      }}
                      onClick={() => setPreviewImage(url)}
                      title="Click to view full preview"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveBanner(idx, manageBannersLot)}
                      title="Delete this banner"
                      style={{
                        position: 'absolute',
                        top: '3px',
                        right: '3px',
                        background: 'rgba(220, 38, 38, 0.85)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '50%',
                        width: '22px',
                        height: '22px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setManageBannersLot(null)}
                style={{
                  background: 'var(--accent-blue)',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Preview Modal for Banner Image */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '92vw',
              maxHeight: '92vh',
              background: '#0f172a',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
            }}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'rgba(0,0,0,0.7)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 10,
              }}
            >
              <X size={18} />
            </button>
            <img
              src={previewImage}
              alt="Banner Full Preview"
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                display: 'block',
                objectFit: 'contain',
              }}
            />
            <div
              style={{
                padding: '10px 14px',
                color: '#94a3b8',
                fontSize: '0.74rem',
                wordBreak: 'break-all',
                background: '#1e293b',
              }}
            >
              {previewImage}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
