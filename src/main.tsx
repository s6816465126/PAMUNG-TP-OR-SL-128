import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prevent Pinch-to-Zoom on iOS/iPad Safari while preserving full mouse wheel and touch scrolling
if (typeof document !== 'undefined') {
  // Prevent iOS Safari gesture zoom (Pinch In / Pinch Out)
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('gesturechange', (e) => e.preventDefault());
  document.addEventListener('gestureend', (e) => e.preventDefault());

  // Prevent Ctrl + Mousewheel zoom on trackpad/desktop (only if ctrlKey is pressed)
  window.addEventListener(
    'wheel',
    (e) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    },
    { passive: false }
  );

  // Prevent Ctrl + Keyboard zoom shortcuts (+, -, =)
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')) {
      e.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
