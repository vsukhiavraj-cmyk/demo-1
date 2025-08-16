import React, { useRef, useState, useEffect, useLayoutEffect } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Link } from 'react-router-dom';
import {
  Users,
  Target,
  Award,
  BookOpen,
  Heart,
  Globe,
  Zap,
  CheckCircle
} from 'lucide-react';
import AnimatedTitle from '../components/ui/AnimatedTitle.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { hasActiveGoal } from '../services/aiLearningService';

gsap.registerPlugin(ScrollTrigger);

const TYPEWRITER_TEXT = 'About Infinite Learning';

const AboutPage = () => {
  const container = useRef();
  const { isAuthenticated } = useAuth();
  // Typewriter state
  const [typed, setTyped] = useState('');
  const [isDone, setIsDone] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const badgeRef = useRef();
  const statsSectionRef = useRef();
  const statsGridRef = useRef();
  const valuesSectionRef = useRef();
  const valuesGridRef = useRef();
  const [statsCardsReady, setStatsCardsReady] = useState(false);

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

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
    // Animate sections on scroll
    const sections = gsap.utils.toArray('.section-animate');
    sections.forEach((section) => {
      gsap.from(section, {
        opacity: 0,
        y: 50,
        duration: 1,
        scrollTrigger: {
          trigger: section,
          start: 'top 80%',
          end: 'bottom 20%',
          toggleActions: 'play none none none',
        },
      });
    });

    // Animate stats
    gsap.from('.stat-item', {
      opacity: 0,
      y: 30,
      stagger: 0.2,
      duration: 0.8,
      scrollTrigger: {
        trigger: '.stats-section',
        start: 'top 80%',
        end: 'bottom 20%',
        toggleActions: 'play none none none',
      },
    });

  }, { scope: container });

  // Pin and animate stats cards like FeaturesSection, pin the whole section
  useLayoutEffect(() => {
    const section = statsSectionRef.current;
    const grid = statsGridRef.current;
    if (!section || !grid) return;
    const cards = grid.querySelectorAll('.about-stats-card');
    const duration = 1;
    const totalCards = cards.length;
    // Set initial state for all cards
    gsap.set(cards, { opacity: 0, y: 80 });
    setStatsCardsReady(true); // Now safe to show cards
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: `+=${window.innerHeight * totalCards * 1.2}`,
        pin: section,
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
      if (tl.scrollTrigger) tl.scrollTrigger.kill();
      tl.kill();
    };
  }, []);

  // Pin and animate value cards like FeaturesSection, but pin the whole section
  useLayoutEffect(() => {
    const section = valuesSectionRef.current;
    const grid = valuesGridRef.current;
    if (!section || !grid) return;
    const cards = grid.querySelectorAll('.about-value-card');
    const duration = 1;
    const totalCards = cards.length;
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: `+=${window.innerHeight * totalCards * 1.5}`,
        pin: section,
        scrub: 1.2,
        anticipatePin: 1,
      }
    });
    cards.forEach((card, i) => {
      tl.fromTo(card,
        { opacity: 0, y: 80 },
        { opacity: 1, y: 0, duration, ease: 'power3.out' },
        i * duration * 1.2
      );
    });
    return () => {
      if (tl.scrollTrigger) tl.scrollTrigger.kill();
      tl.kill();
    };
  }, []);

  const stats = [
    { icon: Users, number: '50K+', label: 'Active Learners' },
    { icon: BookOpen, number: '1000+', label: 'Courses Available' },
    { icon: Award, number: '95%', label: 'Success Rate' },
    { icon: Globe, number: '180+', label: 'Countries Served' }
  ];

  const features = [
    {
      icon: Target,
      title: 'Personalized Learning',
      description: 'AI-powered recommendations tailored to your learning style and goals.'
    },
    {
      icon: Zap,
      title: 'Real-time Progress',
      description: 'Track your advancement with detailed analytics and insights.'
    },
    {
      icon: Users,
      title: 'Community Support',
      description: 'Connect with peers and mentors in our vibrant learning community.'
    },
    {
      icon: Award,
      title: 'Industry Recognition',
      description: 'Earn certificates that are valued by top employers worldwide.'
    }
  ];

  const values = [
    {
      title: 'Innovation',
      description: 'We constantly push the boundaries of educational technology.'
    },
    {
      title: 'Accessibility',
      description: 'Quality education should be available to everyone, everywhere.'
    },
    {
      title: 'Excellence',
      description: 'We maintain the highest standards in content and delivery.'
    },
    {
      title: 'Community',
      description: 'Learning is better when we support each other.'
    }
  ];

  return (
    <div className="bg-[#11111] min-h-screen w-full">
      <motion.div
        ref={container}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="relative min-h-screen"
      >
        {/* Video Background */}


        {/* Content */}
        <div className="relative z-10">
          {/* Hero Section */}
          <section className="section-animate py-20 px-4">
            <div className="container mx-auto text-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="mb-8"
                ref={badgeRef}
              >
                <AnimatedTitle 
                  text={TYPEWRITER_TEXT}
                  fontSize="48px"
                  fontWeight="900"
                  className="mb-6"
                />
              </motion.div>

              <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 font-poppins">
                Transforming Education
                <br />
                <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                  One Learner at a Time
                </span>
              </h1>

              <p className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
                We believe that everyone deserves access to world-class education.
                Our AI-powered platform makes learning personalized, engaging, and effective.
              </p>
            </div>
          </section>

          {/* Stats Section */}
          <section ref={statsSectionRef} className="stats-section section-animate py-16 px-4">
            <div className="container mx-auto">
              <div ref={statsGridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {stats.map((stat, index) => (
                  <motion.div
                    key={index}
                    className="about-stats-card stat-item text-center bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700"
                    whileHover={{ scale: 1.05 }}
                    style={!statsCardsReady ? { opacity: 0, transform: 'translateY(80px)' } : undefined}
                  >
                    <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <stat.icon className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-4xl font-bold text-cyan-400 mb-2">{stat.number}</div>
                    <div className="text-gray-300 font-medium">{stat.label}</div>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* Mission Section */}
          <section className="section-animate py-16 px-4">
            <div className="container mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div>
                  <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                    Our Mission
                  </h2>
                  <p className="text-lg text-gray-300 mb-6 leading-relaxed">
                    At Infinite Learning, we're on a mission to democratize education and make
                    world-class learning accessible to everyone, regardless of their background,
                    location, or circumstances.
                  </p>
                  <p className="text-lg text-gray-300 mb-8 leading-relaxed">
                    We leverage cutting-edge AI technology to create personalized learning
                    experiences that adapt to each individual's pace, style, and goals.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2 text-cyan-400">
                      <CheckCircle size={20} />
                      <span>Personalized Learning Paths</span>
                    </div>
                    <div className="flex items-center gap-2 text-cyan-400">
                      <CheckCircle size={20} />
                      <span>Industry-Recognized Certificates</span>
                    </div>
                    <div className="flex items-center gap-2 text-cyan-400">
                      <CheckCircle size={20} />
                      <span>24/7 Community Support</span>
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <div className="bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-3xl p-8 backdrop-blur-sm border border-gray-700">
                    <div className="grid grid-cols-2 gap-6">
                      {features.map((feature, index) => (
                        <div key={index} className="text-center">
                          <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg flex items-center justify-center mx-auto mb-3">
                            <feature.icon className="w-6 h-6 text-white" />
                          </div>
                          <h3 className="text-white font-semibold mb-2">{feature.title}</h3>
                          <p className="text-gray-300 text-sm">{feature.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Values Section */}
          <section ref={valuesSectionRef} className="section-animate py-16 px-4">
            <div className="container mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                  Our Values
                </h2>
                <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                  These core principles guide everything we do and shape our commitment
                  to transforming education.
                </p>
              </div>
              <div ref={valuesGridRef} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {values.map((value, index) => (
                  <motion.div
                    key={index}
                    className="about-value-card bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700 hover:border-cyan-500/50 transition-colors"
                    whileHover={{ y: -5 }}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-3 h-3 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full"></div>
                      <h3 className="text-2xl font-bold text-white">{value.title}</h3>
                    </div>
                    <p className="text-gray-300 leading-relaxed">{value.description}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="section-animate py-16 px-4">
            <div className="container mx-auto text-center">
              <div className="bg-gradient-to-r from-cyan-600 to-purple-600 rounded-3xl p-12 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20"></div>
                <div className="relative z-10">
                  <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                    Ready to Start Your Journey?
                  </h2>
                  <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
                    Join thousands of learners who have transformed their careers
                    with our personalized learning platform.
                  </p>
                  <Link to={isAuthenticated ? (hasActiveGoal() ? "/learning-dashboard" : "/assessment") : "/auth"}>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="btn-primary btn-lg"
                    >
                      Get Started Today
                    </motion.button>
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>
      </motion.div>
    </div>
  );
};

export default AboutPage; 