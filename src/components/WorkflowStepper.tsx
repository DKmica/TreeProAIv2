import React from 'react';

export type WorkflowStage = 'lead' | 'quote' | 'job' | 'invoice' | 'paid';

interface WorkflowStepperProps {
  currentStage: WorkflowStage;
  status?: string;
}

const stages: { id: WorkflowStage; label: string }[] = [
  { id: 'lead', label: 'Lead' },
  { id: 'quote', label: 'Quote' },
  { id: 'job', label: 'Job' },
  { id: 'invoice', label: 'Invoice' },
  { id: 'paid', label: 'Paid' },
];

const WorkflowStepper: React.FC<WorkflowStepperProps> = ({ currentStage, status }) => {
  const currentIndex = stages.findIndex(s => s.id === currentStage);

  return (
    <div className="w-full py-6 px-4 bg-white border-b border-gray-200 mb-6">
      <nav aria-label="Progress">
        <ol role="list" className="flex items-center w-full">
          {stages.map((stage, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <li key={stage.label} className={`relative ${index !== stages.length - 1 ? 'flex-1' : ''}`}>
                {index !== stages.length - 1 && (
                  <div className="absolute top-4 left-0 right-0 flex items-center" aria-hidden="true">
                    <div className={`h-0.5 w-full ${isCompleted ? 'bg-green-600' : 'bg-gray-200'}`} />
                  </div>
                )}
                
                <div className="relative flex flex-col items-center group">
                  <span className="flex items-center h-9" aria-hidden="true">
                    {isCompleted ? (
                      <span className="relative z-10 w-8 h-8 flex items-center justify-center bg-green-600 rounded-full text-white font-bold">
                        ✓
                      </span>
                    ) : isCurrent ? (
                      <span className="relative z-10 w-8 h-8 flex items-center justify-center bg-white border-2 border-green-600 rounded-full">
                        <span className="h-2.5 w-2.5 bg-green-600 rounded-full animate-pulse" />
                      </span>
                    ) : (
                      <span className="relative z-10 w-8 h-8 flex items-center justify-center bg-white border-2 border-gray-300 rounded-full">
                        <span className="h-2.5 w-2.5 bg-transparent rounded-full" />
                      </span>
                    )}
                  </span>
                  <span className="mt-2 text-xs font-medium text-center">
                    <span className={isCurrent ? 'text-green-600 font-bold uppercase' : isCompleted ? 'text-gray-900' : 'text-gray-500'}>
                      {stage.label}
                    </span>
                    {isCurrent && status && (
                      <span className="block text-[10px] text-gray-400 mt-0.5">
                        {status}
                      </span>
                    )}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
};

export default WorkflowStepper;
