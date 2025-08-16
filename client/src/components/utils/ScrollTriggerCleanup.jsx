import { useLocation } from 'react-router-dom';
import { useLayoutEffect } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

export default function ScrollTriggerCleanup() {
  const location = useLocation();
  useLayoutEffect(() => {
    // Clean up all ScrollTriggers before DOM unmount
    ScrollTrigger.getAll().forEach(st => st.kill());
    // Optionally, also clear inline styles left by pinning
    document.querySelectorAll('[style*="transform"]').forEach(el => {
      el.style.transform = '';
    });
  }, [location]);
  return null;
} 