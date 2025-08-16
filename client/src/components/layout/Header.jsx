import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, User, LogOut } from 'lucide-react';
import Button from '../ui/Button';

const Header = ({ user, isAuthenticated, handleLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Update scrolled state for styling
      setScrolled(currentScrollY > 50);

      // Hide/show navbar based on scroll direction
      if (currentScrollY < 10) {
        // Always show at top of page
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down and past threshold - hide navbar
        setIsVisible(false);
        setIsMenuOpen(false); // Close mobile menu when hiding
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up - show navbar
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const navItems = [
    { name: 'Home', path: '/' },
    ...(isAuthenticated ? [
      { name: 'Dashboard', path: '/dashboard' },
      { name: 'Tasks', path: '/tasks' },
      { name: 'Learning', path: '/learning-dashboard' }
    ] : []),
    { name: 'About', path: '/about' }
  ];

  const headerVariants = {
    visible: {
      y: 0,
      opacity: 1,
      backgroundColor: scrolled ? 'rgb(17, 17, 17)' : 'rgb(17,17,17)',
      borderBottom: scrolled ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(255, 255, 255, 0)',
      transition: { duration: 0.3, ease: 'easeInOut' }
    },
    hidden: {
      y: '-100%',
      opacity: 0,
      backgroundColor: 'rgb(17, 17, 17)',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      transition: { duration: 0.3, ease: 'easeInOut' }
    }
  };

  return (
    <motion.header
      initial="visible"
      animate={isVisible ? "visible" : "hidden"}
      variants={headerVariants}
      className={
        `fixed top-0 left-0 w-full z-50 bg-[#111111] ${scrolled ? 'shadow-lg' : ''}`
      }
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">IL</span>
            </div>
            <span className="text-white font-bold text-xl">Infinite Learning</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={
                  location.pathname === item.path
                    ? 'px-4 py-2 rounded bg-white text-black font-bold shadow-sm transition-colors duration-200'
                    : 'px-4 py-2 rounded text-white hover:bg-white/10 transition-colors duration-200'
                }
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <User className="w-5 h-5 text-gray-400" />
                  <span className="text-white text-sm">{user?.username}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-gray-300 hover:text-white"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </div>
            ) : (
              <Link to="/auth">
                <Button variant="primary" size="sm">
                  Get Started
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-white p-2"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-gray-900 border-t border-gray-800"
          >
            <div className="container mx-auto px-4 py-4">
              <nav className="flex flex-col space-y-4">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={
                      location.pathname === item.path
                        ? 'px-4 py-2 rounded bg-white text-black font-bold shadow-sm transition-colors duration-200'
                        : 'px-4 py-2 rounded text-white hover:bg-white/10 transition-colors duration-200'
                    }
                  >
                    {item.name}
                  </Link>
                ))}

                {isAuthenticated ? (
                  <div className="pt-4 border-t border-gray-800">
                    <div className="flex items-center space-x-2 mb-4">
                      <User className="w-5 h-5 text-gray-400" />
                      <span className="text-white text-sm">{user?.username}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleLogout}
                      className="text-gray-300 hover:text-white w-full justify-start"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                ) : (
                  <div className="pt-4 border-t border-gray-800">
                    <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="primary" size="sm" className="w-full">
                        Get Started
                      </Button>
                    </Link>
                  </div>
                )}
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};

export default Header; 