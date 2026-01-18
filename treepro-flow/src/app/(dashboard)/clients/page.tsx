"use client";

import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MapPin, Phone, Mail, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

const mockClients = [
  {
    id: "1",
    name: "Johnson Family",
    email: "contact@johnsonfamily.com",
    phone: "(555) 123-4567",
    address: "123 Oak Street, Springfield",
    totalJobs: 5,
    totalRevenue: 12500,
    tags: ["Residential", "VIP"],
  },
  {
    id: "2",
    name: "City of Oakville",
    email: "parks@oakville.gov",
    phone: "(555) 987-6543",
    address: "City Hall, 500 Main St",
    totalJobs: 12,
    totalRevenue: 45000,
    tags: ["Municipal", "Contract"],
  },
  {
    id: "3",
    name: "Riverside HOA",
    email: "manager@riversidehoa.com",
    phone: "(555) 456-7890",
    address: "Riverside Community Center",
    totalJobs: 8,
    totalRevenue: 28000,
    tags: ["Commercial", "Annual"],
  },
  {
    id: "4",
    name: "Martinez Residence",
    email: "j.martinez@email.com",
    phone: "(555) 321-0987",
    address: "456 Pine Avenue",
    totalJobs: 2,
    totalRevenue: 3200,
    tags: ["Residential"],
  },
  {
    id: "5",
    name: "Green Valley Park",
    email: "admin@greenvalleypark.org",
    phone: "(555) 654-3210",
    address: "Green Valley Nature Reserve",
    totalJobs: 6,
    totalRevenue: 18500,
    tags: ["Non-Profit", "Contract"],
  },
];

export default function ClientsPage() {
  return (
    <div className="flex flex-col h-full">
      <Header
        title="Clients"
        subtitle={`${mockClients.length} active clients`}
        action={{
          label: "Add Client",
          onClick: () => console.log("Add client"),
        }}
      />

      <div className="flex-1 p-6 overflow-auto">
        <div className="grid gap-4">
          {mockClients.map((client) => (
            <Card key={client.id} className="bg-card/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {client.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{client.name}</h3>
                        {client.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3.5 w-3.5" />
                          {client.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="h-3.5 w-3.5" />
                          {client.phone}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {client.address}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-lg font-semibold text-primary">
                        ${client.totalRevenue.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {client.totalJobs} jobs completed
                      </div>
                    </div>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
