import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  Brain,
  Target,
  Users,
  TrendingUp,
  BookOpen,
  Award
} from 'lucide-react';
import api from '../../services/api.js';
import AnimatedTitle from '../ui/AnimatedTitle.jsx';

gsap.registerPlugin(ScrollTrigger);

const SPOTLIGHT_TEXT = 'Powerful Features for Modern Learning';

const FeaturesSection = ({ className }) => {
  const container = useRef();
  const titleRef = useRef();
  const featuresRef = useRef();

  // Spotlight Typewriter State
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
    if (container.current) observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  // Typewriter effect (only when in view)
  useEffect(() => {
    if (!isInView) return;
    if (typed.length < SPOTLIGHT_TEXT.length) {
      const timeout = setTimeout(() => {
        setTyped(SPOTLIGHT_TEXT.slice(0, typed.length + 1));
        setSpotlightPos(typed.length + 1);
      }, 60);
      return () => clearTimeout(timeout);
    } else if (typed.length === SPOTLIGHT_TEXT.length) {
      setIsDone(true);
    }
  }, [typed, isInView]);

  // Calculate spotlight position in px (estimate per char)
  const charWidth = 22; // px, adjust for font-size
  const spotlightX = 32 + (spotlightPos - 1) * charWidth;

  // Spotlight mask style
  const maskStyle = !isDone ? {
    WebkitMaskImage: `radial-gradient(circle 38px at ${spotlightX}px 50%, white 80%, transparent 100%)`,
    maskImage: `radial-gradient(circle 38px at ${spotlightX}px 50%, white 80%, transparent 100%)`,
    transition: 'WebkitMaskImage 0.1s, maskImage 0.1s',
  } : {};

  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Learning',
      description: 'Personalized learning paths powered by advanced AI algorithms that adapt to your learning style and pace.'
    },
    {
      icon: Target,
      title: 'Goal-Oriented Approach',
      description: 'Set clear learning objectives and track your progress with our intelligent goal-setting system.'
    },
    {
      icon: Users,
      title: 'Collaborative Learning',
      description: 'Connect with peers, join study groups, and learn together in our vibrant community.'
    },
    {
      icon: TrendingUp,
      title: 'Progress Analytics',
      description: 'Detailed insights into your learning journey with comprehensive analytics and performance metrics.'
    },
    {
      icon: BookOpen,
      title: 'Comprehensive Content',
      description: 'Access thousands of courses, tutorials, and resources across various domains and skill levels.'
    },
    {
      icon: Award,
      title: 'Certifications',
      description: 'Earn industry-recognized certificates and showcase your achievements to employers.'
    }
  ];

  // Pin section for all cards, animate each card in as you scroll
  useGSAP(() => {
    const section = container.current;
    const grid = featuresRef.current;
    if (!section || !grid) return;
    const cards = grid.querySelectorAll('.feature-card');
    const duration = 1;
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
        i * duration // ensures each card animates in its own scroll segment
      );
    });
    return () => {
      if (tl.scrollTrigger) tl.scrollTrigger.kill();
      tl.kill();
    };
  }, []);

  return (
    <section ref={container} className={`py-16 md:py-24 ${className}`} style={{ background: '#111' }}>
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <AnimatedTitle
            text={SPOTLIGHT_TEXT}
            fontSize="responsive"
            fontWeight="900"
            className="mb-6"
          />
          <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto">
            Discover the tools and technologies that make learning more effective,
            engaging, and personalized than ever before.
          </p>
        </div>

        {/* Features Grid */}
        <div ref={featuresRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              className="feature-card group relative bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700 hover:border-cyan-500/50 transition-all duration-300"
              whileHover={{ y: -5 }}
            >
              {/* Background Glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              {/* Icon */}
              <div className="feature-icon relative z-10 mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
              </div>
              {/* Content */}
              <div className="relative z-10">
                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-cyan-400 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-300 leading-relaxed">
                  {feature.description}
                </p>
              </div>
              {/* Hover Effect */}
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection; 