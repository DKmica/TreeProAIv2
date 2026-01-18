"use client";

import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CalendarCheck,
  Clock,
  DollarSign,
  TrendingUp,
} from "lucide-react";

const todayStats = [
  {
    title: "Jobs Scheduled",
    value: "4",
    icon: CalendarCheck,
    change: "+2 from yesterday",
  },
  {
    title: "Hours Logged",
    value: "12.5",
    icon: Clock,
    change: "3 crews active",
  },
  {
    title: "Revenue Today",
    value: "$4,250",
    icon: DollarSign,
    change: "+15% vs avg",
  },
  {
    title: "Pipeline Value",
    value: "$32,400",
    icon: TrendingUp,
    change: "8 active quotes",
  },
];

const upcomingJobs = [
  {
    id: 1,
    client: "Johnson Residence",
    service: "Oak Tree Removal",
    time: "8:00 AM",
    crew: "Alpha Crew",
    status: "On Site",
  },
  {
    id: 2,
    client: "City Park District",
    service: "Emergency Pruning",
    time: "10:30 AM",
    crew: "Beta Crew",
    status: "En Route",
  },
  {
    id: 3,
    client: "Martinez Property",
    service: "Stump Grinding",
    time: "1:00 PM",
    crew: "Alpha Crew",
    status: "Scheduled",
  },
  {
    id: 4,
    client: "Oak Valley HOA",
    service: "Lot Clearing",
    time: "2:30 PM",
    crew: "Charlie Crew",
    status: "Scheduled",
  },
];

const statusColors: Record<string, string> = {
  "On Site": "bg-green-500/20 text-green-400 border-green-500/30",
  "En Route": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Scheduled: "bg-muted text-muted-foreground border-border",
};

export default function TodayPage() {
  return (
    <div className="flex flex-col h-full">
      <Header
        title="Today"
        subtitle={new Date().toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      />

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {todayStats.map((stat) => (
            <Card key={stat.title} className="bg-card/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.change}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-card/50">
          <CardHeader>
            <CardTitle>Today's Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-border"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-sm font-medium w-20">{job.time}</div>
                    <div>
                      <div className="font-medium">{job.client}</div>
                      <div className="text-sm text-muted-foreground">
                        {job.service}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm text-muted-foreground">
                      {job.crew}
                    </div>
                    <Badge
                      variant="outline"
                      className={statusColors[job.status]}
                    >
                      {job.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
