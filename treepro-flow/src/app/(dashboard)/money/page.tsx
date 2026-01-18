"use client";

import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  FileText,
  Clock,
} from "lucide-react";

const stats = [
  {
    title: "Revenue This Month",
    value: "$47,250",
    change: "+12.5%",
    trend: "up",
    icon: DollarSign,
  },
  {
    title: "Outstanding Invoices",
    value: "$18,400",
    change: "6 unpaid",
    trend: "neutral",
    icon: FileText,
  },
  {
    title: "Overdue Amount",
    value: "$3,200",
    change: "2 overdue",
    trend: "down",
    icon: Clock,
  },
  {
    title: "Collected This Week",
    value: "$12,800",
    change: "+8.3%",
    trend: "up",
    icon: CreditCard,
  },
];

const recentInvoices = [
  {
    id: "INV-001",
    client: "Johnson Family",
    amount: 4500,
    status: "Paid",
    date: "Jan 15, 2026",
  },
  {
    id: "INV-002",
    client: "City of Oakville",
    amount: 8200,
    status: "Pending",
    date: "Jan 12, 2026",
  },
  {
    id: "INV-003",
    client: "Riverside HOA",
    amount: 3200,
    status: "Overdue",
    date: "Jan 5, 2026",
  },
  {
    id: "INV-004",
    client: "Martinez Residence",
    amount: 1200,
    status: "Pending",
    date: "Jan 10, 2026",
  },
  {
    id: "INV-005",
    client: "Green Valley Park",
    amount: 5500,
    status: "Paid",
    date: "Jan 8, 2026",
  },
];

const statusColors: Record<string, string> = {
  Paid: "bg-green-500/20 text-green-400 border-green-500/30",
  Pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  Overdue: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function MoneyPage() {
  return (
    <div className="flex flex-col h-full">
      <Header
        title="Money"
        subtitle="Invoices, payments, and financial overview"
        action={{
          label: "Create Invoice",
          onClick: () => console.log("Create invoice"),
        }}
      />

      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.title} className="bg-card/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="flex items-center gap-1 text-xs">
                  {stat.trend === "up" && (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  )}
                  {stat.trend === "down" && (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span
                    className={
                      stat.trend === "up"
                        ? "text-green-500"
                        : stat.trend === "down"
                        ? "text-red-500"
                        : "text-muted-foreground"
                    }
                  >
                    {stat.change}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Invoices</CardTitle>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-background/50 border border-border"
                >
                  <div className="flex items-center gap-4">
                    <div className="font-mono text-sm text-muted-foreground">
                      {invoice.id}
                    </div>
                    <div>
                      <div className="font-medium">{invoice.client}</div>
                      <div className="text-sm text-muted-foreground">
                        {invoice.date}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-lg font-semibold">
                      ${invoice.amount.toLocaleString()}
                    </div>
                    <Badge
                      variant="outline"
                      className={statusColors[invoice.status]}
                    >
                      {invoice.status}
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
