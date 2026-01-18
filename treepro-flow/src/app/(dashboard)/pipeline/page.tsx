"use client";

import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

type Stage = "LEAD" | "QUOTE" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETE" | "INVOICED" | "PAID" | "LOST";

interface WorkItem {
  id: string;
  title: string;
  client: string;
  value: number;
  stage: Stage;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  daysInStage: number;
}

const stages: { key: Stage; label: string; color: string }[] = [
  { key: "LEAD", label: "Leads", color: "bg-blue-500" },
  { key: "QUOTE", label: "Quoting", color: "bg-yellow-500" },
  { key: "SCHEDULED", label: "Scheduled", color: "bg-purple-500" },
  { key: "IN_PROGRESS", label: "In Progress", color: "bg-orange-500" },
  { key: "COMPLETE", label: "Complete", color: "bg-green-500" },
  { key: "INVOICED", label: "Invoiced", color: "bg-cyan-500" },
  { key: "PAID", label: "Paid", color: "bg-emerald-500" },
  { key: "LOST", label: "Lost", color: "bg-red-500" },
];

const mockWorkItems: WorkItem[] = [
  {
    id: "1",
    title: "Large Oak Removal",
    client: "Johnson Family",
    value: 4500,
    stage: "LEAD",
    priority: "HIGH",
    daysInStage: 2,
  },
  {
    id: "2",
    title: "Storm Damage Cleanup",
    client: "City of Oakville",
    value: 8200,
    stage: "LEAD",
    priority: "URGENT",
    daysInStage: 0,
  },
  {
    id: "3",
    title: "Annual Pruning Contract",
    client: "Riverside HOA",
    value: 12000,
    stage: "QUOTE",
    priority: "MEDIUM",
    daysInStage: 5,
  },
  {
    id: "4",
    title: "Stump Grinding (5 stumps)",
    client: "Martinez Residence",
    value: 1200,
    stage: "QUOTE",
    priority: "LOW",
    daysInStage: 3,
  },
  {
    id: "5",
    title: "Tree Planting - 10 Maples",
    client: "Green Valley Park",
    value: 3500,
    stage: "SCHEDULED",
    priority: "MEDIUM",
    daysInStage: 1,
  },
  {
    id: "6",
    title: "Emergency Branch Removal",
    client: "Wilson Property",
    value: 800,
    stage: "IN_PROGRESS",
    priority: "HIGH",
    daysInStage: 0,
  },
  {
    id: "7",
    title: "Lot Clearing - Phase 1",
    client: "Summit Developers",
    value: 15000,
    stage: "IN_PROGRESS",
    priority: "MEDIUM",
    daysInStage: 4,
  },
  {
    id: "8",
    title: "Pine Tree Removal",
    client: "Anderson Home",
    value: 2800,
    stage: "COMPLETE",
    priority: "MEDIUM",
    daysInStage: 1,
  },
  {
    id: "9",
    title: "Hedge Trimming Service",
    client: "Thompson Estate",
    value: 1800,
    stage: "INVOICED",
    priority: "LOW",
    daysInStage: 3,
  },
  {
    id: "10",
    title: "Tree Health Assessment",
    client: "Maple Grove HOA",
    value: 650,
    stage: "INVOICED",
    priority: "MEDIUM",
    daysInStage: 5,
  },
  {
    id: "11",
    title: "Spring Cleanup Package",
    client: "Patterson Family",
    value: 2200,
    stage: "PAID",
    priority: "MEDIUM",
    daysInStage: 2,
  },
  {
    id: "12",
    title: "Dead Tree Removal",
    client: "Wilson Farms",
    value: 3800,
    stage: "PAID",
    priority: "HIGH",
    daysInStage: 1,
  },
  {
    id: "13",
    title: "Commercial Lot Bid",
    client: "ABC Developers",
    value: 25000,
    stage: "LOST",
    priority: "HIGH",
    daysInStage: 10,
  },
];

const priorityColors: Record<string, string> = {
  LOW: "bg-slate-500/20 text-slate-400",
  MEDIUM: "bg-blue-500/20 text-blue-400",
  HIGH: "bg-orange-500/20 text-orange-400",
  URGENT: "bg-red-500/20 text-red-400",
};

export default function PipelinePage() {
  const [workItems] = useState(mockWorkItems);

  const getItemsByStage = (stage: Stage) =>
    workItems.filter((item) => item.stage === stage);

  const getStageValue = (stage: Stage) =>
    getItemsByStage(stage).reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Pipeline"
        subtitle="Track opportunities from lead to completion"
        action={{
          label: "New Lead",
          onClick: () => console.log("Create new lead"),
        }}
      />

      <div className="flex-1 p-6 overflow-x-auto">
        <div className="flex gap-4 min-w-max h-full">
          {stages.map((stage) => (
            <div
              key={stage.key}
              className="w-72 flex flex-col bg-card/30 rounded-lg border border-border"
            >
              <div className="p-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                  <span className="font-medium text-sm">{stage.label}</span>
                  <Badge variant="secondary" className="text-xs">
                    {getItemsByStage(stage.key).length}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  ${getStageValue(stage.key).toLocaleString()}
                </span>
              </div>

              <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                {getItemsByStage(stage.key).map((item) => (
                  <Card
                    key={item.id}
                    className="cursor-pointer hover:border-primary/50 transition-colors bg-card"
                  >
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium text-sm leading-tight">
                          {item.title}
                        </h4>
                        <Badge
                          variant="secondary"
                          className={`text-xs ${priorityColors[item.priority]}`}
                        >
                          {item.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.client}
                      </p>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-primary">
                          ${item.value.toLocaleString()}
                        </span>
                        <span className="text-muted-foreground">
                          {item.daysInStage}d in stage
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
