import React from 'react';

const DistributionLineIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path fillRule="evenodd" d="M12 3.75a.75.75 0 01.75.75v15a.75.75 0 01-1.5 0V4.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
    <path fillRule="evenodd" d="M12.75 6a.75.75 0 00-1.5 0v.5a.75.75 0 001.5 0v-.5zM12 17.25a.75.75 0 01.75.75v.5a.75.75 0 01-1.5 0v-.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
    <path fillRule="evenodd" d="M12.75 11.25a.75.75 0 00-1.5 0v.5a.75.75 0 001.5 0v-.5z" clipRule="evenodd" />
  </svg>
);

export default DistributionLineIcon;
