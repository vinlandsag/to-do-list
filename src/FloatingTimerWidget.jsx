import { useState, useRef } from 'react';

export default function FloatingTimerWidget({ timeLeft, isRunning, onToggle, onClick }) {
  const [position, setPosition] = useState({ 
    x: typeof window !== 'undefined' ? window.innerWidth - 220 : 0, 
    y: typeof window !== 'undefined' ? window.innerHeight - 120 : 0 
  });
  
  const isDragging = useRef(false);
  const hasDragged = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const widgetStartPos = useRef({ x: 0, y: 0 });

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handlePointerDown = (e) => {
    if (e.target.tagName.toLowerCase() === 'button') return;
    isDragging.current = true;
    hasDragged.current = false;
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    widgetStartPos.current = { ...position };
    e.target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    
    // Only register as a drag if moved more than 3px (prevents accidental click swallowing)
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasDragged.current = true;
    }

    let newX = widgetStartPos.current.x + dx;
    let newY = widgetStartPos.current.y + dy;
    
    // Clamp to viewport bounds (assuming approx widget size of 150x60)
    if (typeof window !== 'undefined') {
      newX = Math.max(0, Math.min(newX, window.innerWidth - 150));
      newY = Math.max(0, Math.min(newY, window.innerHeight - 60));
    }

    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e) => {
    isDragging.current = false;
    e.target.releasePointerCapture(e.pointerId);
  };

  const handleContainerClick = (e) => {
    if (hasDragged.current) return; // Don't trigger click if we just finished dragging
    onClick();
  };

  return (
    <div 
      className="floating-timer-widget"
      style={{ left: position.x, top: position.y }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleContainerClick}
    >
      <div className="drag-handle" style={{ pointerEvents: 'none' }}>⋮⋮</div>
      <div className="timer-info" style={{ pointerEvents: 'none' }}>
        <strong>{formatTime(timeLeft)}</strong>
        <span>Focusing</span>
      </div>
      <button className="icon-button" onClick={(e) => { e.stopPropagation(); onToggle(); }}>
        {isRunning ? '⏸' : '▶'}
      </button>
    </div>
  );
}
