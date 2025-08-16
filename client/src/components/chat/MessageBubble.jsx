import React from 'react';
import { motion } from 'framer-motion';

const MessageBubble = ({ message }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
  >
    <div className={`px-3 py-2 rounded-lg max-w-xs ${
      message.sender === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-100'
    }`}>
      {message.text}
    </div>
  </motion.div>
);

export default MessageBubble; 