import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Store, 
  MapPin, 
  Phone, 
  Clock,
  Image as ImageIcon,
  Save,
  Star,
  Edit2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  BusinessProfile as BusinessProfileType,
  useUpdateBusinessProfile 
} from "@/hooks/useBusinessDashboard";

interface BusinessProfileProps {
  business: BusinessProfileType;
}

export const BusinessProfile = ({ business }: BusinessProfileProps) => {
  const updateMutation = useUpdateBusinessProfile();
  const [isEditing, setIsEditing] = useState(false);
  
  const [formData, setFormData] = useState({
    name: business.name,
    description: business.description || '',
    image: business.image || '',
    eta: business.eta || '25-35 min',
    distance: business.distance || '1.0 km',
    category: business.category || '',
  });

  const businessTypeLabels: Record<string, string> = {
    restaurant: '🍽️ Restaurant',
    bakery: '🥐 Bakery',
    grocery: '🛒 Grocery Store',
    shop: '🏪 General Shop',
  };

  const handleSave = () => {
    updateMutation.mutate(
      { businessId: business.id, updates: formData },
      { onSuccess: () => setIsEditing(false) }
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Business Profile</h2>
          <p className="text-muted-foreground">Manage your business information</p>
        </div>
        {!isEditing ? (
          <Button variant="outline" onClick={() => setIsEditing(true)} className="gap-2">
            <Edit2 className="h-4 w-4" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave} 
              className="gradient-primary text-primary-foreground gap-2"
              disabled={updateMutation.isPending}
            >
              <Save className="h-4 w-4" />
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile Preview */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-1"
        >
          <Card className="overflow-hidden">
            {formData.image ? (
              <div className="h-48 overflow-hidden">
                <img 
                  src={formData.image} 
                  alt={formData.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="h-48 bg-muted flex items-center justify-center">
                <Store className="h-16 w-16 text-muted-foreground" />
              </div>
            )}
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-xl font-bold text-foreground">{formData.name}</h3>
                  <Badge variant="secondary" className="mt-1">
                    {businessTypeLabels[business.type]}
                  </Badge>
                </div>
                <div className="flex items-center gap-1 text-primary">
                  <Star className="h-5 w-5 fill-current" />
                  <span className="font-bold">{business.rating}</span>
                </div>
              </div>
              
              {formData.description && (
                <p className="text-sm text-muted-foreground mb-3">{formData.description}</p>
              )}

              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formData.eta}
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {formData.distance}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Read-only Info */}
          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Account Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Phone</span>
                <span className="text-sm font-medium">{business.owner_phone || 'Not set'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Commission Rate</span>
                <Badge variant="outline">{business.commission_rate}%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge className={business.is_active ? 'bg-accent' : 'bg-muted'}>
                  {business.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Featured</span>
                <Badge variant={business.featured ? 'default' : 'outline'}>
                  {business.featured ? 'Yes' : 'No'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Edit Form */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <CardTitle>Business Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Business Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., Fast Food, Italian, Pakistani"
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Tell customers about your business..."
                  rows={3}
                  disabled={!isEditing}
                />
              </div>

              <div className="space-y-2">
                <Label>Cover Image URL</Label>
                <Input
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  placeholder="https://..."
                  disabled={!isEditing}
                />
                {formData.image && (
                  <div className="mt-2 h-32 rounded-lg overflow-hidden">
                    <img 
                      src={formData.image} 
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Estimated Delivery Time</Label>
                  <Input
                    value={formData.eta}
                    onChange={(e) => setFormData({ ...formData, eta: e.target.value })}
                    placeholder="e.g., 25-35 min"
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Distance</Label>
                  <Input
                    value={formData.distance}
                    onChange={(e) => setFormData({ ...formData, distance: e.target.value })}
                    placeholder="e.g., 1.5 km"
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};
