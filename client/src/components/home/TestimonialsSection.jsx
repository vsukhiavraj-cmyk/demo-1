import React, { useRef, useState, useEffect, useLayoutEffect } from 'react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Star, Quote, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../../services/api.js';
import AnimatedTitle from '../ui/AnimatedTitle.jsx';

gsap.registerPlugin(ScrollTrigger);

const TYPEWRITER_TEXT = 'What Our Learners Say';

const TestimonialsSection = ({ className }) => {
  const container = useRef();
  const [currentSlide, setCurrentSlide] = useState(0);
  const headerRef = useRef();
  const statsGridRef = useRef();



  // GSAP sequential animation for stats cards with scroll-triggered reveal
  useLayoutEffect(() => {
    const grid = statsGridRef.current;
    if (!grid) return;
    const cards = grid.querySelectorAll('.testimonial-stats-card');
    
    // Create a timeline that animates cards sequentially based on scroll progress
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: grid,
        start: 'top 90%',
        end: 'bottom 60%',
        scrub: 1, // Smooth scrubbing animation
        onUpdate: (self) => {
          // Calculate which cards should be visible based on scroll progress
          const progress = self.progress;
          const totalCards = cards.length;
          const cardsToShow = Math.floor(progress * totalCards) + 1;
          
          cards.forEach((card, index) => {
            if (index < cardsToShow) {
              gsap.to(card, {
                opacity: 1,
                y: 0,
                scale: 1,
                duration: 0.3,
                ease: 'power2.out'
              });
            }
          });
        }
      }
    });

    // Set initial state
    gsap.set(cards, { opacity: 0, y: 50, scale: 0.9 });
    
    return () => {
      if (tl.scrollTrigger) tl.scrollTrigger.kill();
      tl.kill();
    };
  }, []);

  const testimonials = [
    {
      id: 1,
      name: 'Alex Rivera',
      role: 'Senior Software Engineer',
      company: 'Google',
      image: 'https://ui-avatars.com/api/?name=Alex+Rivera&background=0ea5e9&color=fff&size=100',
      content: 'The personalized learning paths helped me transition from a junior developer to a senior engineer in just 18 months. The AI-powered recommendations were spot-on!',
      rating: 5
    },
    {
      id: 2,
      name: 'Maria Garcia',
      role: 'Product Manager',
      company: 'Microsoft',
      image: 'https://ui-avatars.com/api/?name=Maria+Garcia&background=8b5cf6&color=fff&size=100',
      content: 'I love how the platform adapts to my learning style. The interactive content and real-world projects gave me the confidence to pivot my career successfully.',
      rating: 5
    },
    {
      id: 3,
      name: 'James Wilson',
      role: 'Data Scientist',
      company: 'Netflix',
      image: 'https://ui-avatars.com/api/?name=James+Wilson&background=10b981&color=fff&size=100',
      content: 'The comprehensive analytics helped me identify my weak areas and focus on improving them. The progress tracking kept me motivated throughout my journey.',
      rating: 5
    },
    {
      id: 4,
      name: 'Sarah Kim',
      role: 'UX Designer',
      company: 'Apple',
      image: 'https://ui-avatars.com/api/?name=Sarah+Kim&background=f59e0b&color=fff&size=100',
      content: 'The collaborative features allowed me to connect with other learners and mentors. The community support was invaluable during my career transition.',
      rating: 5
    },
    {
      id: 5,
      name: 'David Chen',
      role: 'DevOps Engineer',
      company: 'Amazon',
      image: 'https://ui-avatars.com/api/?name=David+Chen&background=ef4444&color=fff&size=100',
      content: 'From zero to hero in cloud technologies! The hands-on labs and real-world scenarios prepared me perfectly for my new role at Amazon.',
      rating: 5
    }
  ];

  useGSAP(() => {
    // Section entrance animation
    gsap.from('.testimonials-header', {
      opacity: 0,
      y: 50,
      duration: 1,
      scrollTrigger: {
        trigger: '.testimonials-header',
        start: 'top 80%',
        end: 'bottom 20%',
        toggleActions: 'play none none none',
      },
    });

    // Testimonial cards animation
    gsap.from('.testimonial-card', {
      opacity: 0,
      y: 30,
      duration: 0.8,
      stagger: 0.2,
      scrollTrigger: {
        trigger: '.testimonials-grid',
        start: 'top 80%',
        end: 'bottom 20%',
        toggleActions: 'play none none none',
      },
    });

  }, { scope: container });

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % testimonials.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section ref={container} className={`py-8 md:py-12 bg-[#1111111] ${className}`}>
      <div className="container mx-auto px-4">
        {/* Header */}
        <div ref={headerRef} className="testimonials-header text-center mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-4"
          >
            <AnimatedTitle 
              text={TYPEWRITER_TEXT}
              fontSize="48px"
              fontWeight="900"
              className="mb-2"
            />
          </motion.div>
          
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white font-poppins mb-6">
            Trusted by Thousands
          </h2>
          <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto">
            Don't just take our word for it. See what our community of learners 
            has to say about their transformative experiences.
          </p>
        </div>

        {/* Featured Testimonial */}
        <div className="relative mb-8">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl mx-auto"
          >
            <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-3xl p-8 md:p-12 border border-gray-700">
              <div className="flex items-start mb-6">
                <Quote className="text-cyan-400 w-12 h-12 mr-4 flex-shrink-0" />
                <div>
                  <p className="text-xl md:text-2xl text-white leading-relaxed mb-6">
                    "{testimonials[currentSlide].content}"
                  </p>
                  <div className="flex items-center">
                    <img
                      src={testimonials[currentSlide].image}
                      alt={testimonials[currentSlide].name}
                      className="w-16 h-16 rounded-full mr-4 border-2 border-cyan-500"
                      onError={(e) => {
                        e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(testimonials[currentSlide].name)}&background=0ea5e9&color=fff&size=100`;
                      }}
                    />
                    <div>
                      <h4 className="text-white font-semibold text-lg">
                        {testimonials[currentSlide].name}
                      </h4>
                      <p className="text-gray-300">
                        {testimonials[currentSlide].role} at {testimonials[currentSlide].company}
                      </p>
                      <div className="flex items-center mt-2">
                        {[...Array(testimonials[currentSlide].rating)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Navigation */}
          <div className="flex justify-center items-center mt-8 space-x-4">
            <button
              onClick={prevSlide}
              className="p-3 bg-gray-800 hover:bg-gray-700 text-white rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            
            <div className="flex space-x-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentSlide ? 'bg-cyan-400' : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
            
            <button
              onClick={nextSlide}
              className="p-3 bg-gray-800 hover:bg-gray-700 text-white rounded-full transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Testimonials Grid */}
        <div className="testimonials-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.slice(0, 3).map((testimonial, index) => (
            <motion.div
              key={testimonial.id}
              className="testimonial-card bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 hover:border-cyan-500/50 transition-all duration-300"
              whileHover={{ y: -5 }}
            >
              <div className="flex items-center mb-4">
                <img
                  src={testimonial.image}
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full mr-4 border-2 border-cyan-500"
                  onError={(e) => {
                    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(testimonial.name)}&background=0ea5e9&color=fff&size=100`;
                  }}
                />
                <div>
                  <h4 className="text-white font-semibold">{testimonial.name}</h4>
                  <p className="text-gray-400 text-sm">{testimonial.role}</p>
                  <div className="flex items-center mt-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 text-yellow-400 fill-current" />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-gray-300 leading-relaxed">
                "{testimonial.content}"
              </p>
            </motion.div>
          ))}
        </div>

        {/* Bottom Stats */}
        <div ref={statsGridRef} className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="testimonial-stats-card feature-card group relative bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700 transition-all duration-300 text-white">
            <div className="text-3xl md:text-4xl font-bold text-cyan-400 mb-2">4.9/5</div>
            <div className="text-white font-semibold mb-1">Average Rating</div>
            <div className="text-white text-sm">From 10,000+ reviews</div>
          </div>
          <div className="testimonial-stats-card feature-card group relative bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700 transition-all duration-300 text-white">
            <div className="text-3xl md:text-4xl font-bold text-cyan-400 mb-2">95%</div>
            <div className="text-white font-semibold mb-1">Success Rate</div>
            <div className="text-white text-sm">Career advancement</div>
          </div>
          <div className="testimonial-stats-card feature-card group relative bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-700 transition-all duration-300 text-white">
            <div className="text-3xl md:text-4xl font-bold text-cyan-400 mb-2">50K+</div>
            <div className="text-white font-semibold mb-1">Active Learners</div>
            <div className="text-white text-sm">Worldwide community</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection; 