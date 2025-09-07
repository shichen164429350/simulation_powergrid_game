import React from 'react';

const SubstationIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    className={className}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h3m-6.75 3h9.75m-1.5 3h3m-6.75 3h9.75M12 21V3m-6.75 6.75L3 12l2.25 2.25M18.75 9.75L21 12l-2.25 2.25" />
  </svg>
);

export default SubstationIcon;
