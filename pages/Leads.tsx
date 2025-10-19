import React, { useState, useMemo } from 'react';
import { Lead, Customer } from '../types';
import { supabase } from '../src/integrations/supabase/client';
import { useSession } from '../src/contexts/SessionContext';

const pipelineStages = ['New', 'Contacted', 'Qualified', 'Quote Sent', 'Won', 'Lost'];

const LeadCard: React.FC<{ lead: Lead; onDragStart: (e: React.DragEvent<HTMLDivElement>, leadId: string) => void }> = ({ lead, onDragStart }) => {
    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, lead.id)}
            className="p-3 mb-3 bg-white rounded-md shadow-sm border border-brand-navy-200 cursor-grab active:cursor-grabbing"
        >
            <p className="font-semibold text-sm text-brand-navy-800">{lead.customer?.name}</p>
            <p className="text-xs text-brand-navy-600">{lead.notes || 'No notes for this lead.'}</p>
            <div className="text-xs text-brand-navy-500 mt-2">Source: {lead.source}</div>
        </div>
    );
};

const PipelineColumn: React.FC<{
    stage: string;
    leads: Lead[];
    onDragStart: (e: React.DragEvent<HTMLDivElement>, leadId: string) => void;
    onDrop: (e: React.DragEvent<HTMLDivElement>, stage: string) => void;
}> = ({ stage, leads, onDragStart, onDrop }) => {
    const [isOver, setIsOver] = useState(false);

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsOver(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsOver(false);
    };
    
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        handleDragLeave(e);
        onDrop(e, stage);
    };

    return (
        <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`flex-1 min-w-[280px] bg-brand-navy-50 rounded-lg p-3 transition-colors ${isOver ? 'bg-brand-cyan-100' : ''}`}
        >
            <h3 className="font-bold text-brand-navy-800 mb-4">{stage} <span className="text-sm font-normal text-brand-navy-500">({leads.length})</span></h3>
            <div>
                {leads.map(lead => (
                    <LeadCard key={lead.id} lead={lead} onDragStart={onDragStart} />
                ))}
            </div>
        </div>
    );
};


const Leads: React.FC<{
    leads: Lead[];
    setLeads: (updateFn: (prev: Lead[]) => Lead[]) => void;
    customers: Customer[];
    setCustomers: (updateFn: (prev: Customer[]) => Customer[]) => void;
}> = ({ leads, setLeads, customers, setCustomers }) => {
    const { session } = useSession();

    const leadsByStage = useMemo(() => {
        const grouped: { [key: string]: Lead[] } = {};
        pipelineStages.forEach(stage => grouped[stage] = []);
        leads.forEach(lead => {
            const stage = lead.pipeline_stage || 'New';
            if (grouped[stage]) {
                grouped[stage].push(lead);
            }
        });
        return grouped;
    }, [leads]);

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, leadId: string) => {
        e.dataTransfer.setData('leadId', leadId);
    };

    const handleDrop = async (e: React.DragEvent<HTMLDivElement>, newStage: string) => {
        const leadId = e.dataTransfer.getData('leadId');
        if (!leadId) return;

        // Optimistic UI update
        const originalLeads = [...leads];
        setLeads(prevLeads => prevLeads.map(lead => 
            lead.id === leadId ? { ...lead, pipeline_stage: newStage } : lead
        ));

        // Update database
        const { error } = await supabase
            .from('leads')
            .update({ pipeline_stage: newStage })
            .eq('id', leadId);

        if (error) {
            alert(`Error updating lead: ${error.message}`);
            // Revert UI on failure
            setLeads(() => originalLeads);
        }
    };

  return (
    <div>
        <div className="sm:flex sm:items-center">
            <div className="sm:flex-auto">
                <h1 className="text-2xl font-bold text-brand-navy-900">Sales Pipeline</h1>
                <p className="mt-2 text-sm text-brand-navy-700">Drag and drop leads to manage your sales process.</p>
            </div>
            {/* Add Lead button can be added here */}
        </div>

        <div className="mt-6 flex space-x-4 overflow-x-auto pb-4">
            {pipelineStages.map(stage => (
                <PipelineColumn
                    key={stage}
                    stage={stage}
                    leads={leadsByStage[stage] || []}
                    onDragStart={handleDragStart}
                    onDrop={handleDrop}
                />
            ))}
        </div>
    </div>
  );
};

export default Leads;