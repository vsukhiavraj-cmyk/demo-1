import React from 'react';
import { motion } from 'framer-motion';

const Button = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  ...props
}) => {
  // Use the new CSS classes from the design system
  const getButtonClasses = () => {
    const variantClass = `btn-${variant}`;
    const sizeClass = `btn-${size}`;
    return `${variantClass} ${sizeClass} ${className}`;
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={getButtonClasses()}
      {...props}
    >
      <span className="relative z-10">{children}</span>
    </motion.button>
  );
};

export default Button;
export { Button }; 