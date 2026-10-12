import React, { useState } from 'react';
import {
  Camera,
  ShieldCheck,
  Lock,
  User,
  Eye,
  EyeOff,
  Sparkles,
  KeyRound,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [identifier, setIdentifier] = useState('admin');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim()) {
      setError('Please enter your User ID or Email');
      return;
    }
    if (!password) {
      setError('Please enter password');
      return;
    }

    const res = await login(identifier.trim(), password);
    if (!res.success) {
      setError(res.message || 'Login failed. Please check your credentials.');
    }
  };

  const handleFillAdmin = () => {
    setIdentifier('admin');
    setPassword('123456');
    setError(null);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at 50% 0%, #1e293b 0%, #0f172a 70%, #020617 100%)',
        padding: '1.5rem',
        position: 'relative',
        overflow: 'hidden',
        color: '#f8fafc',
      }}
    >
      {/* Background Ambient Glows */}
      <div
        style={{
          position: 'absolute',
          top: '-150px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(37, 99, 235, 0.25) 0%, transparent 70%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-100px',
          right: '10%',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, transparent 70%)',
          filter: 'blur(70px)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          zIndex: 10,
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              boxShadow: '0 8px 24px rgba(37, 99, 235, 0.4), 0 0 40px rgba(37, 99, 235, 0.2)',
              marginBottom: '1rem',
            }}
          >
            <Camera size={32} color="#ffffff" />
          </div>
          <h1
            style={{
              fontSize: '1.85rem',
              fontWeight: 800,
              letterSpacing: '-0.5px',
              color: '#ffffff',
              margin: '0 0 6px 0',
            }}
          >
            TrafficVision AI
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#94a3b8', margin: 0 }}>
            Intelligent CCTV Traffic Monitoring &amp; RBAC Command Center
          </p>
        </div>

        {/* Login Card */}
        <div
          className="glass-panel"
          style={{
            background: 'rgba(30, 41, 59, 0.7)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '20px',
            padding: '2rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 35px rgba(37, 99, 235, 0.15)',
          }}
        >
          {/* Quick Auto-Fill Admin Banner */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(37, 99, 235, 0.15), rgba(15, 23, 42, 0.6))',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              borderRadius: '12px',
              padding: '12px 14px',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'rgba(37, 99, 235, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <KeyRound size={17} color="#60a5fa" />
              </div>
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#ffffff' }}>
                  Admin ID: <span style={{ color: '#38bdf8' }}>admin</span> &bull; Pass: <span style={{ color: '#38bdf8' }}>123456</span>
                </div>
                <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                  Click Auto-Fill for instant admin sign-in
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleFillAdmin}
              style={{
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#ffffff',
                border: 'none',
                padding: '7px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.35)',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s',
              }}
            >
              <Sparkles size={14} />
              Auto Fill
            </button>
          </div>

          {error && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '10px',
                padding: '12px 14px',
                color: '#fca5a5',
                fontSize: '0.86rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
            {/* User ID Input */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#cbd5e1',
                  marginBottom: '8px',
                }}
              >
                User ID / Username
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  padding: '0 14px',
                  transition: 'border-color 0.2s',
                }}
              >
                <User size={18} color="#64748b" style={{ marginRight: '10px', flexShrink: 0 }} />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter User ID (e.g. admin)"
                  required
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#f8fafc',
                    padding: '13px 0',
                    fontSize: '0.95rem',
                  }}
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#cbd5e1',
                  marginBottom: '8px',
                }}
              >
                Password
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '12px',
                  padding: '0 14px',
                  transition: 'border-color 0.2s',
                }}
              >
                <Lock size={18} color="#64748b" style={{ marginRight: '10px', flexShrink: 0 }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password (e.g. 123456)"
                  required
                  style={{
                    width: '100%',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#f8fafc',
                    padding: '13px 0',
                    fontSize: '0.95rem',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#64748b',
                    cursor: 'pointer',
                    padding: '6px',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                marginTop: '0.5rem',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#ffffff',
                border: 'none',
                padding: '14px',
                borderRadius: '12px',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.75 : 1,
                boxShadow: '0 4px 18px rgba(37, 99, 235, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                transition: 'all 0.2s',
              }}
            >
              {isLoading ? (
                <span>Authenticating &amp; Loading Role Permissions...</span>
              ) : (
                <>
                  <ShieldCheck size={20} />
                  Sign In &amp; Load Dashboard
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Dynamic RBAC feature callout */}
          <div
            style={{
              marginTop: '1.5rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
            }}
          >
            <Layers size={18} color="#38bdf8" style={{ marginTop: '2px', flexShrink: 0 }} />
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', lineHeight: '1.4' }}>
              <strong style={{ color: '#e2e8f0' }}>Dynamic Module RBAC:</strong> Login hone ke baad
              backend ki <code>/api/v1/roles/user-access</code> API call hogi aur aapke role ke
              assigned JSON permissions ke according customized sidebar generate hoga.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
