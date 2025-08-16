import React, { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger);

const RevealHero = ({ children }) => {
  const componentRef = useRef(null);
  const triggerRef = useRef(null);
  const videoMaskRef = useRef(null);
  const overlayRef = useRef(null);
  const contentRef = useRef(null);

  useGSAP(() => {
    gsap.set(overlayRef.current, { opacity: 0 });

    // Pin the hero section and immediately show overlay as soon as scroll starts
    const overlayTimeline = gsap.timeline({
      scrollTrigger: {
        trigger: componentRef.current,
        start: 'top top',
        end: '+=50%', // Unpin as soon as mask text is fully small
        scrub: true,
        pin: true,
        anticipatePin: 1,
      },
    });
  }, { scope: componentRef });

  useGSAP(() => {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: triggerRef.current,
        start: 'top top',
        end: '+=600',
        scrub: 1.2,
        pin: true,
      },
    });

    // 1. Fade in the solid overlay as you scroll
    tl.fromTo(overlayRef.current,
      { opacity: 0 },
      { opacity: 1, ease: 'power5.inOut', duration: 5 },
      0
    );

    // 2. Animate the mask to scale down and become visible as overlay fades in
    tl.fromTo(videoMaskRef.current,
      { scale: 20, opacity: 0 },
      { scale: 1, opacity: 1, ease: 'power5.inOut', duration: 5 },
      0
    )
    .to(videoMaskRef.current, {
      opacity: 0,
      ease: 'power1.in',
      duration: 1.2
    });
  }, { scope: componentRef });

  return (
    <section ref={componentRef} className="relative w-full h-screen overflow-hidden bg-[#111111]">
      {/* 1. Background video always visible in hero section */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover z-0 "
        style={{ pointerEvents: 'none' }}
      >
        <source src="/videos/infinite-learning-bg.mp4" type="video/mp4" />
      </video>

      {/* 2. Overlay and mask perfectly overlapped */}
      <div className="absolute inset-0 w-full h-full pointer-events-none z-10">
        {/* Overlay fills the section */}
        <div
          ref={overlayRef}
          className="absolute inset-0 w-full h-full bg-[#111111]  duration-90 ease-in-out"
          style={{ opacity: 1 }}
        />
        {/* Mask sits above overlay, video only visible through mask */}
        <div
          ref={videoMaskRef}
          className="text-mask-container absolute inset-0 flex items-center justify-center"
          style={{ opacity: 0 }}
        >
          <video
            autoPlay
            muted
            loop
            playsInline
            className="inset-0 w-full h-full object-cover "
            style={{ pointerEvents: 'none' }}
          >
            <source src="/videos/infinite-learning-bg.mp4" type="video/mp4" />
          </video>
        </div>
      </div>

      {/* Hero content (children) */}
      <div ref={contentRef} className="relative z-30 w-full h-full flex items-center justify-center">
        {children}
      </div>
    </section>
  );
};

export default RevealHero; 