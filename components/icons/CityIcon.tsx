
import React from 'react';

const CityIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path
      fillRule="evenodd"
      d="M.75 9.75a3 3 0 013-3h16.5a3 3 0 013 3v9a3 3 0 01-3 3H3.75a3 3 0 01-3-3v-9zm3-1.5a1.5 1.5 0 00-1.5 1.5v4.5h1.5V9.75a.75.75 0 01.75-.75h13.5a.75.75 0 01.75.75v4.5h1.5v-4.5a1.5 1.5 0 00-1.5-1.5H3.75z"
      clipRule="evenodd"
    />
  </svg>
);

export default CityIcon;
