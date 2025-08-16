import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import Card from '../ui/card';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import AnimatedTitle from '../ui/AnimatedTitle.jsx';

gsap.registerPlugin(ScrollTrigger);

const SPOTLIGHT_TEXT = '✨ Our Success Stories';

const achievers = [
  {
    id: 1,
    name: 'Adil',
    image: '/adil.png',
    achievement: 'ML Engineer at Microsoft',
    field: 'Data Science & AI',
    duration: '6 months',
    course: 'Advanced Machine Learning & AI',
    borderColor: 'from-purple-400 to-pink-400',
    textColor: 'text-purple-400',
    bgColor: 'from-purple-500/20 to-pink-500/20',
  },
  {
    id: 2,
    name: 'Dean',
    image: '/dean.png',
    achievement: 'Marketing Director at Meta',
    field: 'Digital Marketing',
    duration: '5 months',
    course: 'Digital Marketing & Growth Hacking',
    borderColor: 'from-green-400 to-emerald-400',
    textColor: 'text-green-400',
    bgColor: 'from-green-500/20 to-emerald-500/20',
  },
  {
    id: 3,
    name: 'Arjun',
    image: '/ellipse-308.png',
    achievement: 'Team Project Award',
    field: 'Collaboration',
    duration: '4 months',
    course: 'Agile Teamwork',
    borderColor: 'from-blue-400 to-cyan-400',
    textColor: 'text-blue-400',
    bgColor: 'from-blue-500/20 to-cyan-500/20',
  },
  {
    id: 4,
    name: 'Marina',
    image: '/marina.png',
    achievement: 'Senior Designer at Apple',
    field: 'UI/UX Design',
    duration: '3 months',
    course: 'Professional UI/UX Design Mastery',
    borderColor: 'from-pink-400 to-rose-400',
    textColor: 'text-pink-400',
    bgColor: 'from-pink-500/20 to-rose-500/20',
  },
  {
    id: 5,
    name: 'Nick',
    image: '/nick.png',
    achievement: 'Full Stack Developer at Google',
    field: 'Web Development',
    duration: '4 months',
    course: 'Complete Web Development Bootcamp',
    borderColor: 'from-blue-400 to-cyan-400',
    textColor: 'text-blue-400',
    bgColor: 'from-blue-500/20 to-cyan-500/20',
  },
];

const AchieversSection = () => {
  const [hovered, setHovered] = useState(null);
  const [typed, setTyped] = useState('');
  const [isDone, setIsDone] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const sectionRef = useRef();
  const gridRef = useRef();

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
        }
      },
      { threshold: 0.3 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  // Typewriter effect (only when in view)
  useEffect(() => {
    if (!isInView) return;
    if (typed.length < SPOTLIGHT_TEXT.length) {
      const timeout = setTimeout(() => {
        setTyped(SPOTLIGHT_TEXT.slice(0, typed.length + 1));
      }, 60);
      return () => clearTimeout(timeout);
    } else if (typed.length === SPOTLIGHT_TEXT.length) {
      setIsDone(true);
    }
  }, [typed, isInView]);

  // Scroll-driven sequential card animation (like FeaturesSection)
  useLayoutEffect(() => {
    const section = sectionRef.current;
    const grid = gridRef.current;
    if (!section || !grid) return;
    const cards = grid.querySelectorAll('.feature-card');
    const duration = 3;
    const totalCards = cards.length;
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: `+=${window.innerHeight * totalCards}`,
        pin: true,
        scrub: 1,
        anticipatePin: 1,
      }
    });
    cards.forEach((card, i) => {
      tl.fromTo(card,
        { opacity: 0, y: 80 },
        { opacity: 1, y: 0, duration, ease: 'power3.out' },
        i * duration
      );
    });
    return () => {
      ScrollTrigger.getAll().forEach(st => st.kill());
      gsap.globalTimeline.clear();
      document.querySelectorAll('.gsap-pin-spacer').forEach(el => el.remove());
    };
  }, []);

  return (
    <section ref={sectionRef} className="w-full py-16 sm:py-20 bg-[#111111]">
      <div className="container mx-auto px-4 sm:px-0">
        <div className="text-center mb-12 sm:mb-16">
          <AnimatedTitle 
            text={SPOTLIGHT_TEXT}
            fontSize="72px"
            fontWeight="900"
            className="mb-6"
          />
          <p className="text-lg sm:text-xl lg:text-2xl max-w-3xl mx-auto text-sky-700 dark:text-gray-300">
            Meet the amazing individuals who transformed their careers with our platform
          </p>
        </div>
        <div className="p-8 sm:p-16">
          <div ref={gridRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
            {achievers.slice(0, 4).map((achiever, index) => (
              <motion.div
                key={achiever.id}
                className="feature-card group relative flex flex-col items-center cursor-pointer snap-center min-w-[260px] max-w-[320px] w-[80vw] sm:w-[260px] md:w-[280px] lg:w-[320px]"
                whileHover={{ y: -5 }}
                onMouseEnter={() => setHovered(achiever.id)}
                onMouseLeave={() => setHovered(null)}
              >
                <motion.div
                  className="relative bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700 hover:border-cyan-500/50 transition-all duration-300 overflow-hidden flex flex-col items-center justify-between w-full h-full"
                  whileHover={{ y: -5 }}
                >
                  {/* Background Glow */}
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0" />
                  {/* Profile Image with Glow */}
                  <div className="relative mt-8 mb-2 flex items-center justify-center">
                    <div className="relative w-36 h-36 rounded-full border-4 border-white/30 z-10 bg-transparent shadow-[0_0_0_4px_rgba(31,38,135,0.12)]">
                      <img
                        src={achiever.image}
                        alt={achiever.name}
                        className="w-full h-full object-cover rounded-full bg-transparent"
                        onError={e => { e.target.src = '/default-avatar.png'; }}
                      />
                      {/* Animated Trophy Badge */}
                      <motion.div
                        className="absolute -top-3 -right-3 w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center shadow-lg border-2 border-white/60"
                        animate={{ rotate: hovered === achiever.id ? 20 : 0, scale: hovered === achiever.id ? 1.2 : 1 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <span className="text-xl">🏆</span>
                      </motion.div>
                    </div>
                  </div>
                  {/* Info (flip/expand on hover) */}
                  <motion.div
                    className="flex-1 w-full flex flex-col items-center justify-center text-center px-6 py-4 space-y-2 transition-all duration-500"
                    animate={{ y: hovered === achiever.id ? -10 : 0 }}
                  >
                    <h3
                      className={`font-bold text-2xl sm:text-3xl lg:text-4xl ${achiever.textColor} group-hover:scale-110 transition-transform duration-300`}
                    >
                      {achiever.name}
                    </h3>
                    <p className="font-semibold text-sm sm:text-base text-indigo-700 dark:text-white">
                      {achiever.achievement}
                    </p>
                    <div className="flex flex-col items-center justify-center gap-2 text-xs sm:text-sm text-sky-700 dark:text-gray-300">
                      <span className="px-3 py-1 bg-white/10 rounded-full backdrop-blur-sm font-medium text-indigo-700 dark:text-white">
                        {achiever.course}
                      </span>
                      <div className="flex gap-2">
                        <span className="px-2 py-1 bg-white/10 rounded-full backdrop-blur-sm text-sky-700 dark:text-gray-300">
                          {achiever.field}
                        </span>
                        <span className="px-2 py-1 bg-white/10 rounded-full backdrop-blur-sm text-sky-700 dark:text-gray-300">
                          {achiever.duration}
                        </span>
                      </div>
                    </div>
                    {/* Extra info on hover */}
                    {hovered === achiever.id && (
                      <motion.div
                        className="mt-3 flex flex-col items-center gap-2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                      >
                        <span className="text-xs text-gray-500 dark:text-gray-300 italic">Inspired by {achiever.name}'s journey!</span>
                        <div className="flex gap-3 mt-1">
                          {/* Social icons placeholder */}
                          <a href="#" className="text-blue-500 hover:text-blue-700" aria-label="LinkedIn"><svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-10h3v10zm-1.5-11.268c-.966 0-1.75-.784-1.75-1.75s.784-1.75 1.75-1.75 1.75.784 1.75 1.75-.784 1.75-1.75 1.75zm15.5 11.268h-3v-5.604c0-1.337-.025-3.063-1.868-3.063-1.868 0-2.154 1.459-2.154 2.967v5.7h-3v-10h2.881v1.367h.041c.401-.761 1.379-1.563 2.841-1.563 3.039 0 3.6 2.001 3.6 4.601v5.595z"/></svg></a>
                          <a href="#" className="text-gray-600 hover:text-gray-900" aria-label="Portfolio"><svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></a>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AchieversSection;