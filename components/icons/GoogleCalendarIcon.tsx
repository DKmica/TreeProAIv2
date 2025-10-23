import React from 'react';

const GoogleCalendarIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 11h2v2H7v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2z" fill="#34a853"/>
        <path d="M5 21h14c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2h-2v2H7V5H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2zM19 7v2H5V7h14z" fill="#4285f4"/>
        <path d="M17 3v4h-2V3h-6v4H7V3H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-2z" fill="none"/>
        <path d="M7 15h2v2H7v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2z" fill="#fabb05"/>
    </svg>
);

export default GoogleCalendarIcon;