import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { Button } from '../ui/button';

const Timer = ({ time, running, onToggle, onStop }) => {
  const timerRef = useRef();

  useEffect(() => {
    if (running) {
      const tween = gsap.to(timerRef.current, {
        scale: 1.05,
        duration: 0.5,
        yoyo: true,
        repeat: -1,
      });
      return () => tween.kill();
    }
    gsap.to(timerRef.current, { scale: 1, duration: 0.3 });
  }, [running]);

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600).toString().padStart(2, '0');
    const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-white font-semibold">Timer</span>
        <motion.div ref={timerRef} className="text-2xl font-mono text-cyan-400">
          {formatTime(time)}
        </motion.div>
      </div>
      <div className="flex items-center gap-4">
        <Button onClick={onToggle} variant={running ? 'danger' : 'primary'}>
          {running ? 'Pause' : 'Start'}
        </Button>
        <Button variant="secondary" onClick={onStop}>Stop</Button>
      </div>
    </div>
  );
};

export default Timer; 