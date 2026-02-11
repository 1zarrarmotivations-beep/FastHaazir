
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bike,
    Car,
    Truck,
    Camera,
    CheckCircle2,
    ChevronRight,
    ArrowLeft,
    Loader2,
    ShieldCheck,
    FileText,
    Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useRegisterAsRider } from '@/hooks/useRiderDashboard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Camera as CapCamera, CameraResultType } from '@capacitor/camera';

type Step = 'personal' | 'vehicle' | 'documents' | 'pending';

const RiderRegistration = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const registerRider = useRegisterAsRider();

    const [step, setStep] = useState<Step>('personal');
    const [loading, setLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        vehicle_type: 'Bike',
        cnic: '',
        cnic_front: '',
        cnic_back: '',
        license_image: '',
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const captureImage = async (field: 'cnic_front' | 'cnic_back' | 'license_image') => {
        try {
            const image = await CapCamera.getPhoto({
                quality: 90,
                allowEditing: false,
                resultType: CameraResultType.Base64
            });

            if (image.base64String) {
                setLoading(true);
                const fileName = `${user?.id}_${field}_${Date.now()}.jpg`;
                const filePath = `rider-docs/${fileName}`;

                // Convert base64 to Blob
                const byteCharacters = atob(image.base64String);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'image/jpeg' });

                const { data, error } = await supabase.storage
                    .from('rider-documents')
                    .upload(filePath, blob);

                if (error) throw error;

                const { data: { publicUrl } } = supabase.storage
                    .from('rider-documents')
                    .getPublicUrl(filePath);

                setFormData({ ...formData, [field]: publicUrl });
                toast.success('Image uploaded successfully');
            }
        } catch (error) {
            console.error('Camera error:', error);
            toast.error('Failed to capture image');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!formData.cnic_front || !formData.cnic_back || !formData.license_image) {
            toast.error('Please upload all required documents');
            return;
        }

        setLoading(true);
        try {
            await registerRider.mutateAsync({
                name: formData.name,
                phone: formData.phone,
                vehicle_type: formData.vehicle_type,
                cnic: formData.cnic,
                cnic_front: formData.cnic_front,
                cnic_back: formData.cnic_back,
                license_image: formData.license_image,
            });
            setStep('pending');
        } catch (error: any) {
            toast.error(error.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="mobile-container bg-background min-h-screen pb-10">
            <header className="sticky top-0 z-50 customer-header-glass px-4 py-4 flex items-center gap-4">
                {step !== 'pending' && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => step === 'personal' ? navigate(-1) : setStep(step === 'vehicle' ? 'personal' : 'vehicle')}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                )}
                <h1 className="text-lg font-bold">Rider Registration</h1>
            </header>

            <main className="p-4">
                <AnimatePresence mode="wait">
                    {step === 'personal' && (
                        <motion.div
                            key="personal"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div className="text-center space-y-2 mb-6">
                                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
                                    <Smartphone className="w-8 h-8 text-primary" />
                                </div>
                                <h2 className="text-xl font-bold">Personal Information</h2>
                                <p className="text-sm text-muted-foreground">Tell us who you are</p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Full Name</Label>
                                    <Input
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        placeholder="Enter your full name"
                                        className="h-12 rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Phone Number</Label>
                                    <Input
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleInputChange}
                                        placeholder="03XXXXXXXXX"
                                        className="h-12 rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>CNIC Number</Label>
                                    <Input
                                        name="cnic"
                                        value={formData.cnic}
                                        onChange={handleInputChange}
                                        placeholder="XXXXX-XXXXXXX-X"
                                        className="h-12 rounded-xl"
                                    />
                                </div>
                            </div>

                            <Button
                                className="w-full h-14 rounded-2xl font-bold text-lg mt-8"
                                onClick={() => setStep('vehicle')}
                                disabled={!formData.name || !formData.phone || !formData.cnic}
                            >
                                Next Step
                                <ChevronRight className="w-5 h-5 ml-2" />
                            </Button>
                        </motion.div>
                    )}

                    {step === 'vehicle' && (
                        <motion.div
                            key="vehicle"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div className="text-center space-y-2 mb-6">
                                <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto">
                                    <Bike className="w-8 h-8 text-blue-500" />
                                </div>
                                <h2 className="text-xl font-bold">Vehicle Details</h2>
                                <p className="text-sm text-muted-foreground">Select your transport mode</p>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {[
                                    { id: 'Bike', icon: Bike, label: 'Motorcycle' },
                                    { id: 'Car', icon: Car, label: 'Car/Taxi' },
                                    { id: 'Truck', icon: Truck, label: 'Loader/Van' }
                                ].map((v) => (
                                    <Card
                                        key={v.id}
                                        className={`p-4 border-2 transition-all cursor-pointer ${formData.vehicle_type === v.id ? 'border-primary bg-primary/5' : 'border-border'}`}
                                        onClick={() => setFormData({ ...formData, vehicle_type: v.id })}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${formData.vehicle_type === v.id ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                                                <v.icon className="w-6 h-6" />
                                            </div>
                                            <span className="font-bold">{v.label}</span>
                                        </div>
                                    </Card>
                                ))}
                            </div>

                            <Button
                                className="w-full h-14 rounded-2xl font-bold text-lg mt-8"
                                onClick={() => setStep('documents')}
                            >
                                Next Step
                                <ChevronRight className="w-5 h-5 ml-2" />
                            </Button>
                        </motion.div>
                    )}

                    {step === 'documents' && (
                        <motion.div
                            key="documents"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            <div className="text-center space-y-2 mb-6">
                                <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto">
                                    <FileText className="w-8 h-8 text-emerald-500" />
                                </div>
                                <h2 className="text-xl font-bold">Document Verification</h2>
                                <p className="text-sm text-muted-foreground">Upload clear photos of your ID</p>
                            </div>

                            <div className="space-y-4">
                                <DocumentUploadField
                                    label="CNIC Front Side"
                                    value={formData.cnic_front}
                                    onCapture={() => captureImage('cnic_front')}
                                    loading={loading}
                                />
                                <DocumentUploadField
                                    label="CNIC Back Side"
                                    value={formData.cnic_back}
                                    onCapture={() => captureImage('cnic_back')}
                                    loading={loading}
                                />
                                <DocumentUploadField
                                    label="Driving License"
                                    value={formData.license_image}
                                    onCapture={() => captureImage('license_image')}
                                    loading={loading}
                                />
                            </div>

                            <Button
                                className="w-full h-14 rounded-2xl font-bold text-lg mt-8 gradient-primary"
                                onClick={handleSubmit}
                                disabled={loading || !formData.cnic_front || !formData.cnic_back || !formData.license_image}
                            >
                                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Submit for Approval'}
                            </Button>
                        </motion.div>
                    )}

                    {step === 'pending' && (
                        <motion.div
                            key="pending"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-10 space-y-6"
                        >
                            <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <ShieldCheck className="w-12 h-12 text-emerald-500" />
                            </div>
                            <h2 className="text-2xl font-bold">Registration Submitted!</h2>
                            <p className="text-muted-foreground px-4 text-sm">
                                Your application is now under review. We will verify your documents and activate your account within 24-48 hours.
                                You will receive a notification once approved.
                            </p>

                            <div className="pt-6">
                                <Button
                                    variant="outline"
                                    className="w-full h-12 rounded-xl"
                                    onClick={() => navigate('/')}
                                >
                                    Return to Home
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
};

const DocumentUploadField = ({ label, value, onCapture, loading }: { label: string, value: string, onCapture: () => void, loading: boolean }) => (
    <div className="space-y-2">
        <Label>{label}</Label>
        <div
            className={`h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${value ? 'border-emerald-500 bg-emerald-500/5' : 'border-border bg-muted/30'}`}
            onClick={onCapture}
        >
            {value ? (
                <>
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    <span className="text-xs text-emerald-600 font-medium">Document Captured</span>
                </>
            ) : (
                <>
                    <Camera className="w-8 h-8 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Tap to take photo</span>
                </>
            )}
        </div>
    </div>
);

export default RiderRegistration;
