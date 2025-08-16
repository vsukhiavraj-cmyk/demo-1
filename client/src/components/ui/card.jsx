import React from 'react';

const Card = React.forwardRef(({ children, className = '', ...props }, ref) => {
  return (
    <div ref={ref} className={`bg-white rounded-xl border border-gray-200 shadow-lg p-6 ${className}`} {...props}>
      {children}
    </div>
  );
});

Card.displayName = 'Card';

const CardContent = ({ children, className = '', ...props }) => {
  return (
    <div className={`${className}`} {...props}>
      {children}
    </div>
  );
};

export default Card;
export { Card, CardContent }; 