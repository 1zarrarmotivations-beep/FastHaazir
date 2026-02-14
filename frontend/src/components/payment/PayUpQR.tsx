import React, { useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { toast } from 'sonner';
import { Loader2, Download, Copy, CheckCircle2, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { verifyPayment } from '@/api/payment';

interface PayUpQRProps {
    transactionId: string;
    qrString: string;
    paymentUrl: string;
    expiresIn: number;
    amount: number;
    onSuccess: () => void;
    onCancel: () => void;
}

const PayUpQR: React.FC<PayUpQRProps> = ({
    transactionId, qrString, paymentUrl, expiresIn, amount, onSuccess, onCancel
}) => {
    const [timeLeft, setTimeLeft] = useState(expiresIn);
    const [verifying, setVerifying] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onCancel(); // Auto close on expire
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [onCancel]);

    // Poll for payment status
    useEffect(() => {
        let intervalId: NodeJS.Timeout;
        const checkStatus = async () => {
            try {
                const { status } = await verifyPayment(transactionId);
                if (status === 'paid') {
                    clearInterval(intervalId);
                    toast.success('Payment Received!');
                    onSuccess();
                }
            } catch (e) {
                console.error(e);
            }
        };

        intervalId = setInterval(checkStatus, 5000);
        return () => clearInterval(intervalId);
    }, [transactionId, onSuccess]);

    const handleManualVerify = async () => {
        setVerifying(true);
        try {
            // First check if already verified backend side
            const { status } = await verifyPayment(transactionId);
            if (status === 'paid' || status === 'waiting_approval') {
                toast.success('Payment Received!');
                onSuccess();
                return;
            }

            // If not, try to claim it manually
            // This is necessary because PayUp P2P API doesn't support automatic webhooks for confirmations
            // The merchant must verify manually.
            await import('@/api/payment').then(({ claimPayment }) => claimPayment(transactionId));

            toast.success('Payment submitted for verification!');
            onSuccess();
        } catch (e) {
            console.error(e);
            toast.error('Could not submit payment claim. Please try again.');
        } finally {
            setVerifying(false);
        }
    };

    const downloadQR = () => {
        const canvas = document.getElementById('payup-qr-code') as HTMLCanvasElement;
        if (canvas) {
            const pngUrl = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream');
            const downloadLink = document.createElement('a');
            downloadLink.href = pngUrl;
            downloadLink.download = `payup_qr_${transactionId}.png`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        }
    };

    const copyTransactionId = () => {
        navigator.clipboard.writeText(transactionId);
        toast.success('Transaction ID copied!');
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <Card className="w-full max-w-sm bg-background border-none shadow-2xl overflow-hidden relative flex flex-col items-center p-6 space-y-6">

                {/* Header */}
                <div className="flex justify-between w-full items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                            <span className="text-green-600 font-bold text-xs">PK</span>
                        </div>
                        <h3 className="font-bold text-lg">Scan to Pay</h3>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onCancel} className="rounded-full h-8 w-8 hover:bg-muted">
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                {/* Amount */}
                <div className="text-center space-y-1">
                    <p className="text-muted-foreground text-sm">Total Amount</p>
                    <h2 className="text-3xl font-black text-primary">Rs. {amount.toLocaleString()}</h2>
                </div>

                {/* QR Code */}
                <div className="relative p-4 bg-white rounded-2xl shadow-lg border-2 border-green-500/20">
                    <QRCodeCanvas
                        id="payup-qr-code"
                        value={qrString}
                        size={256}
                        level={"L"} // Low error correction = Bigger dots = Easier to scan on screens
                        includeMargin={true}
                        bgColor="#FFFFFF"
                        fgColor="#000000"
                        className="rounded-lg w-full h-auto max-w-[200px]"
                    />
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white px-2 py-0.5 rounded-full border shadow-sm">
                        <div className="flex items-center gap-1 text-[10px] text-green-600 font-bold whitespace-nowrap">
                            <CheckCircle2 className="w-3 h-3 fill-green-100" />
                            PayUp Secure
                        </div>
                    </div>
                </div>

                {/* Timer */}
                <div className="flex items-center justify-center gap-2 text-orange-500 font-mono text-sm bg-orange-500/10 px-3 py-1.5 rounded-full w-fit">
                    <Clock className="w-4 h-4 animate-pulse" />
                    <span>Expires in {formatTime(timeLeft)}</span>
                </div>

                <p className="text-center text-xs text-muted-foreground max-w-[240px]">
                    Works with <b>JazzCash, Easypaisa, Raast</b> & all Banking Apps.
                </p>

                {/* Manual Transfer Option */}
                <div className="w-full bg-muted/50 rounded-lg p-3 text-xs space-y-2 border border-border/50">
                    <p className="font-semibold text-center text-muted-foreground">Or Transfer Manually</p>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Bank:</span>
                        <span className="font-medium">JazzCash</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Title:</span>
                        <span className="font-medium">zohiab hassan</span>
                    </div>
                    <div className="flex flex-col gap-1 mt-1">
                        <span className="text-muted-foreground text-[10px]">IBAN:</span>
                        <div className="flex items-center gap-2 bg-background p-1.5 rounded border">
                            <code className="flex-1 font-mono text-[10px] truncate">PK70JCMA0906923110111419</code>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 hover:bg-muted"
                                onClick={() => {
                                    navigator.clipboard.writeText("PK70JCMA0906923110111419");
                                    toast.success("IBAN Copied");
                                }}
                            >
                                <Copy className="h-3 w-3" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="space-y-3 w-full">
                    <Button
                        onClick={handleManualVerify}
                        className="w-full bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20"
                        disabled={verifying}
                    >
                        {verifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                        I Have Paid
                    </Button>

                    <div className="grid grid-cols-2 gap-3">
                        <Button variant="outline" onClick={downloadQR} className="text-xs h-9">
                            <Download className="w-3.5 h-3.5 mr-2 opacity-70" />
                            Save QR
                        </Button>
                        <Button variant="outline" onClick={copyTransactionId} className="text-xs h-9">
                            <Copy className="w-3.5 h-3.5 mr-2 opacity-70" />
                            Copy ID
                        </Button>
                    </div>

                    <div className="pt-2">
                        <details className="text-[10px] text-muted-foreground w-full">
                            <summary className="cursor-pointer mb-1">Debug QR String</summary>
                            <div className="p-2 bg-muted rounded border break-all font-mono select-all" onClick={(e) => {
                                const target = e.target as HTMLDivElement;
                                navigator.clipboard.writeText(target.innerText);
                                toast.success("QR String Copied");
                            }}>
                                {qrString}
                            </div>
                        </details>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default PayUpQR;
