import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Zap } from 'lucide-react';
import Button from '../ui/button';
import { useAuth } from '../../hooks/useAuth.js';
import { hasActiveGoal } from '../../services/aiLearningService';
import AnimatedTitle from '../ui/AnimatedTitle.jsx';

gsap.registerPlugin(ScrollTrigger);

const TYPEWRITER_TEXT = 'Ready to Transform Your Career?';

const CTASection = ({ className }) => {
  const container = useRef();
  // Typewriter state
  const [typed, setTyped] = useState('');
  const [isDone, setIsDone] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const badgeRef = useRef();
  const { isAuthenticated } = useAuth();

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
    if (badgeRef.current) observer.observe(badgeRef.current);
    return () => observer.disconnect();
  }, []);

  // Typewriter effect (only when in view)
  useEffect(() => {
    if (!isInView) return;
    if (typed.length < TYPEWRITER_TEXT.length) {
      const timeout = setTimeout(() => {
        setTyped(TYPEWRITER_TEXT.slice(0, typed.length + 1));
      }, 60);
      return () => clearTimeout(timeout);
    } else if (typed.length === TYPEWRITER_TEXT.length) {
      setIsDone(true);
    }
  }, [typed, isInView]);

  useGSAP(() => {
    // Background animation
    gsap.to('.cta-bg', {
      y: -50,
      ease: 'none',
      scrollTrigger: {
        trigger: container.current,
        start: 'top bottom',
        end: 'bottom top',
        scrub: true,
      },
    });

    // Content animation
    gsap.from('.cta-content', {
      opacity: 0,
      y: 50,
      duration: 1,
      scrollTrigger: {
        trigger: '.cta-content',
        start: 'top 80%',
        end: 'bottom 20%',
        toggleActions: 'play none none none',
      },
    });

    // Floating elements animation
    gsap.to('.floating-icon', {
      y: '-=20',
      duration: 3,
      ease: 'power2.inOut',
      yoyo: true,
      repeat: -1,
      stagger: 0.5
    });

    // Floating feature card icons animation
    gsap.to('.floating-feature-card', {
      y: '-=16',
      duration: 2.5,
      ease: 'power2.inOut',
      yoyo: true,
      repeat: -1,
      stagger: 0.3
    });

  }, { scope: container });

  return (
    <section ref={container} className={`relative py-16 md:py-24 overflow-hidden ${className}`}>
      {/* Animated Background */}
      <div className="cta-bg absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 via-purple-600 to-pink-600" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

        {/* Floating Elements */}
        <div className="floating-icon absolute top-20 left-20 text-white/20">
          <Sparkles className="w-16 h-16" />
        </div>
        <div className="floating-icon absolute top-32 right-32 text-white/20">
          <Zap className="w-12 h-12" />
        </div>
        <div className="floating-icon absolute bottom-32 left-1/4 text-white/20">
          <Sparkles className="w-20 h-20" />
        </div>
        <div className="floating-icon absolute bottom-20 right-20 text-white/20">
          <Zap className="w-14 h-14" />
        </div>
      </div>

      {/* Content */}
      <div className="cta-content relative z-10 container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto"
        >
          {/* Main Heading */}
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white font-poppins mb-6 leading-tight">
            Ready to Transform Your
            <br />
            <span className="bg-gradient-to-r from-yellow-300 to-white bg-clip-text text-transparent">
              Career Journey?
            </span>
          </h2>

          {/* Subheading */}
          <p className="text-xl md:text-2xl text-white/90 mb-12 max-w-2xl mx-auto leading-relaxed">
            Join thousands of learners who've already accelerated their careers.
            Start your personalized learning journey today.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link to={isAuthenticated ? (hasActiveGoal() ? "/learning-dashboard" : "/assessment") : "/auth"}>
              <button className="btn-primary btn-lg group">
                Start Free Trial
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
              </button>
            </Link>

            <button className="btn-secondary btn-lg group">
              Schedule Demo
            </button>
          </div>

          {/* Features List */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="floating-feature-card bg-[#181D24] backdrop-blur-sm rounded-2xl p-6 border border-white/20"
            >
              <div className="text-3xl mb-3">⚡</div>
              <h3 className="text-white font-semibold mb-2">Fast Track Learning</h3>
              <p className="text-white/80 text-sm">
                AI-powered personalized paths cut learning time by 60%
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="floating-feature-card bg-[#181D24] backdrop-blur-sm rounded-2xl p-6 border border-white/20"
            >
              <div className="text-3xl mb-3">🎯</div>
              <h3 className="text-white font-semibold mb-2">Career Focused</h3>
              <p className="text-white/80 text-sm">
                Real-world projects from industry leaders
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="floating-feature-card bg-[#181D24] backdrop-blur-sm rounded-2xl p-6 border border-white/20"
            >
              <div className="text-3xl mb-3">🏆</div>
              <h3 className="text-white font-semibold mb-2">Proven Results</h3>
              <p className="text-white/80 text-sm">
                95% of graduates advance their careers within 6 months
              </p>
            </motion.div>
          </div>

          {/* Trust Indicators */}
          <div className="mt-12 text-center">
            <p className="text-white/70 text-sm mb-6">
              Trusted by professionals from leading companies
            </p>
            <div className="flex justify-center items-center space-x-8 opacity-60">
              <div className="text-white font-bold text-lg">Google</div>
              <div className="text-white font-bold text-lg">Microsoft</div>
              <div className="text-white font-bold text-lg">Amazon</div>
              <div className="text-white font-bold text-lg">Netflix</div>
              <div className="text-white font-bold text-lg">Apple</div>
            </div>
          </div>

          {/* Urgency Note */}
          <div className="mt-8 text-center">
            <p className="text-white/90 text-sm">
              ⏰ <strong>Limited Time:</strong> Get 50% off your first month.
              <span className="underline ml-1">Offer ends soon!</span>
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection; 