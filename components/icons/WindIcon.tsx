import React from 'react';

const WindIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 12c-4 0-4-4 0-4s4 4 0 4zm0 0c4 0 4 4 0 4s-4-4 0-4zm0 0c0-4-4-4-4 0s4 4 4 0zm0 0c0 4 4 4 4 0s-4-4-4 0z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 21V3" />
  </svg>
);

export default WindIcon;