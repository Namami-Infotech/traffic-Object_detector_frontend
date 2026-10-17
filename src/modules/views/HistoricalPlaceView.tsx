import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Landmark,
  Plus,
  Trash2,
  Edit3,
  Search,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  Images,
  MapPin,
  Eye,
  ChevronLeft,
  ChevronRight,
  Map as MapIcon,
  Upload,
  MoreVertical,
} from 'lucide-react';
import { historicalPlaceApi } from '../../services/api';
import type { HistoricalPlaceItem, HistoricalPlaceInput } from '../../services/api';
import { LocationMapPicker } from './LocationMapPicker';
import { LocationViewModal } from './LocationViewModal';

export interface HistoricalPlaceViewProps {
  canWrite?: boolean;
  canDelete?: boolean;
}

const DEFAULT_FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=600&q=80';

export const HistoricalPlaceView: React.FC<HistoricalPlaceViewProps> = ({
  canWrite = true,
  canDelete = true,
}) => {
  const [places, setPlaces] = useState<HistoricalPlaceItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [isLoading, setIsLoading] = useState(false);

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<HistoricalPlaceInput>({
    name: '',
    about: '',
    photos: [],
    location: '',
    latitude: null,
    longitude: null,
    status: 'ACTIVE',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(true);

  // File Upload State for Image Array
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadFiles, setUploadFiles] = useState<{ file: File; preview: string; name: string }[]>([]);

  // Gallery Lightbox Modal state
  const [galleryPlace, setGalleryPlace] = useState<HistoricalPlaceItem | null>(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  // About Read-More Modal
  const [aboutPlace, setAboutPlace] = useState<HistoricalPlaceItem | null>(null);

  // View on Map Modal
  const [viewMapPlace, setViewMapPlace] = useState<HistoricalPlaceItem | null>(null);

  // 3-dots Action Menu dropdown state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Close action dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && !target.closest('[data-action-menu="true"]')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Alert message
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const fetchPlaces = async () => {
    setIsLoading(true);
    try {
      const res = await historicalPlaceApi.getAll();
      if (res.success && res.data) {
        setPlaces(res.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch historical places:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaces();
  }, []);

  useEffect(() => {
    if (actionSuccessMsg) {
      const timer = setTimeout(() => setActionSuccessMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [actionSuccessMsg]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      uploadFiles.forEach((item) => URL.revokeObjectURL(item.preview));
    };
  }, [uploadFiles]);

  // Statistics
  const stats = useMemo(() => {
    const total = places.length;
    const active = places.filter((p) => p.status === 'ACTIVE').length;
    const totalPhotos = places.reduce((sum, p) => sum + (Array.isArray(p.photos) ? p.photos.length : 0), 0);
    return { total, active, totalPhotos };
  }, [places]);

  // Filtered Places
  const filteredPlaces = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return places.filter((p) => {
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.about.toLowerCase().includes(q) ||
        (p.location && p.location.toLowerCase().includes(q));

      const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [places, searchQuery, statusFilter]);

  // Modal Handlers
  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      name: '',
      about: '',
      photos: [],
      location: 'Agra, Uttar Pradesh',
      latitude: 27.1751,
      longitude: 78.0421,
      status: 'ACTIVE',
    });
    setUploadFiles([]);
    setFormError(null);
    setShowMapPicker(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (place: HistoricalPlaceItem) => {
    setEditingId(place.id);
    setFormData({
      name: place.name,
      about: place.about,
      photos: Array.isArray(place.photos) ? [...place.photos] : [],
      location: place.location || '',
      latitude: place.latitude || null,
      longitude: place.longitude || null,
      status: place.status,
    });
    setUploadFiles([]);
    setFormError(null);
    setShowMapPicker(true);
    setIsModalOpen(true);
  };

  const handleFilesAdded = (files: File[]) => {
    const validImageFiles = files.filter((f) => f.type.startsWith('image/'));
    if (validImageFiles.length === 0) return;
    const newItems = validImageFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
    }));
    setUploadFiles((prev) => [...prev, ...newItems]);
  };

  const handleRemoveUploadFile = (index: number) => {
    setUploadFiles((prev) => {
      const item = prev[index];
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleRemovePhoto = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  const handleMapLocationChange = (loc: string, lat: number, lng: number) => {
    setFormData((prev) => ({
      ...prev,
      location: loc,
      latitude: lat,
      longitude: lng,
    }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const name = formData.name.trim();
    if (!name) {
      setFormError('Place name is required.');
      return;
    }

    const about = formData.about.trim();
    if (!about) {
      setFormError('About description is required.');
      return;
    }

    const totalPhotosCount = formData.photos.length + uploadFiles.length;
    if (totalPhotosCount === 0) {
      setFormError('Please add or upload at least one photo in the photo array.');
      return;
    }

    setIsSaving(true);
    try {
      const filesToUpload = uploadFiles.map((f) => f.file);

      if (editingId) {
        const res = await historicalPlaceApi.update(editingId, {
          name,
          about,
          photos: formData.photos,
          files: filesToUpload.length > 0 ? filesToUpload : undefined,
          location: formData.location?.trim() || null,
          latitude: formData.latitude ?? null,
          longitude: formData.longitude ?? null,
          status: formData.status,
        });

        if (res.success) {
          uploadFiles.forEach((item) => URL.revokeObjectURL(item.preview));
          setUploadFiles([]);
          setIsModalOpen(false);
          setActionSuccessMsg(`Historical place '${name}' updated successfully!`);
          fetchPlaces();
        } else {
          setFormError(res.message || 'Failed to update place');
        }
      } else {
        const res = await historicalPlaceApi.create({
          name,
          about,
          photos: formData.photos,
          files: filesToUpload.length > 0 ? filesToUpload : undefined,
          location: formData.location?.trim() || null,
          latitude: formData.latitude ?? null,
          longitude: formData.longitude ?? null,
          status: formData.status || 'ACTIVE',
        });

        if (res.success) {
          uploadFiles.forEach((item) => URL.revokeObjectURL(item.preview));
          setUploadFiles([]);
          setIsModalOpen(false);
          setActionSuccessMsg(`Historical place '${name}' created successfully with ${totalPhotosCount} photos!`);
          fetchPlaces();
        } else {
          setFormError(res.message || 'Failed to create place');
        }
      }
    } catch (err: any) {
      setFormError(err.message || 'Error occurred while saving place');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete historical place "${name}"?`)) {
      return;
    }

    try {
      const res = await historicalPlaceApi.delete(id);
      if (res.success) {
        setActionSuccessMsg(`Historical place "${name}" deleted.`);
        fetchPlaces();
      } else {
        alert(res.message || 'Failed to delete place');
      }
    } catch (err: any) {
      alert(err.message || 'Error deleting historical place');
    }
  };

  const handleOpenGallery = (place: HistoricalPlaceItem, startIdx: number = 0) => {
    setGalleryPlace(place);
    setActivePhotoIdx(startIdx);
  };

  return (
    <div style={{ padding: '0.4rem 0.5rem' }}>
      {/* Action Success Alert Notification */}
      {actionSuccessMsg && (
        <div
          style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            padding: '10px 14px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={16} color="#059669" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button
            onClick={() => setActionSuccessMsg(null)}
            style={{ background: 'none', border: 'none', color: '#065f46', cursor: 'pointer', padding: 0 }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Top Banner / Summary Cards in Exact Old Glass-Panel Theme */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
          marginBottom: '1rem',
        }}
      >
        <div
          className="glass-panel"
          style={{
            background: '#ffffff',
            border: '1px solid var(--border-color)',
            padding: '0.9rem 1rem',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Total Historical Places</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
              {stats.total}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Heritage Locations</div>
          </div>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#2563eb',
            }}
          >
            <Landmark size={20} />
          </div>
        </div>

        <div
          className="glass-panel"
          style={{
            background: '#ffffff',
            border: '1px solid var(--border-color)',
            padding: '0.9rem 1rem',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Active Places</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
              {stats.active}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Publicly Accessible</div>
          </div>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: '#ecfdf5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
            }}
          >
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div
          className="glass-panel"
          style={{
            background: '#ffffff',
            border: '1px solid var(--border-color)',
            padding: '0.9rem 1rem',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Photos in Array</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#d97706', marginTop: '4px' }}>
              {stats.totalPhotos}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Gallery Images Stored</div>
          </div>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: '#fffbeb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#d97706',
            }}
          >
            <Images size={20} />
          </div>
        </div>
      </div>

      {/* Main Glass-Panel Container */}
      <div className="glass-panel" style={{ padding: '1rem', overflow: 'hidden' }}>
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
            <Landmark size={20} color="var(--accent-blue)" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Historical Places Archive
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
              {filteredPlaces.length} Places
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={fetchPlaces}
              disabled={isLoading}
              title="Refresh Places"
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
              <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </button>

            {canWrite && (
              <button
                type="button"
                onClick={handleOpenAdd}
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
                Add Historical Place
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            flexWrap: 'wrap',
            marginBottom: '1rem',
            background: '#f8fafc',
            padding: '0.6rem 0.8rem',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: '1', minWidth: '220px' }}>
            <Search size={15} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search by name, about, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '0.82rem',
                width: '100%',
                color: 'var(--text-primary)',
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                style={{
                  background: statusFilter === st ? '#ffffff' : 'transparent',
                  color: statusFilter === st ? 'var(--accent-blue)' : 'var(--text-secondary)',
                  border: statusFilter === st ? '1px solid var(--border-color)' : 'none',
                  padding: '3px 8px',
                  borderRadius: '5px',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Clean, Non-Overlapping Table Content */}
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%', minHeight: '340px', paddingBottom: '60px' }}>
          <table
            style={{
              width: '100%',
              minWidth: '1050px',
              borderCollapse: 'collapse',
              textAlign: 'left',
              fontSize: '0.82rem',
            }}
          >
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '10px 10px', fontWeight: 600, width: '45px' }}>#</th>
                <th style={{ padding: '10px 10px', fontWeight: 600, width: '200px' }}>Place Name</th>
                <th style={{ padding: '10px 10px', fontWeight: 600, width: '170px' }}>Photos (Array)</th>
                <th style={{ padding: '10px 10px', fontWeight: 600, width: '360px' }}>About Description</th>
                <th style={{ padding: '10px 10px', fontWeight: 600, width: '180px' }}>Location & Map</th>
                <th style={{ padding: '10px 10px', fontWeight: 600, width: '90px' }}>Status</th>
                <th style={{ padding: '10px 10px', fontWeight: 600, textAlign: 'center', width: '80px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlaces.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                    <Landmark size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                    <div>{isLoading ? 'Loading historical places...' : 'No historical places found.'}</div>
                  </td>
                </tr>
              ) : (
                filteredPlaces.map((place, idx) => {
                  const photoList = Array.isArray(place.photos) ? place.photos : [];
                  return (
                    <tr
                      key={place.id}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      {/* 1. Index */}
                      <td style={{ padding: '12px 10px', fontWeight: 600, color: 'var(--text-secondary)', verticalAlign: 'middle' }}>
                        {idx + 1}
                      </td>

                      {/* 2. Place Name */}
                      <td style={{ padding: '12px 10px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.86rem' }}>
                          {place.name}
                        </div>
                        {place.location && (
                          <div
                            style={{
                              fontSize: '0.72rem',
                              color: 'var(--text-muted)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              marginTop: '3px',
                            }}
                          >
                            <MapPin size={11} color="var(--accent-blue)" />
                            <span>{place.location}</span>
                          </div>
                        )}
                      </td>

                      {/* 3. Photo Array Thumbnails */}
                      <td style={{ padding: '12px 10px', verticalAlign: 'middle' }}>
                        {photoList.length > 0 ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            {photoList.slice(0, 3).map((url, pIdx) => (
                              <img
                                key={pIdx}
                                src={url}
                                alt={`${place.name} ${pIdx + 1}`}
                                onClick={() => handleOpenGallery(place, pIdx)}
                                onError={(e) => {
                                  const target = e.currentTarget as HTMLImageElement;
                                  if (!target.dataset.fallbackTried) {
                                    target.dataset.fallbackTried = 'true';
                                    target.src = DEFAULT_FALLBACK_IMAGE;
                                  }
                                }}
                                title="Click to view full photo gallery"
                                style={{
                                  width: '34px',
                                  height: '34px',
                                  borderRadius: '6px',
                                  objectFit: 'cover',
                                  border: '1px solid var(--border-color)',
                                  cursor: 'pointer',
                                }}
                              />
                            ))}
                            {photoList.length > 3 && (
                              <span
                                onClick={() => handleOpenGallery(place, 3)}
                                style={{
                                  padding: '3px 6px',
                                  borderRadius: '4px',
                                  background: '#eff6ff',
                                  color: '#1d4ed8',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                +{photoList.length - 3}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenGallery(place, 0)}
                              title="Open Full Photo Gallery"
                              style={{
                                padding: '3px 7px',
                                background: '#f8fafc',
                                border: '1px solid var(--border-color)',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                color: 'var(--text-secondary)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                              }}
                            >
                              <Images size={12} />
                              {photoList.length}
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No photos</span>
                        )}
                      </td>

                      {/* 4. About Clamped Snippet (Guaranteed ZERO overlap) */}
                      <td style={{ padding: '12px 10px', verticalAlign: 'middle', maxWidth: '360px' }}>
                        <div
                          style={{
                            maxWidth: '340px',
                            color: 'var(--text-secondary)',
                            fontSize: '0.78rem',
                            lineHeight: '1.4',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {place.about}
                        </div>
                        {place.about.length > 70 && (
                          <button
                            type="button"
                            onClick={() => setAboutPlace(place)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--accent-blue)',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              padding: '2px 0 0 0',
                              display: 'inline-block',
                            }}
                          >
                            Read Full History
                          </button>
                        )}
                      </td>

                      {/* 5. Location & Map Button */}
                      <td style={{ padding: '12px 10px', verticalAlign: 'middle' }}>
                        <div style={{ color: 'var(--text-primary)', fontSize: '0.78rem', fontWeight: 600 }}>
                          {place.location || '—'}
                        </div>
                        <button
                          type="button"
                          onClick={() => setViewMapPlace(place)}
                          style={{
                            marginTop: '4px',
                            padding: '3px 8px',
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            borderRadius: '5px',
                            color: '#1d4ed8',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <MapIcon size={11} />
                          View on Map
                        </button>
                      </td>

                      {/* 6. Status */}
                      <td style={{ padding: '12px 10px', verticalAlign: 'middle' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            background: place.status === 'ACTIVE' ? '#ecfdf5' : '#f1f5f9',
                            color: place.status === 'ACTIVE' ? '#059669' : '#64748b',
                            border: place.status === 'ACTIVE' ? '1px solid #a7f3d0' : '1px solid #e2e8f0',
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontWeight: 600,
                          }}
                        >
                          {place.status}
                        </span>
                      </td>

                      {/* 7. Action 3-Dots Menu */}
                      <td
                        style={{
                          padding: '12px 10px',
                          textAlign: 'center',
                          verticalAlign: 'middle',
                          position: 'relative',
                        }}
                      >
                        <div style={{ display: 'inline-block', position: 'relative' }}>
                          <button
                            type="button"
                            data-action-menu="true"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId((prev) => (prev === place.id ? null : place.id));
                            }}
                            title="Actions Menu"
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '6px',
                              background: openMenuId === place.id ? '#eff6ff' : '#ffffff',
                              border: `1px solid ${openMenuId === place.id ? 'var(--accent-blue)' : 'var(--border-color)'}`,
                              color: openMenuId === place.id ? 'var(--accent-blue)' : 'var(--text-secondary)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s ease',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                            }}
                            onMouseEnter={(e) => {
                              if (openMenuId !== place.id) {
                                e.currentTarget.style.background = '#f8fafc';
                                e.currentTarget.style.color = 'var(--text-primary)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (openMenuId !== place.id) {
                                e.currentTarget.style.background = '#ffffff';
                                e.currentTarget.style.color = 'var(--text-secondary)';
                              }
                            }}
                          >
                            <MoreVertical size={16} />
                          </button>

                          {/* Dropdown Menu Popup */}
                          {openMenuId === place.id && (
                            <div
                              data-action-menu="true"
                              style={{
                                position: 'absolute',
                                right: 0,
                                top:
                                  idx >= filteredPlaces.length - 2 && filteredPlaces.length > 2
                                    ? 'auto'
                                    : 'calc(100% + 4px)',
                                bottom:
                                  idx >= filteredPlaces.length - 2 && filteredPlaces.length > 2
                                    ? 'calc(100% + 4px)'
                                    : 'auto',
                                zIndex: 100,
                                minWidth: '175px',
                                background: '#ffffff',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px',
                                boxShadow:
                                  '0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08)',
                                padding: '5px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px',
                                textAlign: 'left',
                              }}
                            >
                              {/* Read History Details */}
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuId(null);
                                  setAboutPlace(place);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  width: '100%',
                                  padding: '8px 10px',
                                  fontSize: '0.78rem',
                                  fontWeight: 500,
                                  color: 'var(--text-primary)',
                                  background: 'transparent',
                                  border: 'none',
                                  borderRadius: '5px',
                                  cursor: 'pointer',
                                  textAlign: 'left',
                                }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                              >
                                <Eye size={14} color="#6366f1" />
                                <span>Read History</span>
                              </button>

                              {canWrite && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    handleOpenEdit(place);
                                  }}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    width: '100%',
                                    padding: '8px 10px',
                                    fontSize: '0.78rem',
                                    fontWeight: 500,
                                    color: 'var(--text-primary)',
                                    background: 'transparent',
                                    border: 'none',
                                    borderRadius: '5px',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f1f5f9')}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                >
                                  <Edit3 size={14} color="var(--accent-blue)" />
                                  <span>Edit Place</span>
                                </button>
                              )}

                              {canDelete && (
                                <>
                                  <div
                                    style={{
                                      height: '1px',
                                      background: 'var(--border-color)',
                                      margin: '3px 0',
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      handleDelete(place.id, place.name);
                                    }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      width: '100%',
                                      padding: '8px 10px',
                                      fontSize: '0.78rem',
                                      fontWeight: 500,
                                      color: '#dc2626',
                                      background: 'transparent',
                                      border: 'none',
                                      borderRadius: '5px',
                                      cursor: 'pointer',
                                      textAlign: 'left',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = '#fef2f2')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                  >
                                    <Trash2 size={14} color="#dc2626" />
                                    <span>Delete Place</span>
                                  </button>
                                </>
                              )}
                            </div>
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

      {/* ========================================================================= */}
      {/* MODAL 1: ADD / EDIT HISTORICAL PLACE MODAL WITH INTERACTIVE MAP PICKER */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(4px)',
            padding: '1rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '680px',
              background: '#ffffff',
              borderRadius: '12px',
              padding: '1.5rem',
              border: '1px solid var(--border-color)',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.15)',
              maxHeight: '92vh',
              overflowY: 'auto',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  {editingId ? 'Edit Historical Place' : 'Add New Historical Place'}
                </h3>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Name, About History, Location with Interactive Map &amp; Photo Array
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {formError && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#dc2626',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  <span>{formError}</span>
                </div>
              )}

              {/* 1. Name */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                  Historical Place Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Taj Mahal, Red Fort, Qutub Minar, Hawa Mahal"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.85rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    color: 'var(--text-primary)',
                    background: '#ffffff',
                  }}
                />
              </div>

              {/* 2. Location & Interactive Map Section */}
              <div
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '12px',
                  background: '#fafafa',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <MapPin size={14} color="var(--accent-blue)" />
                    Location &amp; Map Coordinates
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowMapPicker(!showMapPicker)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-blue)',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {showMapPicker ? 'Hide Map' : 'Show Map'}
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="City, State, Country (e.g. Agra, Uttar Pradesh)"
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.85rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    color: 'var(--text-primary)',
                    background: '#ffffff',
                    marginBottom: '8px',
                  }}
                />

                {/* Interactive Leaflet OpenStreetMap Picker */}
                {showMapPicker && (
                  <LocationMapPicker
                    locationName={formData.location || formData.name || ''}
                    latitude={formData.latitude}
                    longitude={formData.longitude}
                    onChange={handleMapLocationChange}
                    height="240px"
                  />
                )}
              </div>

              {/* 3. About Description */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                  About (History, Significance &amp; Architectural Details) <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Enter comprehensive history, architectural details, and cultural background of this historical place..."
                  value={formData.about}
                  onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.85rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    color: 'var(--text-primary)',
                    background: '#ffffff',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* 4. Photo in Array with Direct File Upload & URL Support */}
              <div
                style={{
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  padding: '12px',
                  background: '#fafafa',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Images size={15} color="var(--accent-blue)" />
                    Photos in Array ({formData.photos.length + uploadFiles.length} added)
                  </label>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Upload image files from device
                  </span>
                </div>

                {/* File Upload Dropzone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      handleFilesAdded(Array.from(e.dataTransfer.files));
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed var(--accent-blue)',
                    borderRadius: '8px',
                    padding: '16px',
                    textAlign: 'center',
                    background: '#eff6ff',
                    cursor: 'pointer',
                    marginBottom: '10px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFilesAdded(Array.from(e.target.files));
                        e.target.value = '';
                      }
                    }}
                  />
                  <Upload size={24} color="var(--accent-blue)" style={{ margin: '0 auto 6px' }} />
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#1e40af' }}>
                    Click to Browse Images or Drag &amp; Drop here
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '3px' }}>
                    Supports JPG, PNG, WEBP, GIF (Upload multiple images directly into the array)
                  </div>
                </div>

                {/* Combined Photo Array Preview Grid (Uploaded Files + URLs) */}
                {formData.photos.length + uploadFiles.length > 0 ? (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                      gap: '8px',
                      padding: '8px',
                      background: '#ffffff',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      maxHeight: '180px',
                      overflowY: 'auto',
                    }}
                  >
                    {/* 1. Newly Uploaded Files Previews */}
                    {uploadFiles.map((item, idx) => (
                      <div
                        key={`file-${idx}`}
                        style={{
                          position: 'relative',
                          height: '75px',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          border: '2px solid #3b82f6',
                          background: '#000',
                        }}
                      >
                        <img
                          src={item.preview}
                          alt={`Uploaded ${idx + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveUploadFile(idx)}
                          title="Remove uploaded image"
                          style={{
                            position: 'absolute',
                            top: '3px',
                            right: '3px',
                            background: 'rgba(220, 38, 38, 0.9)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '50%',
                            width: '18px',
                            height: '18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          <X size={11} />
                        </button>
                        <span
                          style={{
                            position: 'absolute',
                            bottom: '2px',
                            left: '3px',
                            background: '#2563eb',
                            color: '#ffffff',
                            fontSize: '0.62rem',
                            fontWeight: 700,
                            padding: '1px 4px',
                            borderRadius: '3px',
                          }}
                        >
                          Uploaded
                        </span>
                      </div>
                    ))}

                    {/* 2. Existing URL Photos */}
                    {formData.photos.map((url, idx) => (
                      <div
                        key={`url-${idx}`}
                        style={{
                          position: 'relative',
                          height: '75px',
                          borderRadius: '6px',
                          overflow: 'hidden',
                          border: '1px solid var(--border-color)',
                          background: '#000',
                        }}
                      >
                        <img
                          src={url}
                          alt={`Place photo ${idx + 1}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=400&q=80';
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          title="Remove photo"
                          style={{
                            position: 'absolute',
                            top: '3px',
                            right: '3px',
                            background: 'rgba(220, 38, 38, 0.9)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '50%',
                            width: '18px',
                            height: '18px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            padding: 0,
                          }}
                        >
                          <X size={11} />
                        </button>
                        <span
                          style={{
                            position: 'absolute',
                            bottom: '2px',
                            left: '3px',
                            background: 'rgba(0, 0, 0, 0.65)',
                            color: '#ffffff',
                            fontSize: '0.62rem',
                            padding: '1px 4px',
                            borderRadius: '3px',
                          }}
                        >
                          Photo #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      padding: '14px',
                      textAlign: 'center',
                      background: '#ffffff',
                      borderRadius: '6px',
                      border: '1px dashed var(--border-color)',
                      color: 'var(--text-muted)',
                      fontSize: '0.78rem',
                    }}
                  >
                    No photos added yet. Click browse above to upload image files.
                  </div>
                )}
              </div>

              {/* 5. Status */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                  Publication Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'ACTIVE' | 'INACTIVE' })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.85rem',
                    outline: 'none',
                    background: '#ffffff',
                    color: 'var(--text-primary)',
                  }}
                >
                  <option value="ACTIVE">ACTIVE (Publicly Visible)</option>
                  <option value="INACTIVE">INACTIVE (Hidden from Public)</option>
                </select>
              </div>

              {/* Form Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  style={{
                    padding: '8px 16px',
                    background: '#ffffff',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  style={{
                    padding: '8px 18px',
                    background: 'var(--accent-blue)',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: '#ffffff',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {isSaving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Historical Place'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: INTERACTIVE VIEW ON MAP MODAL */}
      {/* ========================================================================= */}
      {viewMapPlace && (
        <LocationViewModal
          place={viewMapPlace}
          onClose={() => setViewMapPlace(null)}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: PHOTO GALLERY LIGHTBOX MODAL */}
      {/* ========================================================================= */}
      {galleryPlace && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(10, 15, 29, 0.9)',
            backdropFilter: 'blur(8px)',
            padding: '1rem',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setGalleryPlace(null);
          }}
        >
          <div
            style={{
              position: 'relative',
              maxWidth: '850px',
              width: '100%',
              background: '#0f172a',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Lightbox Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: 'rgba(15, 23, 42, 0.9)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{galleryPlace.name}</div>
                <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                  Photo {activePhotoIdx + 1} of {galleryPlace.photos?.length || 0} in array
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGalleryPlace(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Main Active Image View with Next/Prev Controls */}
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#020617',
                minHeight: '380px',
                maxHeight: '65vh',
              }}
            >
              {galleryPlace.photos && galleryPlace.photos[activePhotoIdx] ? (
                <img
                  src={galleryPlace.photos[activePhotoIdx]}
                  alt={`${galleryPlace.name} photo ${activePhotoIdx + 1}`}
                  onError={(e) => {
                    const target = e.currentTarget as HTMLImageElement;
                    if (!target.dataset.fallbackTried) {
                      target.dataset.fallbackTried = 'true';
                      target.src = DEFAULT_FALLBACK_IMAGE;
                    }
                  }}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '65vh',
                    objectFit: 'contain',
                  }}
                />
              ) : (
                <div style={{ color: '#94a3b8' }}>No image to preview</div>
              )}

              {/* Navigation Arrows if more than 1 photo */}
              {galleryPlace.photos && galleryPlace.photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setActivePhotoIdx((prev) => (prev > 0 ? prev - 1 : galleryPlace.photos.length - 1))}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      background: 'rgba(0, 0, 0, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: '#ffffff',
                      borderRadius: '50%',
                      width: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivePhotoIdx((prev) => (prev < galleryPlace.photos.length - 1 ? prev + 1 : 0))}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      background: 'rgba(0, 0, 0, 0.6)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      color: '#ffffff',
                      borderRadius: '50%',
                      width: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <ChevronRight size={20} />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Navigation Bar */}
            {galleryPlace.photos && galleryPlace.photos.length > 1 && (
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  padding: '8px 12px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  overflowX: 'auto',
                }}
              >
                {galleryPlace.photos.map((url, pIdx) => (
                  <img
                    key={pIdx}
                    src={url}
                    alt={`Thumb ${pIdx}`}
                    onClick={() => setActivePhotoIdx(pIdx)}
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement;
                      if (!target.dataset.fallbackTried) {
                        target.dataset.fallbackTried = 'true';
                        target.src = DEFAULT_FALLBACK_IMAGE;
                      }
                    }}
                    style={{
                      width: '48px',
                      height: '36px',
                      borderRadius: '4px',
                      objectFit: 'cover',
                      cursor: 'pointer',
                      border: activePhotoIdx === pIdx ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                      opacity: activePhotoIdx === pIdx ? 1 : 0.6,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: ABOUT READ-MORE MODAL */}
      {/* ========================================================================= */}
      {aboutPlace && (
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
            if (e.target === e.currentTarget) setAboutPlace(null);
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
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {aboutPlace.name}
                </h3>
                {aboutPlace.location && (
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {aboutPlace.location}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setAboutPlace(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6', maxHeight: '350px', overflowY: 'auto' }}>
              {aboutPlace.about}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setAboutPlace(null)}
                style={{
                  padding: '6px 14px',
                  background: 'var(--accent-blue)',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
