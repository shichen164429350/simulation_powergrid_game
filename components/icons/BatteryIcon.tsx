import React from 'react';

const BatteryIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path
      fillRule="evenodd"
      d="M7.5 6v.75H5.513c-.96 0-1.763.746-1.858 1.705l-.123 1.233c-.044.44-.225.86-.52 1.212l-.298.358a.75.75 0 00.298 1.212l.298.358c.295.353.476.772.52 1.212l.123 1.233c.095.959.898 1.705 1.858 1.705H7.5V18h9v-.75h2.013c.96 0 1.763-.746 1.858-1.705l.123-1.233c.044-.44.225-.86.52-1.212l.298-.358a.75.75 0 00-.298-1.212l-.298-.358a2.647 2.647 0 01-.52-1.212l-.123-1.233A1.875 1.875 0 0018.513 6.75H16.5V6h-9z"
      clipRule="evenodd"
    />
    <path d="M9 9h6v6H9V9z" />
  </svg>
);

export default BatteryIcon;
