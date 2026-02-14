import React, { useState, useRef, useEffect } from 'react';

export default function BinRegistry() {
  const [showPopup, setShowPopup] = useState(false);
  const [selectedCorner, setSelectedCorner] = useState(null);
  const [bins, setBins] = useState({});
  const [formData, setFormData] = useState({
    capacity: '',
    date: '',
    image: null
  });
  const mapRef = useRef(null);

  // Load existing bins on mount
  useEffect(() => {
    loadBins();
  }, []);

  const loadBins = async () => {
    try {
      const response = await fetch('http://localhost:5000/bins');
      const data = await response.json();
      
      // Group bins by corner key
      const binMap = {};
      data.forEach(bin => {
        const key = `${bin.department}-${bin.corner_position}`;
        binMap[key] = bin;
      });
      setBins(binMap);
    } catch (error) {
      console.error('Error loading bins:', error);
    }
  };

  // Calculate distance between two points
  const getDistance = (x1, y1, x2, y2) => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  };

  // Find nearest corner to click position
  const findNearestCorner = (clickX, clickY) => {
    const squares = document.querySelectorAll('.square');
    let nearest = null;
    let minDistance = Infinity;

    squares.forEach(square => {
      const rect = square.getBoundingClientRect();
      const dept = square.dataset.dept;

      // Define corner positions relative to square
      const corners = [
        { position: 'tl', x: rect.left, y: rect.top },
        { position: 'tr', x: rect.right, y: rect.top },
        { position: 'bl', x: rect.left, y: rect.bottom },
        { position: 'br', x: rect.right, y: rect.bottom }
      ];

      corners.forEach(corner => {
        const distance = getDistance(clickX, clickY, corner.x, corner.y);
        if (distance < minDistance) {
          minDistance = distance;
          nearest = {
            department: dept,
            position: corner.position,
            coords: { x: corner.x, y: corner.y }
          };
        }
      });
    });

    return nearest;
  };

  // Handle click anywhere on the map area
  const handleMapClick = (e) => {
    const clickX = e.clientX;
    const clickY = e.clientY;

    const nearestCorner = findNearestCorner(clickX, clickY);
    
    if (nearestCorner) {
      setSelectedCorner(nearestCorner);
      setShowPopup(true);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'image') {
      setFormData(prev => ({ ...prev, image: files[0] }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const saveBin = async () => {
    if (!formData.capacity || !formData.date) {
      alert('Please fill all required fields');
      return;
    }

    const data = new FormData();
    data.append('latitude', Math.random() * 90); // Demo coords
    data.append('longitude', Math.random() * 180);
    data.append('capacity', formData.capacity);
    data.append('department', selectedCorner.department);
    data.append('corner_position', selectedCorner.position);
    data.append('installation_date', formData.date);
    if (formData.image) {
      data.append('image', formData.image);
    }

    try {
      const response = await fetch('http://localhost:5000/bins', {
        method: 'POST',
        body: data
      });

      if (response.ok) {
        const newBin = await response.json();
        const key = `${selectedCorner.department}-${selectedCorner.position}`;
        setBins(prev => ({ ...prev, [key]: newBin }));
        closePopup();
      } else {
        alert('Error saving bin');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error saving bin');
    }
  };

  const closePopup = () => {
    setShowPopup(false);
    setSelectedCorner(null);
    setFormData({ capacity: '', date: '', image: null });
  };

  const isCornerFilled = (dept, position) => {
    const key = `${dept}-${position}`;
    return bins[key] !== undefined;
  };

  const getCornerStyle = (dept, position) => {
    return isCornerFilled(dept, position) ? 'filled' : '';
  };

  return (
    <div style={{ fontFamily: 'Arial', textAlign: 'center' }}>
      <h2>Campus Digital Twin – Bin Registry</h2>
      <p style={{ color: '#666', fontSize: '14px' }}>Click anywhere to place a bin at the nearest corner</p>

      <div 
        ref={mapRef}
        onClick={handleMapClick}
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '40px',
          marginTop: '30px',
          cursor: 'crosshair',
          padding: '40px'
        }}
      >
        {['Computer', 'Mechanical', 'Civil'].map(dept => (
          <div
            key={dept}
            className="square"
            data-dept={dept}
            style={{
              width: '200px',
              height: '200px',
              border: '2px solid black',
              position: 'relative',
              background: '#f9f9f9'
            }}
          >
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '14px',
              fontWeight: 'bold',
              color: '#333'
            }}>
              {dept}
            </div>

            {['tl', 'tr', 'bl', 'br'].map(position => (
              <div
                key={position}
                className={`corner ${position} ${getCornerStyle(dept, position)}`}
                style={{
                  width: '16px',
                  height: '16px',
                  background: isCornerFilled(dept, position) ? 'green' : 'red',
                  borderRadius: '50%',
                  position: 'absolute',
                  cursor: 'pointer',
                  ...(position === 'tl' && { top: '-8px', left: '-8px' }),
                  ...(position === 'tr' && { top: '-8px', right: '-8px' }),
                  ...(position === 'bl' && { bottom: '-8px', left: '-8px' }),
                  ...(position === 'br' && { bottom: '-8px', right: '-8px' }),
                  transition: 'transform 0.2s',
                  ':hover': {
                    transform: 'scale(1.2)'
                  }
                }}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Popup Form */}
      {showPopup && (
        <>
          <div
            onClick={closePopup}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 999
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              border: '1px solid #ccc',
              padding: '25px',
              background: 'white',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              zIndex: 1000,
              borderRadius: '8px',
              minWidth: '300px'
            }}
          >
            <h3 style={{ marginTop: 0 }}>Add Bin</h3>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
              Department: <strong>{selectedCorner?.department}</strong> - Corner: <strong>{selectedCorner?.position.toUpperCase()}</strong>
            </p>
            
            <input
              type="text"
              name="capacity"
              value={formData.capacity}
              onChange={handleInputChange}
              placeholder="Capacity (e.g., 120L)"
              style={{
                width: '100%',
                padding: '8px',
                margin: '5px 0',
                boxSizing: 'border-box',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />
            
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '8px',
                margin: '5px 0',
                boxSizing: 'border-box',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />
            
            <input
              type="file"
              name="image"
              onChange={handleInputChange}
              accept="image/*"
              style={{
                width: '100%',
                padding: '8px',
                margin: '5px 0',
                boxSizing: 'border-box'
              }}
            />
            
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <button
                onClick={saveBin}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Save
              </button>
              <button
                onClick={closePopup}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}