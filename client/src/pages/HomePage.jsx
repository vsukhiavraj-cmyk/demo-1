import React from "react";
import { motion } from "framer-motion";
import RevealHero from "../components/home/RevealHero";
import FeaturesSection from "../components/home/FeaturesSection";
import AchieversSection from "../components/home/AchieversSection";
import TestimonialsSection from "../components/home/TestimonialsSection";
import CTASection from "../components/home/CTASection";

const HomePage = () => {
  return (
    <div className="bg-[#111111]">
      {/* 1. Mask Text Animation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      >
        <RevealHero>
          <div className="absolute bottom-20 left-0 right-0 text-center text-white z-50 pointer-events-none">
            <h2 className="text-xl md:text-2xl lg:text-3xl font-bold font-poppins leading-tight">
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent drop-shadow-lg">
                Join the Learning Revolution
              </span>
            </h2>
          </div>
        </RevealHero>
      </motion.div>

      {/* 2. Ready to Transform Your Career Journey? */}
      <CTASection />

      {/* 3. Powerful Features for Modern Learning */}
      <FeaturesSection />

      {/* 4. Achievers Section */}
      <AchieversSection />

      {/* 5. Testimonials Section */}
      <TestimonialsSection />
    </div>
  );
};

export default HomePage;
