import React, { useRef } from 'react';

const FileUpload = ({ onChange, disabled, acceptedTypes = '.pdf,.doc,.docx,.xlsx,.xls,.csv' }) => {
  const inputRef = useRef();

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) {
      onChange(e.dataTransfer.files[0]);
    }
  };

  const getAcceptedTypesText = () => {
    if (acceptedTypes.includes('.pdf') && acceptedTypes.includes('.xlsx')) {
      return 'Supports PDF, Word, Excel';
    } else if (acceptedTypes.includes('.pdf')) {
      return 'Supports PDF files only';
    } else if (acceptedTypes.includes('.xlsx')) {
      return 'Supports Excel files only';
    }
    return 'Supports PDF, Word, Excel';
  };

  return (
    <div
      className={`border-2 border-dashed border-gray-600 rounded-lg p-8 text-center transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-cyan-500 cursor-pointer'
        }`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current.click()}
    >
      <input
        type="file"
        ref={inputRef}
        className="hidden"
        onChange={(e) => onChange(e.target.files[0])}
        disabled={disabled}
        accept={acceptedTypes}
      />
      <div className="text-4xl mb-4">📁</div>
      <p className="text-gray-300 mb-2">
        {disabled ? 'Uploading...' : 'Drop your file here or click to browse'}
      </p>
      <p className="text-gray-500 text-sm">{getAcceptedTypesText()}</p>
    </div>
  );
};

export default FileUpload; 