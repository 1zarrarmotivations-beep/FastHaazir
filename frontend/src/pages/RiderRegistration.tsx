
import React, { useState, useRef } from 'react';
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
    Smartphone,
    Upload,
    Lock, // Add Lock icon
    AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useRegisterAsRider, useRiderProfile } from '@/hooks/useRiderDashboard';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';

type Step = 'personal' | 'vehicle' | 'documents' | 'pending';

const RiderRegistration = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const registerRider = useRegisterAsRider();

    // ALL HOOKS MUST BE DECLARED AT THE TOP (Before any returns)
    const [step, setStep] = useState<Step>('personal');
    const [loading, setLoading] = useState(false);
    const { data: riderProfile, isLoading: riderLoading } = useRiderProfile();

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        email: '', // Add email
        password: '', // Add password
        vehicle_type: 'Bike',
        cnic: '',
        cnic_front: '',
        cnic_back: '',
        license_image: '',
    });

    // PHASE: Auto-detect pending status
    React.useEffect(() => {
        if (riderProfile) {
            if (riderProfile.verification_status === 'pending') {
                setStep('pending');
            } else if (riderProfile.verification_status === 'verified') {
                navigate('/rider', { replace: true });
            }
        }
    }, [riderProfile, navigate]);

    // Conditional return for loading state (Must be AFTER all hooks)
    if (riderLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Capture Image with Camera (Same Robust Code)
    const captureImage = async (field: 'cnic_front' | 'cnic_back' | 'license_image', inputRef?: React.RefObject<HTMLInputElement>) => {
        setLoading(true);
        try {
            const image = await CapCamera.getPhoto({
                quality: 80,
                allowEditing: false,
                resultType: CameraResultType.Base64,
                source: CameraSource.Prompt
            });

            if (image.base64String) {
                const userId = user?.id || `anon_${Date.now()}`;
                const fileName = `${userId}_${field}_${Date.now()}.${image.format}`;
                const filePath = `rider-docs/${fileName}`;

                const byteCharacters = atob(image.base64String);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: `image/${image.format}` });

                const { data, error } = await supabase.storage
                    .from('rider-documents')
                    .upload(filePath, blob);

                if (error) throw error;

                const { data: { publicUrl } } = supabase.storage
                    .from('rider-documents')
                    .getPublicUrl(filePath);

                setFormData(prev => ({ ...prev, [field]: publicUrl }));
                toast.success('Image uploaded');
            }
        } catch (error: any) {
            console.warn('Camera failed:', error);
            if (error?.message !== 'User cancelled photos app') {
                if (inputRef && inputRef.current) {
                    toast.info("Using file picker...");
                    inputRef.current.click();
                }
            }
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = async (field: 'cnic_front' | 'cnic_back' | 'license_image', file: File) => {
        if (!file) return;
        setLoading(true);
        try {
            const userId = user?.id || `anon_${Date.now()}`;
            const fileName = `${userId}_${field}_${Date.now()}.${file.name.split('.').pop()}`;
            const filePath = `rider-docs/${fileName}`;

            const { data, error } = await supabase.storage
                .from('rider-documents')
                .upload(filePath, file);

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('rider-documents')
                .getPublicUrl(filePath);

            setFormData(prev => ({ ...prev, [field]: publicUrl }));
            toast.success('File uploaded successfully');
        } catch (error: any) {
            console.error('File upload error:', error);
            toast.error('Upload failed: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        // Validation including password if needed
        if (!formData.name || !formData.phone || !formData.cnic) {
            toast.error('Please fill in all personal details');
            return;
        }
        if (!user && !formData.password) {
            toast.error('Password is required for new account');
            return;
        }

        if (!formData.cnic_front || !formData.cnic_back || !formData.license_image) {
            toast.error('Please upload all required documents');
            return;
        }

        setLoading(true);
        try {
            if (user) {
                // User is logged in -> Use standard mutation
                await registerRider.mutateAsync({
                    name: formData.name,
                    phone: formData.phone,
                    vehicle_type: formData.vehicle_type,
                    cnic: formData.cnic,
                    cnic_front: formData.cnic_front,
                    cnic_back: formData.cnic_back,
                    license_image: formData.license_image,
                });
            } else {
                // User NOT logged in -> Create Account via Edge Function
                console.log("Creating new rider account via Edge Function...");
                const { data, error } = await supabase.functions.invoke('create-user', {
                    body: {
                        email: formData.email || undefined,
                        password: formData.password,
                        phone: formData.phone.replace(/\D/g, ''),
                        role: 'rider',
                        userData: {
                            name: formData.name,
                            vehicle_type: formData.vehicle_type,
                            cnic: formData.cnic,
                            cnic_front: formData.cnic_front,
                            cnic_back: formData.cnic_back,
                            license_image: formData.license_image
                        }
                    }
                });

                if (error) throw new Error(error.message || "Failed to create account");
                if (data?.error) throw new Error(data.error);

                // Auto-login after creation (if phone/password supported without immediate verify, or just prompt)
                // Since this is Admin creation (Edge Function), emails are auto-confirmed (if set to true).
                // Try logging in
                const { error: loginError } = await supabase.auth.signInWithPassword({
                    phone: formData.phone,
                    password: formData.password
                });

                if (loginError) {
                    toast.success('Account created! Please login.');
                    navigate('/login');
                    return;
                }
            }

            setStep('pending');
        } catch (error: any) {
            console.error(error);
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

                                {!user && (
                                    <>
                                        <div className="space-y-2">
                                            <Label>Email (Optional)</Label>
                                            <Input
                                                name="email"
                                                type="email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                placeholder="rider@example.com"
                                                className="h-12 rounded-xl"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Password</Label>
                                            <div className="relative">
                                                <Lock className="absolute left-3 top-3.5 w-5 h-5 text-muted-foreground" />
                                                <Input
                                                    name="password"
                                                    type="password"
                                                    value={formData.password}
                                                    onChange={handleInputChange}
                                                    placeholder="Create a password"
                                                    className="h-12 pl-10 rounded-xl"
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground">Required to log in efficiently later</p>
                                        </div>
                                    </>
                                )}

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
                                disabled={!formData.name || !formData.phone || !formData.cnic || (!user && !formData.password)}
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
                            {/* Vehicle Content Same as Before */}
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
                            {/* Documents Content - Same as previous fix */}
                            <div className="text-center space-y-2 mb-6">
                                <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto">
                                    <FileText className="w-8 h-8 text-emerald-500" />
                                </div>
                                <h2 className="text-xl font-bold">Document Verification</h2>
                                <p className="text-sm text-muted-foreground">Upload clear photos or files</p>
                            </div>

                            <div className="space-y-4">
                                <DocumentUploadField
                                    label="CNIC Front Side"
                                    value={formData.cnic_front}
                                    onCapture={(ref) => captureImage('cnic_front', ref)}
                                    onFileSelect={(file) => handleFileSelect('cnic_front', file)}
                                    loading={loading}
                                />
                                <DocumentUploadField
                                    label="CNIC Back Side"
                                    value={formData.cnic_back}
                                    onCapture={(ref) => captureImage('cnic_back', ref)}
                                    onFileSelect={(file) => handleFileSelect('cnic_back', file)}
                                    loading={loading}
                                />
                                <DocumentUploadField
                                    label="Driving License"
                                    value={formData.license_image}
                                    onCapture={(ref) => captureImage('license_image', ref)}
                                    onFileSelect={(file) => handleFileSelect('license_image', file)}
                                    loading={loading}
                                />
                            </div>

                            <Button
                                className="w-full h-14 rounded-2xl font-bold text-lg mt-8 gradient-primary"
                                onClick={handleSubmit}
                                disabled={loading || !formData.cnic_front || !formData.cnic_back || !formData.license_image}
                            >
                                {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : (!user ? 'Create Account & Apply' : 'Submit for Approval')}
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

const DocumentUploadField = ({ label, value, onCapture, onFileSelect, loading }: {
    label: string,
    value: string,
    onCapture: (ref: React.RefObject<HTMLInputElement>) => void,
    onFileSelect: (file: File) => void,
    loading: boolean
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="space-y-2">
            <Label>{label}</Label>

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onFileSelect(file);
                }}
            />

            <div
                className={`h-32 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${value ? 'border-emerald-500 bg-emerald-500/5' : 'border-border bg-muted/30'}`}
                onClick={() => onCapture(fileInputRef)}
            >
                {value ? (
                    <>
                        <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                        <span className="text-xs text-emerald-600 font-medium">Document Uploaded</span>
                    </>
                ) : (
                    <>
                        <div className="flex gap-4">
                            <div className="flex flex-col items-center">
                                <Camera className="w-6 h-6 text-muted-foreground mb-1" />
                                <span className="text-[10px] text-muted-foreground">Camera</span>
                            </div>
                            <div className="w-px h-8 bg-border"></div>
                            <div className="flex flex-col items-center">
                                <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                                <span className="text-[10px] text-muted-foreground">Upload</span>
                            </div>
                        </div>
                        <span className="text-xs text-muted-foreground mt-1">Tap to capture or upload</span>
                    </>
                )}
            </div>
        </div>
    );
};

export default RiderRegistration;
