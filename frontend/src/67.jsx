import React, { useState, useRef, useEffect, useCallback } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────
const DEPARTMENTS = [
  { id: 'TX',   label: 'Textile', color: '#00e5ff' },
  { id: 'EE',   label: 'Electrical',        color: '#ff6d00' },
  { id: 'CV',   label: 'Civil',             color: '#76ff03' },
  { id: 'CS',   label: 'Computer',        color: '#ff00ff' },
];

const POSITION_LABELS = { tl: 'Top-Left', tr: 'Top-Right', bl: 'Bot-Left', br: 'Bot-Right' };

// Fake campus bounding box → maps GPS to canvas %
const CAMPUS_BOUNDS = {
  latMin: 19.01772,
  latMax: 19.02572,
  lngMin: 72.8450,
  lngMax: 72.85969,
};

// ⭐ ADD YOUR MAP IMAGE URL HERE ⭐
const MAP_IMAGE_URL = 'https://miro.medium.com/v2/resize:fit:1400/1*9Jd0lHlpBe7yMvyS16LzqQ.jpeg'; // Replace with your actual map image

const gpsToPercent = (lat, lng) => ({
  x: Math.min(Math.max(((lng - CAMPUS_BOUNDS.lngMin) / (CAMPUS_BOUNDS.lngMax - CAMPUS_BOUNDS.lngMin)) * 100, 0), 100),
  y: Math.min(Math.max(((CAMPUS_BOUNDS.latMax - lat) / (CAMPUS_BOUNDS.latMax - CAMPUS_BOUNDS.latMin)) * 100, 0), 100),
});

export default function BinRegistry() {
  const [bins,         setBins]         = useState({});
  const [userPos,      setUserPos]      = useState(null);
  const [geoError,     setGeoError]     = useState(null);
  const [nearestBin,   setNearestBin]   = useState(null);
  const [showUpload,   setShowUpload]   = useState(false);
  const [activeCorner, setActiveCorner] = useState(null);
  const [formData,     setFormData]     = useState({ capacity: '', date: '', image: null });
  const [saving,       setSaving]       = useState(false);
  const [pulse,        setPulse]        = useState(false);
  const [toast,        setToast]        = useState(null);
  const [showControls, setShowControls] = useState(true); // Toggle controls visibility
  const mapRef   = useRef(null);
  const watchRef = useRef(null);

  const deptBoxes = {
    TX: { left: 5, top: 20, right: 25, bottom: 80 },
    EE: { left: 45, top: 20, right: 78, bottom: 40 },
    CV: { left: 28, top: 22, right: 40, bottom: 60 },
    CS: { left: 65, top: 43, right: 78, bottom: 75 },
  };

  const getCornerPositions = useCallback((deptId) => {
    const b = deptBoxes[deptId];
    return {
      tl: { x: b.left,  y: b.top    },
      tr: { x: b.right, y: b.top    },
      bl: { x: b.left,  y: b.bottom },
      br: { x: b.right, y: b.bottom },
    };
  }, []);

  useEffect(() => {
    fetch('http://localhost:5000/bins')
      .then(r => r.json())
      .then(data => {
        const m = {};
        data.forEach(bin => { m[`${bin.department}-${bin.corner_position}`] = bin; });
        setBins(m);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation not supported');
      return;
    }
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const pct = gpsToPercent(lat, lng);
        setUserPos({ lat, lng, ...pct });
        setGeoError(null);
        setPulse(true);
        setTimeout(() => setPulse(false), 600);
      },
      (err) => setGeoError(err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    return () => { if (watchRef.current) navigator.geolocation.clearWatch(watchRef.current); };
  }, []);

  useEffect(() => {
    if (!userPos) return;
    let minDist = Infinity;
    let nearest = null;
    DEPARTMENTS.forEach(({ id }) => {
      const corners = getCornerPositions(id);
      Object.entries(corners).forEach(([pos, coord]) => {
        const dist = Math.hypot(userPos.x - coord.x, userPos.y - coord.y);
        if (dist < minDist) { minDist = dist; nearest = `${id}-${pos}`; }
      });
    });
    setNearestBin(nearest);
  }, [userPos, getCornerPositions]);

  const handleUploadNearest = () => {
    if (!nearestBin) return;
    const [dept, pos] = nearestBin.split('-');
    setActiveCorner({ department: dept, position: pos });
    setShowUpload(true);
  };

  const handleCornerClick = (dept, pos) => {
    setActiveCorner({ department: dept, position: pos });
    setShowUpload(true);
  };

  const saveBin = async () => {
    if (!formData.capacity || !formData.date) {
      showToast('Please fill all required fields', 'error'); return;
    }
    setSaving(true);
    const data = new FormData();
    data.append('latitude',          userPos?.lat ?? 28.625);
    data.append('longitude',         userPos?.lng ?? 77.217);
    data.append('capacity',          formData.capacity);
    data.append('department',        activeCorner.department);
    data.append('corner_position',   activeCorner.position);
    data.append('installation_date', formData.date);
    if (formData.image) data.append('image', formData.image);

    try {
      const res = await fetch('http://localhost:5000/bins', { method: 'POST', body: data });
      if (res.ok) {
        const newBin = await res.json();
        const key = `${activeCorner.department}-${activeCorner.position}`;
        setBins(prev => ({ ...prev, [key]: newBin }));
        closeUpload();
        showToast('Bin registered successfully!', 'success');
      } else { showToast('Server error – try again', 'error'); }
    } catch { showToast('Network error', 'error'); }
    setSaving(false);
  };

  const closeUpload = () => {
    setShowUpload(false);
    setActiveCorner(null);
    setFormData({ capacity: '', date: '', image: null });
  };

  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const isCornerFilled = (dept, pos) => !!bins[`${dept}-${pos}`];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Rajdhani:wght@400;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body { background: #060a0f; overflow: hidden; }

        .bin-root {
          font-family: 'Rajdhani', sans-serif;
          background: #060a0f;
          height: 100vh;
          width: 100vw;
          color: #c8d8e8;
          position: relative;
          overflow: hidden;
        }

        /* Floating controls container - MOVED TO BOTTOM CENTER */
        .controls-panel {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 50;
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-width: 420px;
          width: calc(100% - 40px);
          transition: transform 0.3s ease;
        }

        .controls-panel.hidden {
          transform: translateX(-50%) translateY(calc(100% + 40px));
        }

        

        .controls-toggle:hover {
          background: rgba(0, 229, 255, 0.15);
          box-shadow: 0 0 20px rgba(0, 229, 255, 0.3);
        }

        .header {
          background: rgba(13, 28, 43, 0.95);
          border: 1px solid rgba(0, 229, 255, 0.2);
          border-radius: 10px;
          padding: 16px 20px;
          backdrop-filter: blur(10px);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
        }

        .header h1 {
          font-family: 'Space Mono', monospace;
          font-size: 1rem;
          color: #00e5ff;
          letter-spacing: 0.08em;
          text-shadow: 0 0 20px rgba(0,229,255,0.6);
        }

        .header p {
          font-size: 0.72rem;
          color: #5a7a8a;
          margin-top: 4px;
          letter-spacing: 0.05em;
        }

        .gps-bar {
          display: flex;
          align-items: center;
          gap: 10px;
          background: rgba(13, 28, 43, 0.95);
          border: 1px solid rgba(0,229,255,0.2);
          border-radius: 8px;
          padding: 10px 16px;
          font-family: 'Space Mono', monospace;
          font-size: 0.68rem;
          backdrop-filter: blur(10px);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
        }

        .gps-dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #00e5ff;
          flex-shrink: 0;
          transition: box-shadow 0.3s;
        }
        .gps-dot.active { box-shadow: 0 0 0 4px rgba(0,229,255,0.25); }
        .gps-dot.pulse  { animation: gpsPulse 0.6s ease-out; }
        .gps-dot.error  { background: #ff1744; box-shadow: 0 0 0 4px rgba(255,23,68,0.25); }
        
        @keyframes gpsPulse {
          0%   { transform: scale(1); box-shadow: 0 0 0 0 rgba(0,229,255,0.6); }
          50%  { transform: scale(1.4); box-shadow: 0 0 0 8px rgba(0,229,255,0); }
          100% { transform: scale(1); }
        }
        
        .gps-coords { color: #00e5ff; flex: 1; min-width: 0; }
        .gps-nearest { color: #76ff03; white-space: nowrap; }

        .upload-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: linear-gradient(135deg, rgba(118,255,3,0.15), rgba(0,229,255,0.1));
          border: 1.5px solid #76ff03;
          color: #76ff03;
          font-family: 'Space Mono', monospace;
          font-size: 0.75rem;
          letter-spacing: 0.06em;
          padding: 12px 20px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          text-transform: uppercase;
          backdrop-filter: blur(10px);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
        }
        
        .upload-btn:hover:not(:disabled) {
          background: rgba(118,255,3,0.25);
          box-shadow: 0 0 25px rgba(118,255,3,0.4);
        }
        .upload-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .upload-btn .arrow { font-size: 1rem; }

        /* ─── FULLSCREEN MAP ─────────────────────────────────────── */
        .map-wrap {
          position: absolute;
          inset: 0;
          width: 100vw;
          height: 100vh;
          background: #0b1420;
          overflow: hidden;
        }

        /* Map background image */
        .map-background {
          position: absolute;
          inset: 0;
          background-image: url('${MAP_IMAGE_URL}');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
          opacity: 0.8;
        }

        /* Optional overlay for better contrast */
        .map-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            135deg,
            rgba(6, 10, 15, 0.3),
            rgba(11, 20, 32, 0.4)
          );
        }

        .map-grid {
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(rgba(0,229,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,229,255,0.03) 1px, transparent 1px);
          background-size: 50px 50px;
          pointer-events: none;
        }

        .dept-block {
          position: absolute;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 6px;
          transition: all 0.2s;
          backdrop-filter: blur(4px);
        }
        
        .dept-block::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          border: 2px solid;
          border-color: inherit;
          opacity: 0.3;
          pointer-events: none;
        }
        
        .dept-block:hover {
          z-index: 2;
          backdrop-filter: blur(8px);
        }
        
        .dept-block:hover::before {
          opacity: 0.6;
        }

        .dept-label {
          font-family: 'Space Mono', monospace;
          font-size: 0.75rem;
          letter-spacing: 0.12em;
          opacity: 0.8;
          text-transform: uppercase;
          text-align: center;
          pointer-events: none;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
        }
        
        .dept-id {
          font-size: 1.8rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          pointer-events: none;
          text-shadow: 0 2px 12px rgba(0, 0, 0, 0.8);
        }

        .corner-dot {
          position: absolute;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          border: 2.5px solid #0b1420;
          cursor: pointer;
          transition: all 0.2s;
          z-index: 5;
        }
        
        .corner-dot:hover {
          transform: translate(-50%, -50%) scale(1.6);
          box-shadow: 0 0 20px currentColor;
          z-index: 6;
        }
        
        .corner-dot.empty {
          background: rgba(26, 42, 58, 0.8);
          border-color: rgba(200,216,232,0.4);
          backdrop-filter: blur(4px);
        }
        
        .corner-dot.filled {
          background: currentColor;
          box-shadow: 0 0 12px currentColor;
          animation: dotGlow 2s ease-in-out infinite alternate;
        }
        
        .corner-dot.nearest-highlight {
          border-color: #76ff03 !important;
          box-shadow: 0 0 0 4px rgba(118,255,3,0.4) !important;
          animation: nearestPulse 1.2s ease-in-out infinite;
        }
        
        @keyframes dotGlow {
          from { opacity: 0.8; }
          to   { opacity: 1; filter: brightness(1.3); }
        }
        
        @keyframes nearestPulse {
          0%,100% { box-shadow: 0 0 0 4px rgba(118,255,3,0.4); }
          50%      { box-shadow: 0 0 0 10px rgba(118,255,3,0); }
        }

        .user-marker {
          position: absolute;
          transform: translate(-50%, -50%);
          z-index: 10;
          pointer-events: none;
        }
        
        .user-marker-ring {
          position: absolute;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 2.5px solid rgba(118,255,3,0.6);
          top: 50%;
          left: 50%;
          transform: translate(-50%,-50%);
          animation: radarRing 1.8s ease-out infinite;
        }
        
        .user-marker-ring:nth-child(2) { animation-delay: 0.6s; }
        .user-marker-ring:nth-child(3) { animation-delay: 1.2s; }
        
        @keyframes radarRing {
          0%   { width: 12px; height: 12px; opacity: 0.9; border-width: 2.5px; }
          100% { width: 50px; height: 50px; opacity: 0; border-width: 1px; }
        }
        
        .user-marker-core {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #76ff03;
          box-shadow: 0 0 12px #76ff03, 0 0 24px rgba(118,255,3,0.6);
          position: relative;
          z-index: 1;
        }

        .compass {
          position: absolute;
          top: 20px;
          right: 20px;
          background: rgba(13, 28, 43, 0.9);
          border: 1px solid rgba(0, 229, 255, 0.2);
          border-radius: 8px;
          padding: 12px 16px;
          font-family: 'Space Mono', monospace;
          font-size: 0.7rem;
          color: rgba(0,229,255,0.6);
          backdrop-filter: blur(10px);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
        }

        .legend {
          position: fixed;
          top: 20px;
          left: 20px;
          z-index: 50;
          display: flex;
          flex-direction: column;
          gap: 8px;
          background: rgba(13, 28, 43, 0.95);
          border: 1px solid rgba(0, 229, 255, 0.2);
          border-radius: 8px;
          padding: 12px 16px;
          font-size: 0.7rem;
          color: #5a7a8a;
          font-family: 'Space Mono', monospace;
          backdrop-filter: blur(10px);
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.3);
        }
        
        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          flex-shrink: 0;
        }

        /* ─── Modal styles (unchanged) ─────────────────────────── */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(6,10,15,0.9);
          backdrop-filter: blur(8px);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          animation: fadeIn 0.2s ease;
        }
        
        @keyframes fadeIn { from { opacity:0 } to { opacity:1 } }

        .modal {
          background: #0d1c2b;
          border: 1px solid rgba(0,229,255,0.25);
          border-radius: 12px;
          padding: 28px;
          width: 100%;
          max-width: 420px;
          box-shadow: 0 0 60px rgba(0,229,255,0.15);
          animation: slideUp 0.2s ease;
        }
        
        @keyframes slideUp {
          from { transform:translateY(20px);opacity:0 }
          to { transform:translateY(0);opacity:1 }
        }

        .modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        
        .modal-title {
          font-family: 'Space Mono', monospace;
          font-size: 0.95rem;
          color: #00e5ff;
          letter-spacing: 0.08em;
          text-shadow: 0 0 10px rgba(0,229,255,0.4);
        }
        
        .modal-subtitle {
          font-size: 0.8rem;
          color: #5a7a8a;
          margin-top: 4px;
        }
        
        .modal-close {
          background: none;
          border: 1px solid rgba(200,216,232,0.15);
          color: #5a7a8a;
          width: 30px;
          height: 30px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 1.2rem;
          line-height: 1;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        
        .modal-close:hover {
          border-color: #ff1744;
          color: #ff1744;
        }

        .field-group { margin-bottom: 16px; }
        
        .field-label {
          display: block;
          font-family: 'Space Mono', monospace;
          font-size: 0.68rem;
          color: #5a7a8a;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        
        .field-input {
          width: 100%;
          background: rgba(0,229,255,0.05);
          border: 1px solid rgba(0,229,255,0.2);
          border-radius: 6px;
          padding: 10px 14px;
          color: #c8d8e8;
          font-family: 'Rajdhani', sans-serif;
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        
        .field-input:focus {
          border-color: rgba(0,229,255,0.6);
          box-shadow: 0 0 0 3px rgba(0,229,255,0.1);
        }

        .file-drop {
          border: 1.5px dashed rgba(0,229,255,0.25);
          border-radius: 6px;
          padding: 18px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        
        .file-drop:hover {
          border-color: rgba(0,229,255,0.5);
          background: rgba(0,229,255,0.05);
        }
        
        .file-drop input { display: none; }
        
        .file-drop-text {
          font-size: 0.8rem;
          color: #5a7a8a;
        }
        
        .file-drop-text span { color: #00e5ff; }
        
        .file-name {
          font-size: 0.82rem;
          color: #76ff03;
          margin-top: 6px;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
        }
        
        .btn-save {
          flex: 1;
          background: linear-gradient(135deg, rgba(0,229,255,0.18), rgba(0,229,255,0.1));
          border: 1.5px solid #00e5ff;
          color: #00e5ff;
          font-family: 'Space Mono', monospace;
          font-size: 0.75rem;
          letter-spacing: 0.08em;
          padding: 11px;
          border-radius: 6px;
          cursor: pointer;
          text-transform: uppercase;
          transition: all 0.15s;
        }
        
        .btn-save:hover:not(:disabled) {
          background: rgba(0,229,255,0.25);
          box-shadow: 0 0 20px rgba(0,229,255,0.35);
        }
        
        .btn-save:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        
        .btn-cancel {
          background: none;
          border: 1px solid rgba(200,216,232,0.2);
          color: #5a7a8a;
          font-family: 'Space Mono', monospace;
          font-size: 0.75rem;
          padding: 11px 18px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.15s;
        }
        
        .btn-cancel:hover {
          border-color: #ff1744;
          color: #ff1744;
        }

        .bin-info-card {
          background: rgba(118,255,3,0.06);
          border: 1px solid rgba(118,255,3,0.25);
          border-radius: 6px;
          padding: 12px 16px;
          margin-bottom: 18px;
        }
        
        .bin-info-title {
          font-size: 0.72rem;
          color: #76ff03;
          font-family: 'Space Mono', monospace;
          margin-bottom: 8px;
        }
        
        .bin-info-row {
          display: flex;
          justify-content: space-between;
          font-size: 0.82rem;
          color: #c8d8e8;
          margin-bottom: 4px;
        }
        
        .bin-info-val { color: #00e5ff; }

        .toast {
          position: fixed;
          bottom: 280px;
          left: 50%;
          transform: translateX(-50%);
          background: #0d1c2b;
          border-radius: 8px;
          padding: 14px 26px;
          font-family: 'Space Mono', monospace;
          font-size: 0.75rem;
          z-index: 200;
          animation: toastIn 0.25s ease;
          white-space: nowrap;
          backdrop-filter: blur(10px);
        }
        
        .toast.success {
          border: 1px solid #76ff03;
          color: #76ff03;
          box-shadow: 0 0 25px rgba(118,255,3,0.3);
        }
        
        .toast.error {
          border: 1px solid #ff1744;
          color: #ff1744;
          box-shadow: 0 0 25px rgba(255,23,68,0.3);
        }
        
        @keyframes toastIn {
          from { opacity:0; transform:translateX(-50%) translateY(10px); }
          to   { opacity:1; transform:translateX(-50%) translateY(0); }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .controls-panel {
            max-width: calc(100vw - 40px);
          }
          
          .dept-id {
            font-size: 1.4rem;
          }
          
          .dept-label {
            font-size: 0.65rem;
          }
          
          .legend {
            font-size: 0.65rem;
            padding: 10px 12px;
          }
        }
      `}</style>

      <div className="bin-root">
        {/* Toggle button */}
        <button
          className="controls-toggle"
          onClick={() => setShowControls(!showControls)}
          title={showControls ? 'Hide controls' : 'Show controls'}
        >
          {showControls ? '▾' : '▴'}
        </button>

        {/* Floating controls panel */}
        <div className={`controls-panel ${!showControls ? 'hidden' : ''}`}>
          <div className="header">
            <h1>⬡ CAMPUS BIN REGISTRY</h1>
            <p>DIGITAL TWIN · WASTE MANAGEMENT</p>
          </div>

          <div className="gps-bar">
            <div className={`gps-dot ${geoError ? 'error' : userPos ? 'active' : ''} ${pulse ? 'pulse' : ''}`} />
            <span className="gps-coords">
              {geoError
                ? `ERROR: ${geoError}`
                : userPos
                ? `${userPos.lat.toFixed(5)}, ${userPos.lng.toFixed(5)}`
                : 'Acquiring GPS…'
              }
            </span>
            {nearestBin && userPos && (
              <span className="gps-nearest">
                {nearestBin.replace('-', ' › ').toUpperCase()}
              </span>
            )}
          </div>

          <button
            className="upload-btn"
            onClick={handleUploadNearest}
            disabled={!nearestBin || !userPos}
            title={!userPos ? 'Waiting for GPS…' : ''}
          >
            <span className="arrow">⬆</span>
            UPLOAD TO NEAREST
          </button>
        </div>

        {/* ─── FULLSCREEN MAP ─────────────────────────────────── */}
        <div className="map-wrap" ref={mapRef}>
          {/* Map background image */}
          <div className="map-background" />
          <div className="map-overlay" />
          <div className="map-grid" />

          {/* Department blocks and corners */}
          {DEPARTMENTS.map(dept => {
            const b = deptBoxes[dept.id];
            const corners = getCornerPositions(dept.id);
            return (
              <React.Fragment key={dept.id}>
                <div
                  className="dept-block"
                  style={{
                    left:   `${b.left}%`,
                    top:    `${b.top}%`,
                    width:  `${b.right - b.left}%`,
                    height: `${b.bottom - b.top}%`,
                    background: `${dept.color}10`,
                    borderColor: dept.color,
                  }}
                >
                  <span className="dept-id" style={{ color: dept.color }}>{dept.id}</span>
                  <span className="dept-label" style={{ color: dept.color }}>{dept.label}</span>
                </div>

                {Object.entries(corners).map(([pos, coord]) => {
                  const filled  = isCornerFilled(dept.id, pos);
                  const isNearest = nearestBin === `${dept.id}-${pos}`;
                  return (
                    <div
                      key={`${dept.id}-${pos}`}
                      className={`corner-dot ${filled ? 'filled' : 'empty'} ${isNearest ? 'nearest-highlight' : ''}`}
                      style={{
                        left:  `${coord.x}%`,
                        top:   `${coord.y}%`,
                        color: dept.color,
                      }}
                      onClick={() => handleCornerClick(dept.id, pos)}
                      title={`${dept.label} · ${POSITION_LABELS[pos]}${filled ? ' (registered)' : ''}`}
                    />
                  );
                })}
              </React.Fragment>
            );
          })}

          {/* User position */}
          {userPos && (
            <div
              className="user-marker"
              style={{ left: `${userPos.x}%`, top: `${userPos.y}%` }}
            >
              <div className="user-marker-ring" />
              <div className="user-marker-ring" />
              <div className="user-marker-ring" />
              <div className="user-marker-core" />
            </div>
          )}

          {/* Compass */}
          <div className="compass">N ↑</div>
        </div>

        {/* Legend - moved to top left */}
        <div className="legend">
          <span className="legend-item">
            <span className="legend-dot" style={{ background: 'rgba(26,42,58,0.8)', border: '2px solid rgba(200,216,232,0.4)' }} />
            Empty
          </span>
          <span className="legend-item">
            <span className="legend-dot" style={{ background: '#00e5ff', boxShadow: '0 0 8px #00e5ff' }} />
            Registered
          </span>
          <span className="legend-item">
            <span className="legend-dot" style={{ background: '#76ff03', boxShadow: '0 0 8px #76ff03' }} />
            You
          </span>
          <span className="legend-item">
            <span className="legend-dot" style={{ background: 'transparent', border: '2.5px solid #76ff03', width: 12, height: 12 }} />
            Nearest
          </span>
        </div>

        {/* Modal (unchanged) */}
        {showUpload && activeCorner && (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeUpload()}>
            <div className="modal">
              <div className="modal-header">
                <div>
                  <div className="modal-title">
                    {isCornerFilled(activeCorner.department, activeCorner.position) ? '⬛ UPDATE BIN' : '⬡ REGISTER BIN'}
                  </div>
                  <div className="modal-subtitle">
                    {DEPARTMENTS.find(d => d.id === activeCorner.department)?.label}
                    &nbsp;·&nbsp;
                    {POSITION_LABELS[activeCorner.position]}
                  </div>
                </div>
                <button className="modal-close" onClick={closeUpload}>×</button>
              </div>

              {isCornerFilled(activeCorner.department, activeCorner.position) && (() => {
                const existing = bins[`${activeCorner.department}-${activeCorner.position}`];
                return (
                  <div className="bin-info-card">
                    <div className="bin-info-title">◈ EXISTING RECORD</div>
                    <div className="bin-info-row">
                      <span>Capacity</span>
                      <span className="bin-info-val">{existing.capacity}L</span>
                    </div>
                    <div className="bin-info-row">
                      <span>Installed</span>
                      <span className="bin-info-val">{existing.installation_date}</span>
                    </div>
                  </div>
                );
              })()}

              <div className="field-group">
                <label className="field-label">Capacity (litres) *</label>
                <input
                  className="field-input"
                  type="number"
                  placeholder="e.g. 120"
                  value={formData.capacity}
                  onChange={e => setFormData(p => ({ ...p, capacity: e.target.value }))}
                />
              </div>

              <div className="field-group">
                <label className="field-label">Installation Date *</label>
                <input
                  className="field-input"
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                />
              </div>

              <div className="field-group">
                <label className="field-label">Photo (optional)</label>
                <label className="file-drop">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => setFormData(p => ({ ...p, image: e.target.files[0] }))}
                  />
                  {formData.image
                    ? <div className="file-name">✓ {formData.image.name}</div>
                    : <div className="file-drop-text">Drop image or <span>browse</span></div>
                  }
                </label>
              </div>

              {userPos && (
                <div style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: '0.65rem',
                  color: '#5a7a8a',
                  marginBottom: 6,
                }}>
                  GPS: {userPos.lat.toFixed(5)}, {userPos.lng.toFixed(5)}
                </div>
              )}

              <div className="modal-actions">
                <button className="btn-save" onClick={saveBin} disabled={saving}>
                  {saving ? 'SAVING…' : 'SAVE BIN'}
                </button>
                <button className="btn-cancel" onClick={closeUpload}>CANCEL</button>
              </div>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className={`toast ${toast.type}`}>{toast.msg}</div>
        )}
      </div>
    </>
  );
}