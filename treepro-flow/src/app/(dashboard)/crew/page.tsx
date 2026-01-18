"use client";

import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Play,
  Pause,
  Camera,
  CheckCircle,
  MapPin,
  Clock,
  Users,
} from "lucide-react";

const currentJob = {
  title: "Large Oak Tree Removal",
  client: "Johnson Family",
  address: "123 Oak Street, Springfield",
  estimatedHours: 4,
  startTime: "8:00 AM",
  services: ["Tree Removal", "Stump Grinding", "Debris Cleanup"],
  notes:
    "Customer requested debris be hauled away. Power lines nearby - use caution.",
};

const crewMembers = [
  { name: "Mike Rodriguez", role: "Foreman", status: "Active", hours: "3.5" },
  { name: "Jake Thompson", role: "Climber", status: "Active", hours: "3.5" },
  { name: "Chris Evans", role: "Ground Crew", status: "Active", hours: "3.5" },
];

const todaySchedule = [
  { time: "8:00 AM", title: "Oak Tree Removal", status: "In Progress" },
  { time: "1:00 PM", title: "Pruning - Martinez Property", status: "Upcoming" },
  { time: "3:30 PM", title: "Stump Grinding", status: "Upcoming" },
];

export default function CrewModePage() {
  return (
    <div className="flex flex-col h-full bg-background">
      <Header
        title="Crew Mode"
        subtitle="Field operations view"
      />

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <Card className="bg-primary/10 border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-green-500">In Progress</Badge>
                <span className="text-sm text-muted-foreground">
                  Started at {currentJob.startTime}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-lg font-bold text-primary">3:32:15</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold">{currentJob.title}</h2>
              <p className="text-muted-foreground">{currentJob.client}</p>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {currentJob.address}
            </div>

            <div className="flex flex-wrap gap-2">
              {currentJob.services.map((service) => (
                <Badge key={service} variant="secondary">
                  {service}
                </Badge>
              ))}
            </div>

            {currentJob.notes && (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-sm">
                <strong>Note:</strong> {currentJob.notes}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button size="lg" className="flex-1">
                <Pause className="h-5 w-5 mr-2" />
                Pause Timer
              </Button>
              <Button size="lg" variant="outline">
                <Camera className="h-5 w-5" />
              </Button>
              <Button size="lg" variant="secondary" className="flex-1">
                <CheckCircle className="h-5 w-5 mr-2" />
                Complete Job
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Crew on Site
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {crewMembers.map((member) => (
                <div
                  key={member.name}
                  className="flex items-center justify-between p-3 rounded-lg bg-background/50 border"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {member.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{member.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {member.role}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant="outline"
                      className="bg-green-500/20 text-green-400"
                    >
                      {member.status}
                    </Badge>
                    <div className="text-sm text-muted-foreground mt-1">
                      {member.hours}h today
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-card/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Today's Schedule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {todaySchedule.map((job, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    job.status === "In Progress"
                      ? "bg-primary/10 border-primary/30"
                      : "bg-background/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium w-20">{job.time}</div>
                    <div className="font-medium">{job.title}</div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      job.status === "In Progress"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-muted text-muted-foreground"
                    }
                  >
                    {job.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
