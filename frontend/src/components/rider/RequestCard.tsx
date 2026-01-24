import { useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Clock, Map, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ChatButton from '@/components/chat/ChatButton';
import { RiderRequest, OrderStatus } from '@/hooks/useRiderDashboard';
import DeliveryMap, { calculateDistance, calculateDeliveryCharge } from './DeliveryMap';
const statusColors: Record<OrderStatus, string> = {
  placed: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  preparing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  on_way: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  delivered: 'bg-green-500/20 text-green-400 border-green-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const statusLabels: Record<OrderStatus, string> = {
  placed: 'Pending',
  preparing: 'Picked Up',
  on_way: 'On The Way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

interface RequestCardProps {
  request: RiderRequest;
  showActions?: boolean;
  activeTab?: 'available' | 'active' | 'completed';
  onAccept?: (requestId: string, requestType: 'rider_request' | 'order') => void;
  onUpdateStatus?: (requestId: string, status: OrderStatus, requestType: 'rider_request' | 'order') => void;
  isAccepting?: boolean;
  isUpdating?: boolean;
}

const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
  const statusFlow: Record<string, OrderStatus> = {
    placed: 'preparing',
    preparing: 'on_way',
    on_way: 'delivered',
  };
  return statusFlow[currentStatus] || null;
};

const getNextStatusLabel = (currentStatus: OrderStatus): string | null => {
  const labels: Record<string, string> = {
    placed: 'Mark as Picked Up',
    preparing: 'Start Delivery',
    on_way: 'Mark as Delivered',
  };
  return labels[currentStatus] || null;
};

export const RequestCard = ({ 
  request, 
  showActions = false, 
  activeTab,
  onAccept,
  onUpdateStatus,
  isAccepting = false,
  isUpdating = false
}: RequestCardProps) => {
  const [showMap, setShowMap] = useState(false);
  
  // Calculate distance and charge
  const hasCoordinates = request.pickup_lat && request.pickup_lng && request.dropoff_lat && request.dropoff_lng;
  const distance = hasCoordinates
    ? calculateDistance(request.pickup_lat!, request.pickup_lng!, request.dropoff_lat!, request.dropoff_lng!)
    : 0;
  const calculatedCharge = hasCoordinates ? calculateDeliveryCharge(distance) : request.total;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <Card className="bg-card border-border mb-3 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            <span className="font-medium text-foreground">
              {request.item_description || 'Package Delivery'}
            </span>
          </div>
          <Badge className={statusColors[request.status]}>
            {statusLabels[request.status]}
          </Badge>
        </div>

        {/* Map Toggle Button */}
        {hasCoordinates && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMap(!showMap)}
            className="w-full mb-3"
          >
            <Map className="w-4 h-4 mr-2" />
            {showMap ? 'Hide Map' : 'View on Map'} • {distance.toFixed(1)} km
          </Button>
        )}

        {/* Delivery Map */}
        {showMap && hasCoordinates && (
          <DeliveryMap
            pickupLat={request.pickup_lat}
            pickupLng={request.pickup_lng}
            dropoffLat={request.dropoff_lat}
            dropoffLng={request.dropoff_lng}
            pickupAddress={request.pickup_address}
            dropoffAddress={request.dropoff_address}
          />
        )}

        <div className="space-y-2 mb-3">
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Pickup</p>
              <p className="text-sm text-foreground">{request.pickup_address}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full bg-red-500 mt-2" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Dropoff</p>
              <p className="text-sm text-foreground">{request.dropoff_address}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm mb-3">
          <div className="flex items-center gap-1 text-muted-foreground">
            <Clock className="w-4 h-4" />
            {new Date(request.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          <div className="text-right">
            <span className="font-bold text-primary">Rs. {calculatedCharge}</span>
            {hasCoordinates && (
              <p className="text-xs text-muted-foreground">{distance.toFixed(1)} km</p>
            )}
          </div>
        </div>

        {/* Customer contact via chat only - Privacy protected */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3 p-2 bg-blue-500/5 rounded-lg border border-blue-500/10">
          <User className="w-4 h-4 text-blue-500" />
          <span className="text-xs">Contact customer via in-app chat</span>
        </div>

        {showActions && (
          <div className="flex gap-2">
            {activeTab === 'available' && onAccept && (
              <Button
                className="flex-1"
                onClick={() => onAccept(request.id, request.type || 'rider_request')}
                disabled={isAccepting}
              >
                {isAccepting ? 'Accepting...' : 'Accept Request'}
              </Button>
            )}
            {activeTab === 'active' && (
              <>
                <ChatButton 
                  riderRequestId={request.type === 'order' ? undefined : request.id}
                  orderId={request.type === 'order' ? request.id : undefined}
                  userType="rider" 
                  variant="outline"
                />
                {getNextStatus(request.status) && onUpdateStatus && (
                  <Button
                    className="flex-1"
                    onClick={() => onUpdateStatus(request.id, getNextStatus(request.status)!, request.type || 'rider_request')}
                    disabled={isUpdating}
                  >
                    {isUpdating ? 'Updating...' : getNextStatusLabel(request.status)}
                  </Button>
                )}
              </>
            )}
            {activeTab === 'completed' && (
              <ChatButton 
                riderRequestId={request.type === 'order' ? undefined : request.id}
                orderId={request.type === 'order' ? request.id : undefined}
                userType="rider" 
                variant="ghost"
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  </motion.div>
  );
};
