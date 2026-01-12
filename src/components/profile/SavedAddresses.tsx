import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Plus, Edit2, Trash2, Check, Home, Building, Star, ArrowLeft, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { 
  useCustomerAddresses, 
  useCreateAddress, 
  useUpdateAddress, 
  useDeleteAddress,
  useSetDefaultAddress,
  CustomerAddress 
} from '@/hooks/useCustomerAddresses';
import AddressMapPicker from './AddressMapPicker';

interface SavedAddressesProps {
  onBack: () => void;
}

const SavedAddresses = ({ onBack }: SavedAddressesProps) => {
  const { data: addresses = [], isLoading } = useCustomerAddresses();
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();
  const deleteAddress = useDeleteAddress();
  const setDefault = useSetDefaultAddress();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingAddress, setEditingAddress] = useState<CustomerAddress | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  
  const [formData, setFormData] = useState({
    label: 'Home',
    address_text: '',
    lat: 0,
    lng: 0,
  });

  const labelOptions = [
    { value: 'Home', icon: Home },
    { value: 'Office', icon: Building },
    { value: 'Other', icon: MapPin },
  ];

  const resetForm = () => {
    setFormData({ label: 'Home', address_text: '', lat: 0, lng: 0 });
    setEditingAddress(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowAddDialog(true);
  };

  const handleOpenEdit = (address: CustomerAddress) => {
    setEditingAddress(address);
    setFormData({
      label: address.label,
      address_text: address.address_text,
      lat: address.lat || 0,
      lng: address.lng || 0,
    });
    setShowAddDialog(true);
  };

  const handleSave = async () => {
    if (!formData.address_text.trim()) {
      toast.error('Please enter an address');
      return;
    }

    try {
      if (editingAddress) {
        await updateAddress.mutateAsync({
          id: editingAddress.id,
          label: formData.label,
          address_text: formData.address_text,
          lat: formData.lat || undefined,
          lng: formData.lng || undefined,
        });
        toast.success('Address updated!');
      } else {
        await createAddress.mutateAsync({
          label: formData.label,
          address_text: formData.address_text,
          lat: formData.lat || undefined,
          lng: formData.lng || undefined,
          is_default: addresses.length === 0,
        });
        toast.success('Address added!');
      }
      setShowAddDialog(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to save address');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAddress.mutateAsync(id);
      toast.success('Address deleted');
      setDeleteConfirmId(null);
    } catch (error) {
      toast.error('Failed to delete address');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefault.mutateAsync(id);
      toast.success('Default address updated');
    } catch (error) {
      toast.error('Failed to set default address');
    }
  };

  const handleMapSelect = (location: { lat: number; lng: number; address: string }) => {
    setFormData(prev => ({
      ...prev,
      lat: location.lat,
      lng: location.lng,
      address_text: location.address || prev.address_text,
    }));
    setShowMapPicker(false);
  };

  if (showMapPicker) {
    return (
      <AddressMapPicker 
        onSelect={handleMapSelect}
        onBack={() => setShowMapPicker(false)}
        initialLocation={formData.lat && formData.lng ? { lat: formData.lat, lng: formData.lng } : undefined}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">Saved Addresses</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Add New Address Button */}
        <Button onClick={handleOpenAdd} className="w-full gap-2">
          <Plus className="h-4 w-4" />
          Add New Address
        </Button>

        {/* Addresses List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : addresses.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">No saved addresses</p>
            <p className="text-sm text-muted-foreground/70">Add your first delivery address</p>
          </div>
        ) : (
          <AnimatePresence>
            {addresses.map((address, index) => {
              const LabelIcon = labelOptions.find(l => l.value === address.label)?.icon || MapPin;
              
              return (
                <motion.div
                  key={address.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className={`p-4 ${address.is_default ? 'border-primary border-2' : ''}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        address.is_default ? 'gradient-primary' : 'bg-muted'
                      }`}>
                        <LabelIcon className={`h-5 w-5 ${
                          address.is_default ? 'text-primary-foreground' : 'text-foreground'
                        }`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{address.label}</span>
                          {address.is_default && (
                            <Badge variant="secondary" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              Default
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {address.address_text}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                      {!address.is_default && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetDefault(address.id)}
                          disabled={setDefault.isPending}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Set Default
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(address)}
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteConfirmId(address.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAddress ? 'Edit Address' : 'Add New Address'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Label</Label>
              <div className="flex gap-2">
                {labelOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <Button
                      key={option.value}
                      type="button"
                      variant={formData.label === option.value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setFormData(prev => ({ ...prev, label: option.value }))}
                      className="flex-1"
                    >
                      <Icon className="h-4 w-4 mr-1" />
                      {option.value}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                placeholder="Enter your full address"
                value={formData.address_text}
                onChange={(e) => setFormData(prev => ({ ...prev, address_text: e.target.value }))}
              />
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={() => setShowMapPicker(true)}
            >
              <MapPin className="h-4 w-4" />
              {formData.lat && formData.lng ? 'Change Location on Map' : 'Pick Location on Map'}
            </Button>

            {formData.lat !== 0 && formData.lng !== 0 && (
              <p className="text-xs text-muted-foreground text-center">
                📍 Location set: {formData.lat.toFixed(4)}, {formData.lng.toFixed(4)}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSave}
              disabled={createAddress.isPending || updateAddress.isPending}
            >
              {(createAddress.isPending || updateAddress.isPending) ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Save Address'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Address?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This address will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SavedAddresses;
