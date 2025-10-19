import React from 'react';
import { Certification, TimeOffRequest, Employee } from '../types';

interface HRProps {
    employees: Employee[];
    certifications: Certification[];
    timeOffRequests: TimeOffRequest[];
    setCertifications: (updateFn: (prev: Certification[]) => Certification[]) => void;
    setTimeOffRequests: (updateFn: (prev: TimeOffRequest[]) => TimeOffRequest[]) => void;
}

const HRPage: React.FC<HRProps> = ({ employees, certifications, timeOffRequests, setCertifications, setTimeOffRequests }) => {
    return (
        <div>
            <h1 className="text-2xl font-bold text-brand-navy-900">Human Resources</h1>
            <p className="mt-2 text-brand-navy-600">Manage employee certifications and time off requests.</p>

            <div className="mt-8">
                <h2 className="text-xl font-semibold text-brand-navy-900">Certifications</h2>
                <p className="mt-2 text-sm text-brand-navy-700">This section will allow you to track employee certifications.</p>
                {/* Certification management UI will go here */}
            </div>

            <div className="mt-8">
                <h2 className="text-xl font-semibold text-brand-navy-900">Time Off Requests</h2>
                <p className="mt-2 text-sm text-brand-navy-700">This section will allow you to manage employee time off.</p>
                {/* Time off management UI will go here */}
            </div>
        </div>
    );
};

export default HRPage;