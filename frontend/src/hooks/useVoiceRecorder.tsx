
import { useState, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { VoiceRecorder } from 'capacitor-voice-recorder';
import { toast } from 'sonner';

export interface RecordingResult {
    blob: Blob;
    duration: number; // in seconds
    format: string; // 'audio/aac', 'audio/webm', etc
}

export const useVoiceRecorder = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number>(0);

    // Web only refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const startRecording = useCallback(async (): Promise<boolean> => {
        try {
            if (Capacitor.isNativePlatform()) {
                // Native Implementation
                const canRecord = await VoiceRecorder.canDeviceVoiceRecord();
                if (!canRecord.value) {
                    toast.error('Device cannot record audio');
                    return false;
                }

                const perm = await VoiceRecorder.requestAudioRecordingPermission();
                if (!perm.value) {
                    toast.error('Microphone permission denied');
                    return false;
                }

                await VoiceRecorder.startRecording();
            } else {
                // Web Implementation
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                mediaRecorderRef.current = mediaRecorder;
                chunksRef.current = [];

                mediaRecorder.ondataavailable = (e) => {
                    if (e.data.size > 0) chunksRef.current.push(e.data);
                };

                mediaRecorder.start();
            }

            // Start Timer UI
            startTimeRef.current = Date.now();
            setIsRecording(true);
            setDuration(0);

            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                setDuration((Date.now() - startTimeRef.current) / 1000);
            }, 100);

            return true;
        } catch (error) {
            console.error('Failed to start recording:', error);
            toast.error('Could not start recording');
            return false;
        }
    }, []);

    const stopRecording = useCallback(async (): Promise<RecordingResult | null> => {
        if (!isRecording) return null;

        try {
            // Stop Timer
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
            setIsRecording(false);
            const finalDuration = (Date.now() - startTimeRef.current) / 1000;

            if (Capacitor.isNativePlatform()) {
                // Native Stop
                const result = await VoiceRecorder.stopRecording();
                const base64Sound = result.value.recordDataBase64;
                const mimeType = result.value.mimeType || 'audio/aac'; // Default for android usually aac

                // Convert base64 to Blob
                const response = await fetch(`data:${mimeType};base64,${base64Sound}`);
                const blob = await response.blob();

                return {
                    blob,
                    duration: finalDuration, // use timer duration as backup or result.value.msDuration / 1000? 
                    // Plugin returns msDuration, let's use it if available and > 0
                    format: mimeType
                };
            } else {
                // Web Stop
                return new Promise((resolve) => {
                    if (!mediaRecorderRef.current) return resolve(null);

                    mediaRecorderRef.current.onstop = () => {
                        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                        // Stop tracks
                        mediaRecorderRef.current?.stream.getTracks().forEach(t => t.stop());

                        resolve({
                            blob,
                            duration: finalDuration,
                            format: 'audio/webm'
                        });
                    };
                    mediaRecorderRef.current.stop();
                });
            }

        } catch (error) {
            console.error('Failed to stop recording:', error);
            toast.error('Failed to save recording');
            return null;
        }
    }, [isRecording]);

    return {
        isRecording,
        duration,
        startRecording,
        stopRecording
    };
};
