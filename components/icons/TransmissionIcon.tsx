import React from 'react';

const TransmissionLineIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M14.25 6.088a.75.75 0 00-1.06-1.06l-6.061 6.06a.75.75 0 000 1.06l6.06 6.062a.75.75 0 101.06-1.061l-5.53-5.531 5.53-5.53z" />
    <path d="M19.5 6.088a.75.75 0 00-1.06-1.06l-6.061 6.06a.75.75 0 000 1.06l6.06 6.062a.75.75 0 101.06-1.061l-5.53-5.531 5.53-5.53z" />
  </svg>
);

export default TransmissionLineIcon;
