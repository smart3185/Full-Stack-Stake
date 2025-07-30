import React, { useEffect, useState } from 'react';

interface BannerProps {
  message: string;
  duration?: number; // in milliseconds
}

const Banner: React.FC<BannerProps> = ({ message, duration = 2000 }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  if (!visible) return null;

  return (
    <div
      className="banner-root"
      style={{
        position: 'fixed',
        top: '40px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        minWidth: '220px',
        maxWidth: '98vw',
        width: 'auto',
        padding: '0.7rem 1.2rem',
        background: 'rgba(34, 20, 50, 0.92)',
        color: '#fff8e1',
        fontWeight: 700,
        fontSize: '1rem',
        borderRadius: '1.2rem',
        boxShadow: '0 4px 24px 0 rgba(128,0,128,0.18), 0 1.5px 8px 0 rgba(255,215,0,0.18)',
        letterSpacing: '0.05em',
        textAlign: 'center',
        opacity: visible ? 1 : 0,
        border: '2px solid',
        borderImage: 'linear-gradient(90deg, #FFD700 0%, #A259FF 100%) 1',
        backdropFilter: 'blur(7px)',
        WebkitBackdropFilter: 'blur(7px)',
        transition: 'opacity 0.7s cubic-bezier(0.4,0,0.2,1), transform 0.7s cubic-bezier(0.4,0,0.2,1)',
        animation: 'bannerSlideIn 0.7s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.7rem',
        boxSizing: 'border-box',
        whiteSpace: 'nowrap',
        overflowX: 'auto',
      }}
    >
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #FFD700 0%, #A259FF 100%)',
        borderRadius: '50%',
        width: '1.7rem',
        height: '1.7rem',
        boxShadow: '0 0 10px #FFD70099, 0 0 8px #A259FF66',
        marginRight: '0.4rem',
        flex: '0 0 auto',
      }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6C3483" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4" /><path d="M12 16h.01" /></svg>
      </span>
      <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'auto', textOverflow: 'ellipsis' }}>{message}</span>
      <button
        onClick={() => setVisible(false)}
        style={{
          background: 'rgba(162,89,255,0.13)',
          border: 'none',
          color: '#FFD700',
          fontWeight: 900,
          fontSize: '1.1rem',
          borderRadius: '50%',
          width: '1.7rem',
          height: '1.7rem',
          cursor: 'pointer',
          marginLeft: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.2s',
          flex: '0 0 auto',
        }}
        aria-label="Close banner"
      >
        ×
      </button>
      <style>{`
        @media (max-width: 600px) {
          .banner-root {
            top: 12px !important;
            min-width: 120px !important;
            max-width: 98vw !important;
            font-size: 0.97rem !important;
            padding: 0.5rem 0.7rem !important;
            border-radius: 0.9rem !important;
            white-space: nowrap !important;
            overflow-x: auto !important;
          }
        }
        @keyframes bannerSlideIn {
          0% { opacity: 0; transform: translateX(-50%) translateY(-30px) scale(0.95); }
          100% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default Banner; 