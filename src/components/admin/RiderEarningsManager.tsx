import { useState } from "react";
import { motion } from "framer-motion";
import { 
  DollarSign, 
  Bike, 
  TrendingUp,
  Calculator,
  Download,
  Search
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminRiders, useAdminOrders, useAdminRiderRequests } from "@/hooks/useAdmin";

export function RiderEarningsManager() {
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: riders, isLoading: ridersLoading } = useAdminRiders();
  const { data: orders } = useAdminOrders();
  const { data: requests } = useAdminRiderRequests();

  // Calculate earnings per rider
  const riderEarnings = riders?.map(rider => {
    // Get all orders assigned to this rider
    const riderOrders = orders?.filter(o => o.rider_id === rider.id) || [];
    const riderRequests = requests?.filter(r => r.rider_id === rider.id) || [];
    
    // Calculate totals
    const orderTotal = riderOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const requestTotal = riderRequests.reduce((sum, r) => sum + (r.total || 0), 0);
    const totalRevenue = orderTotal + requestTotal;
    
    // 70% goes to rider
    const riderShare = Math.round(totalRevenue * 0.7);
    
    // Count completed deliveries
    const completedOrders = riderOrders.filter(o => o.status === 'delivered').length;
    const completedRequests = riderRequests.filter(r => r.status === 'delivered').length;
    const totalDeliveries = completedOrders + completedRequests;

    return {
      ...rider,
      totalRevenue,
      riderShare,
      totalDeliveries,
      pendingOrders: riderOrders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length +
                     riderRequests.filter(r => r.status !== 'delivered' && r.status !== 'cancelled').length,
    };
  }) || [];

  const filteredRiders = riderEarnings.filter(rider =>
    rider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rider.phone.includes(searchQuery)
  );

  // Summary stats
  const totalRiderEarnings = riderEarnings.reduce((sum, r) => sum + r.riderShare, 0);
  const totalDeliveries = riderEarnings.reduce((sum, r) => sum + r.totalDeliveries, 0);
  const avgEarningsPerRider = riderEarnings.length > 0 ? 
    Math.round(totalRiderEarnings / riderEarnings.length) : 0;

  if (ridersLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    PKR {totalRiderEarnings.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Rider Earnings (70%)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                  <Bike className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalDeliveries}</p>
                  <p className="text-sm text-muted-foreground">Total Completed Deliveries</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Calculator className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    PKR {avgEarningsPerRider.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">Avg. Earnings per Rider</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Earnings Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Rider Earnings Breakdown
          </CardTitle>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search rider..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-48"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rider</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead className="text-right">Deliveries</TableHead>
                  <TableHead className="text-right">Total Orders</TableHead>
                  <TableHead className="text-right">Earnings (70%)</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRiders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No riders found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRiders.map((rider) => (
                    <TableRow key={rider.id}>
                      <TableCell className="font-medium">{rider.name}</TableCell>
                      <TableCell className="text-muted-foreground">{rider.phone}</TableCell>
                      <TableCell>{rider.vehicle_type}</TableCell>
                      <TableCell className="text-right">{rider.totalDeliveries}</TableCell>
                      <TableCell className="text-right">
                        PKR {rider.totalRevenue.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-blue-500">
                        PKR {rider.riderShare.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {rider.is_online && (
                            <Badge className="bg-accent/20 text-accent text-xs">Online</Badge>
                          )}
                          <Badge 
                            variant={rider.is_active ? "default" : "secondary"}
                            className={rider.is_active ? "bg-primary/20 text-primary text-xs" : "text-xs"}
                          >
                            {rider.is_active ? "Active" : "Blocked"}
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-blue-500/5 border-blue-500/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-4 h-4 text-blue-500" />
            </div>
            <div>
              <h4 className="font-semibold text-foreground">Earnings Distribution</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Riders receive <span className="font-semibold text-blue-500">70%</span> of each order total. 
                The remaining <span className="font-semibold text-accent">30%</span> goes to Fast Haazir platform.
                Earnings are calculated based on all completed deliveries including food orders and on-demand rider requests.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
