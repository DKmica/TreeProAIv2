"use client";

import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const mockEvents = [
  { date: 20, title: "Oak Removal", crew: "Alpha", time: "8:00 AM" },
  { date: 20, title: "Pruning", crew: "Beta", time: "1:00 PM" },
  { date: 21, title: "Stump Grinding", crew: "Alpha", time: "9:00 AM" },
  { date: 22, title: "Lot Clearing", crew: "Charlie", time: "7:00 AM" },
  { date: 23, title: "Tree Planting", crew: "Beta", time: "10:00 AM" },
  { date: 24, title: "Emergency Call", crew: "Alpha", time: "2:00 PM" },
];

export default function CalendarPage() {
  const [currentDate] = useState(new Date(2026, 0, 18));
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const getEventsForDay = (day: number | null) =>
    day ? mockEvents.filter((e) => e.date === day) : [];

  return (
    <div className="flex flex-col h-full">
      <Header
        title="Calendar"
        subtitle="Schedule and manage jobs"
        action={{
          label: "Schedule Job",
          onClick: () => console.log("Schedule job"),
        }}
      />

      <div className="flex-1 p-6 overflow-auto">
        <Card className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">
                {currentDate.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline">Today</Button>
                <Button variant="outline" size="icon">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
              {daysOfWeek.map((day) => (
                <div
                  key={day}
                  className="bg-muted p-3 text-center text-sm font-medium"
                >
                  {day}
                </div>
              ))}
              {days.map((day, index) => {
                const events = getEventsForDay(day);
                const isToday = day === 18;
                return (
                  <div
                    key={index}
                    className={`bg-background min-h-28 p-2 ${
                      day ? "hover:bg-accent/50 cursor-pointer" : "bg-muted/30"
                    }`}
                  >
                    {day && (
                      <>
                        <div
                          className={`text-sm mb-1 ${
                            isToday
                              ? "w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-bold"
                              : "text-muted-foreground"
                          }`}
                        >
                          {day}
                        </div>
                        <div className="space-y-1">
                          {events.slice(0, 2).map((event, i) => (
                            <div
                              key={i}
                              className="text-xs p-1 rounded bg-primary/10 text-primary truncate"
                            >
                              {event.time} - {event.title}
                            </div>
                          ))}
                          {events.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{events.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
