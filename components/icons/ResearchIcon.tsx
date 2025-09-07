import React from 'react';

const ResearchIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        fill="currentColor" 
        className={className}
    >
        <path d="M11.25 4.533A9.707 9.707 0 0 0 6 3a9.735 9.735 0 0 0-3.25.555.75.75 0 0 0-.5.707v14.5a.75.75 0 0 0 .5.707c.861.412 1.983.642 3.25.642 1.267 0 2.389-.23 3.25-.642a.75.75 0 0 0 .5-.707V5.24a.75.75 0 0 0-.5-.707z" />
        <path d="M12.75 4.533A9.707 9.707 0 0 1 18 3a9.735 9.735 0 0 1 3.25.555.75.75 0 0 1 .5.707v14.5a.75.75 0 0 1-.5.707c-.861.412-1.983.642-3.25.642-1.267 0-2.389-.23-3.25-.642a.75.75 0 0 1-.5-.707V5.24a.75.75 0 0 1 .5-.707z" />
    </svg>
);

export default ResearchIcon;