import React, { useRef, useState, useEffect } from 'react';

const AnimatedTitle = ({ 
  text, 
  className = '', 
  fontSize = 'responsive',
  fontWeight = '900'
}) => {
  const titleRef = useRef();
  const containerRef = useRef();
  
  // Typewriter animation state
  const [typed, setTyped] = useState('');
  const [spotlightPos, setSpotlightPos] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [isInView, setIsInView] = useState(false);

  // IntersectionObserver to trigger and reset typewriter
  useEffect(() => {
    const observer = new window.IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        } else {
          setIsInView(false);
          setTyped('');
          setIsDone(false);
          setSpotlightPos(0);
        }
      },
      { threshold: 0.3 }
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Typewriter effect (only when in view)
  useEffect(() => {
    if (!isInView) return;
    if (typed.length < text.length) {
      const timeout = setTimeout(() => {
        setTyped(text.slice(0, typed.length + 1));
        setSpotlightPos(typed.length + 1);
      }, 60);
      return () => clearTimeout(timeout);
    } else if (typed.length === text.length) {
      setIsDone(true);
    }
  }, [typed, isInView, text]);

  // Get responsive font size
  const getResponsiveFontSize = () => {
    if (fontSize === 'responsive') {
      // Use CSS clamp for fluid responsive sizing
      return 'clamp(1.5rem, 4vw, 4rem)'; // Min 24px, scales with viewport, max 64px
    }
    return fontSize;
  };

  // Calculate spotlight position in px (estimate per char) - responsive
  const getCharWidth = () => {
    if (typeof window !== 'undefined') {
      const screenWidth = window.innerWidth;
      if (screenWidth < 640) return 12; // sm screens
      if (screenWidth < 768) return 16; // md screens  
      if (screenWidth < 1024) return 20; // lg screens
      return 24; // xl+ screens
    }
    return 20; // default
  };
  
  const charWidth = getCharWidth();
  const spotlightX = 16 + (spotlightPos - 1) * charWidth;

  // Enhanced spotlight mask style with white bulb effect
  const maskStyle = !isDone ? {
    WebkitMaskImage: `radial-gradient(circle 50px at ${spotlightX}px 50%, white 90%, rgba(255,255,255,0.3) 95%, transparent 100%)`,
    maskImage: `radial-gradient(circle 50px at ${spotlightX}px 50%, white 90%, rgba(255,255,255,0.3) 95%, transparent 100%)`,
    transition: 'WebkitMaskImage 0.1s, maskImage 0.1s',
    // Add white glow effect around the spotlight
    boxShadow: `0 0 20px rgba(255,255,255,0.3), 0 0 40px rgba(255,255,255,0.1)`,
  } : {};

  return (
    <div ref={containerRef} className={className}>
      <h2
        ref={titleRef}
        className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-bold spotlight-typewriter whitespace-nowrap"
        style={{
          background: 'linear-gradient(90deg, #8E8E8E, #B4B4B4 50%, #D8D8D8 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: isDone 
            ? 'drop-shadow(0 0 16px #B4B4B4) drop-shadow(0 0 8px #8E8E8E)' 
            : 'blur(1.5px) brightness(0.7) drop-shadow(0 0 10px rgba(255,255,255,0.2))',
          transition: 'filter 0.3s',
          fontSize: getResponsiveFontSize(),
          fontWeight: fontWeight,
          fontFamily: 'Poppins, sans-serif',
          // Add white glow background during spotlight animation
          textShadow: !isDone ? `0 0 20px rgba(255,255,255,0.3), 0 0 40px rgba(255,255,255,0.1)` : 'none',
          ...maskStyle,
        }}
      >
        {typed}
      </h2>
    </div>
  );
};

export default AnimatedTitle;