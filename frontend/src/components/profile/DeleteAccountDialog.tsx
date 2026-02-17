import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface DeleteAccountDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const DeleteAccountDialog: React.FC<DeleteAccountDialogProps> = ({ open, onOpenChange }) => {
    const [confirmation, setConfirmation] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const { signOut } = useAuth();
    const navigate = useNavigate();

    const handleDelete = async () => {
        if (confirmation !== 'DELETE') {
            toast.error('Please type DELETE to confirm');
            return;
        }

        setIsDeleting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // Log the deletion request in the deletion_requests table
                const { error: requestError } = await supabase
                    .from('deletion_requests')
                    .insert({
                        user_id: user.id,
                        email: user.email,
                        phone: user.phone,
                        reason: 'User requested deletion via mobile app'
                    });

                if (requestError) throw requestError;

                // Also mark the profile as deletion pending
                await supabase
                    .from('customer_profiles')
                    .update({ is_deletion_pending: true })
                    .eq('user_id', user.id);

                await signOut(navigate);
                toast.success('Your account deletion request has been submitted. It will be processed within 48 hours.');
            }
        } catch (error) {
            console.error('Error deleting account:', error);
            toast.error('Failed to request account deletion. Please contact support.');
        } finally {
            setIsDeleting(false);
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-background border-destructive/20">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <AlertCircle className="w-5 h-5" />
                        Delete Account
                    </DialogTitle>
                    <DialogDescription className="text-foreground/70">
                        This action is permanent and cannot be undone. All your orders, addresses, and personal information will be permanently deleted from our servers.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <p className="text-sm font-medium mb-2">Type "DELETE" to confirm:</p>
                    <Input
                        value={confirmation}
                        onChange={(e) => setConfirmation(e.target.value)}
                        placeholder="DELETE"
                        className="border-destructive/30 focus-visible:ring-destructive"
                    />
                </div>

                <DialogFooter className="flex sm:justify-between gap-2">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isDeleting || confirmation !== 'DELETE'}
                        className="gap-2 shadow-lg shadow-destructive/20"
                    >
                        {isDeleting ? 'Processing...' : (
                            <>
                                <Trash2 className="w-4 h-4" />
                                Delete My Account
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default DeleteAccountDialog;
