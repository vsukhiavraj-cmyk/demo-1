import React from 'react';
import { Mic } from 'lucide-react';

const VoiceInput = ({ listening, onToggle }) => (
  <button
    onClick={onToggle}
    className={`p-2 rounded-lg ${
      listening ? 'bg-red-600' : 'bg-gray-700'
    } text-white hover:opacity-80 transition-colors`}
  >
    <Mic size={20} />
  </button>
);

export default VoiceInput; 