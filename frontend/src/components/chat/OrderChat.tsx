import { useState, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  Send, 
  X, 
  User, 
  Store, 
  Bike, 
  Map, 
  ChevronUp, 
  ChevronDown,
  Mic,
  Square,
  Play,
  Pause,
  Loader2,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { 
  useChatMessages, 
  useSendMessage, 
  useOrderParticipants,
  useRiderRequestParticipants,
  useUploadVoiceNote,
  ChatMessage
} from '@/hooks/useChat';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface OrderChatProps {
  orderId?: string;
  riderRequestId?: string;
  userType: 'customer' | 'business' | 'rider' | 'admin';
  isOpen: boolean;
  onClose: () => void;
}

// Memoized Mini Map Component - Only renders once per order
const MiniMapPreview = memo(({ 
  pickupAddress, 
  dropoffAddress 
}: { 
  pickupAddress?: string; 
  dropoffAddress?: string; 
}) => {
  return (
    <div className="p-3 bg-muted/30 border-b border-border">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Map className="w-4 h-4" />
        <div className="flex-1 truncate">
          {pickupAddress && <span className="font-medium">From: </span>}
          {pickupAddress || 'Pickup location'}
        </div>
      </div>
      {dropoffAddress && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
          <div className="w-4" />
          <div className="flex-1 truncate">
            <span className="font-medium">To: </span>
            {dropoffAddress}
          </div>
        </div>
      )}
    </div>
  );
});

MiniMapPreview.displayName = 'MiniMapPreview';

// Voice Note Player Component - Fixed for Android WebView compatibility
// Uses fresh Audio instances per play to avoid mobile browser issues
import { createVoicePlayer, stopCurrentAudio, unlockAudio, type VoicePlaybackResult } from '@/lib/voicePlayback';

const VoiceNotePlayer = memo(({ 
  voiceUrl, 
  duration,
  isOwnMessage 
}: { 
  voiceUrl: string;
  duration: number | null;
  isOwnMessage: boolean;
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const playerRef = useRef<VoicePlaybackResult | null>(null);
  const waveformHeightsRef = useRef<number[]>([]);

  // Generate stable waveform heights once
  if (waveformHeightsRef.current.length === 0) {
    waveformHeightsRef.current = Array.from({ length: 25 }, () => Math.random() * 100);
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.cleanup();
        playerRef.current = null;
      }
    };
  }, []);

  // Create fresh player when URL changes
  useEffect(() => {
    if (!voiceUrl) {
      setHasError(true);
      return;
    }

    // Cleanup previous player
    if (playerRef.current) {
      playerRef.current.cleanup();
      playerRef.current = null;
    }

    setHasError(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setIsLoading(false);

    // Pre-create player with callbacks (but don't play yet)
    const player = createVoicePlayer(voiceUrl, {
      onCanPlay: () => {
        console.log('[VoicePlayer] Ready to play');
        setIsLoading(false);
        if (player.getDuration() > 0) {
          setAudioDuration(player.getDuration());
        }
      },
      onTimeUpdate: (time, dur) => {
        setCurrentTime(time);
        if (dur > 0 && audioDuration === 0) {
          setAudioDuration(dur);
        }
      },
      onEnded: () => {
        console.log('[VoicePlayer] Ended');
        setIsPlaying(false);
        setCurrentTime(0);
      },
      onError: (err) => {
        console.error('[VoicePlayer] Error:', err);
        setHasError(true);
        setIsPlaying(false);
        setIsLoading(false);
      },
      onPlay: () => {
        setIsPlaying(true);
      },
      onPause: () => {
        setIsPlaying(false);
      },
    });

    playerRef.current = player;
    
    // Set initial duration if provided
    if (duration && duration > 0) {
      setAudioDuration(duration);
    }

  }, [voiceUrl]);

  const togglePlay = async () => {
    // Unlock audio on user gesture
    unlockAudio();

    if (hasError) {
      // Retry: create fresh player
      setHasError(false);
      setIsLoading(true);
      
      if (playerRef.current) {
        playerRef.current.cleanup();
      }

      const player = createVoicePlayer(voiceUrl, {
        onCanPlay: () => setIsLoading(false),
        onTimeUpdate: (time, dur) => {
          setCurrentTime(time);
          if (dur > 0) setAudioDuration(dur);
        },
        onEnded: () => {
          setIsPlaying(false);
          setCurrentTime(0);
        },
        onError: () => {
          setHasError(true);
          setIsPlaying(false);
          setIsLoading(false);
        },
        onPlay: () => setIsPlaying(true),
        onPause: () => setIsPlaying(false),
      });

      playerRef.current = player;
      
      try {
        await player.play();
      } catch (e) {
        setHasError(true);
        setIsLoading(false);
      }
      return;
    }

    const player = playerRef.current;
    if (!player) {
      console.error('[VoicePlayer] No player available');
      return;
    }

    try {
      if (isPlaying) {
        console.log('[VoicePlayer] Pausing');
        player.pause();
      } else {
        console.log('[VoicePlayer] Playing...');
        setIsLoading(true);
        
        // Stop any other playing audio first
        stopCurrentAudio();
        
        // Create a fresh player for each play to avoid stale state
        if (playerRef.current) {
          playerRef.current.cleanup();
        }
        
        const freshPlayer = createVoicePlayer(voiceUrl, {
          onCanPlay: () => setIsLoading(false),
          onTimeUpdate: (time, dur) => {
            setCurrentTime(time);
            if (dur > 0) setAudioDuration(dur);
          },
          onEnded: () => {
            setIsPlaying(false);
            setCurrentTime(0);
          },
          onError: (err) => {
            console.error('[VoicePlayer] Playback error:', err);
            setHasError(true);
            setIsPlaying(false);
            setIsLoading(false);
          },
          onPlay: () => setIsPlaying(true),
          onPause: () => setIsPlaying(false),
        });
        
        playerRef.current = freshPlayer;
        
        await freshPlayer.play();
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error('[VoicePlayer] Playback error:', error?.name, error?.message);
      
      if (error?.name === 'NotAllowedError') {
        toast.error('Tap again to play audio');
      } else if (error?.name === 'NotSupportedError') {
        toast.error('Audio format not supported');
        setHasError(true);
      } else {
        toast.error('Failed to play voice message');
        setHasError(true);
      }
      
      setIsPlaying(false);
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <div className={`flex items-center gap-3 min-w-[180px] ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
      <Button
        variant="ghost"
        size="icon"
        className={`h-10 w-10 rounded-full shrink-0 ${
          isOwnMessage 
            ? 'bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground' 
            : 'bg-primary/10 hover:bg-primary/20 text-primary'
        } ${hasError ? 'border-2 border-destructive' : ''}`}
        onClick={togglePlay}
        disabled={isLoading && !hasError}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : hasError ? (
          <Play className="w-5 h-5 ml-0.5 text-destructive" />
        ) : isPlaying ? (
          <Pause className="w-5 h-5" />
        ) : (
          <Play className="w-5 h-5 ml-0.5" />
        )}
      </Button>
      
      <div className="flex-1 space-y-1">
        {/* Waveform / Progress Bar - now with stable heights */}
        <div className="h-8 flex items-center gap-0.5">
          {waveformHeightsRef.current.map((height, i) => {
            const barProgress = (i / 25) * 100;
            const isActive = barProgress <= progress;
            return (
              <div
                key={i}
                className={`w-1 rounded-full transition-all ${
                  isOwnMessage
                    ? isActive ? 'bg-primary-foreground' : 'bg-primary-foreground/30'
                    : isActive ? 'bg-primary' : 'bg-primary/30'
                } ${hasError ? 'opacity-50' : ''}`}
                style={{ height: `${20 + height * 0.6}%` }}
              />
            );
          })}
        </div>
        
        {/* Duration / Error state */}
        <div className={`flex justify-between text-xs ${
          isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'
        }`}>
          {hasError ? (
            <span className="text-destructive">Tap to retry</span>
          ) : (
            <>
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(audioDuration)}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

VoiceNotePlayer.displayName = 'VoiceNotePlayer';

// Message Bubble Component
const MessageBubble = memo(({ 
  msg, 
  isOwnMessage,
  getSenderName,
  getSenderIcon 
}: { 
  msg: ChatMessage;
  isOwnMessage: boolean;
  getSenderName: (senderType: string, senderId: string) => string;
  getSenderIcon: (senderType: string) => React.ReactNode;
}) => {
  const isCustomerMessage = msg.sender_type === 'customer';
  const isVoiceMessage = msg.message_type === 'voice' && msg.voice_url;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isCustomerMessage ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[85%] ${isCustomerMessage ? 'order-2' : 'order-1'}`}>
        {/* Sender Label */}
        <div className={`flex items-center gap-1 mb-1 ${isCustomerMessage ? 'justify-end' : 'justify-start'}`}>
          <span className={`text-xs font-medium ${isCustomerMessage ? 'text-primary' : 'text-blue-500'}`}>
            {isOwnMessage ? 'You' : getSenderName(msg.sender_type, msg.sender_id)}
          </span>
          {getSenderIcon(msg.sender_type)}
        </div>
        
        {/* Message Bubble */}
        <div
          className={`px-4 py-3 shadow-sm ${
            isCustomerMessage
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground'
          }`}
          style={{
            borderRadius: isCustomerMessage 
              ? '18px 18px 4px 18px'
              : '18px 18px 18px 4px'
          }}
        >
          {isVoiceMessage ? (
            <VoiceNotePlayer 
              voiceUrl={msg.voice_url!} 
              duration={msg.voice_duration}
              isOwnMessage={isCustomerMessage}
            />
          ) : (
            <p className="text-sm leading-relaxed">{msg.message}</p>
          )}
          <p className={`text-xs mt-2 ${
            isCustomerMessage 
              ? 'text-primary-foreground/70 text-right' 
              : 'text-muted-foreground text-left'
          }`}>
            {format(new Date(msg.created_at), 'HH:mm')}
          </p>
        </div>
      </div>
    </motion.div>
  );
});

MessageBubble.displayName = 'MessageBubble';

// Voice Recorder Component
const VoiceRecorder = ({ 
  onRecorded,
  isUploading 
}: { 
  onRecorded: (blob: Blob, duration: number) => void;
  isUploading: boolean;
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const duration = recordingDuration;
        onRecorded(blob, duration);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setRecordingDuration(0);

      // Update duration every 100ms
      timerRef.current = setInterval(() => {
        setRecordingDuration((Date.now() - startTimeRef.current) / 1000);
      }, 100);

    } catch (err) {
      console.error('Failed to start recording:', err);
      toast.error('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isUploading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span className="text-sm text-primary">Uploading...</span>
      </div>
    );
  }

  if (isRecording) {
    return (
      <div className="flex items-center gap-3 px-3 py-2 bg-red-500/10 rounded-lg border border-red-500/30">
        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        <span className="text-sm font-medium text-red-600">{formatDuration(recordingDuration)}</span>
        <div className="flex-1" />
        <Button
          variant="destructive"
          size="sm"
          onClick={stopRecording}
          className="h-8"
        >
          <Square className="w-4 h-4 mr-1" />
          Stop
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={startRecording}
      className="shrink-0"
      title="Record voice note"
    >
      <Mic className="w-5 h-5" />
    </Button>
  );
};

const OrderChat = ({ orderId, riderRequestId, userType, isOpen, onClose }: OrderChatProps) => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [showLocationInfo, setShowLocationInfo] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useChatMessages(orderId, riderRequestId);
  const { data: orderParticipants } = useOrderParticipants(orderId);
  const { data: requestParticipants } = useRiderRequestParticipants(riderRequestId);
  const sendMessage = useSendMessage();
  const uploadVoiceNote = useUploadVoiceNote();

  const participants = orderId ? orderParticipants : requestParticipants;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = () => {
    if (!message.trim()) return;

    sendMessage.mutate({
      orderId,
      riderRequestId,
      message,
      senderType: userType,
      messageType: 'text',
    }, {
      onSuccess: () => setMessage(''),
      onError: (err) => toast.error('Failed to send message'),
    });
  };

  const handleVoiceRecorded = async (blob: Blob, duration: number) => {
    setIsUploading(true);
    try {
      // Upload voice note
      const result = await uploadVoiceNote.mutateAsync({
        orderId,
        riderRequestId,
        audioBlob: blob,
        duration,
      });

      // Send message with voice note
      await sendMessage.mutateAsync({
        orderId,
        riderRequestId,
        message: '🎤 Voice message',
        senderType: userType,
        messageType: 'voice',
        voiceUrl: result.path,
        voiceDuration: result.duration,
      });

      toast.success('Voice note sent!');
    } catch (err) {
      console.error('Failed to send voice note:', err);
      toast.error('Failed to send voice note');
    } finally {
      setIsUploading(false);
    }
  };

  const getSenderIcon = (senderType: string) => {
    switch (senderType) {
      case 'customer':
        return <User className="w-4 h-4" />;
      case 'business':
        return <Store className="w-4 h-4" />;
      case 'rider':
        return <Bike className="w-4 h-4" />;
      case 'admin':
        return <Shield className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getSenderName = (senderType: string, senderId: string) => {
    if (senderId === user?.id) return 'You';
    
    switch (senderType) {
      case 'customer':
        return 'Customer';
      case 'business':
        return (orderParticipants as any)?.business?.name || 'Restaurant';
      case 'rider':
        return participants?.rider?.name || 'Rider';
      case 'admin':
        return 'Admin';
      default:
        return 'Unknown';
    }
  };

  const getChatTitle = () => {
    if (orderId) {
      const status = orderParticipants?.status;
      if (status === 'placed' || status === 'preparing') {
        return userType === 'customer' ? 'Chat with Restaurant' : 'Chat with Customer';
      }
      if (status === 'on_way') {
        return userType === 'customer' ? 'Chat with Rider' : 'Chat with Customer';
      }
    }
    if (riderRequestId) {
      return userType === 'customer' ? 'Chat with Rider' : 'Chat with Customer';
    }
    return 'Order Chat';
  };

  // Get participant name without phone (privacy)
  const getParticipantName = () => {
    if (userType === 'customer') {
      const status = orderParticipants?.status || requestParticipants?.status;
      if (status === 'on_way' && participants?.rider?.name) {
        return participants.rider.name;
      }
      const business = (orderParticipants as any)?.business;
      if ((status === 'placed' || status === 'preparing') && business?.name) {
        return business.name;
      }
      if (riderRequestId && participants?.rider?.name) {
        return participants.rider.name;
      }
    }
    return null;
  };

  const getLocationInfo = () => {
    if (riderRequestId && requestParticipants) {
      return {
        pickup: requestParticipants.pickup_address,
        dropoff: requestParticipants.dropoff_address,
      };
    }
    if (orderId && orderParticipants) {
      return {
        pickup: orderParticipants.pickup_address,
        dropoff: orderParticipants.delivery_address,
      };
    }
    return null;
  };

  const participantName = getParticipantName();
  const locationInfo = getLocationInfo();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed inset-0 z-[100] bg-background flex flex-col md:inset-auto md:bottom-4 md:right-4 md:w-96 md:h-[500px] md:rounded-xl md:shadow-2xl md:border md:border-border overflow-hidden"
      >
        {/* ==================== HEADER (Fixed) ==================== */}
        <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between md:rounded-t-xl shrink-0">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            <span className="font-semibold">{getChatTitle()}</span>
            {participantName && (
              <Badge variant="secondary" className="text-xs ml-2">
                {participantName}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Privacy Notice Banner */}
        <div className="px-4 py-2 bg-blue-500/10 border-b border-blue-500/20 flex items-center gap-2 text-xs text-blue-600 shrink-0">
          <Shield className="w-4 h-4" />
          <span>Your phone number is private. Chat securely here.</span>
        </div>

        {/* ==================== LOCATION INFO (Collapsible) ==================== */}
        {locationInfo && (locationInfo.pickup || locationInfo.dropoff) && (
          <div className="shrink-0 border-b border-border">
            <button
              onClick={() => setShowLocationInfo(!showLocationInfo)}
              className="w-full px-4 py-2 flex items-center justify-between text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Map className="w-4 h-4" />
                {showLocationInfo ? 'Hide Location' : 'Show Location'}
              </span>
              {showLocationInfo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <AnimatePresence>
              {showLocationInfo && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <MiniMapPreview 
                    pickupAddress={locationInfo.pickup} 
                    dropoffAddress={locationInfo.dropoff} 
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ==================== CHAT MESSAGES (Scrollable) ==================== */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageCircle className="w-12 h-12 mb-2 opacity-50" />
              <p>No messages yet</p>
              <p className="text-sm">Start the conversation!</p>
              <p className="text-xs mt-2 text-center max-w-[200px]">
                You can send text or voice messages securely
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  isOwnMessage={msg.sender_id === user?.id}
                  getSenderName={getSenderName}
                  getSenderIcon={getSenderIcon}
                />
              ))}
              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ==================== INPUT BAR (Fixed at bottom) ==================== */}
        <div className="p-4 border-t border-border bg-background md:rounded-b-xl shrink-0">
          <div className="flex gap-2 items-center">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              className="flex-1"
              disabled={isUploading}
            />
            
            {/* Voice Recorder */}
            <VoiceRecorder 
              onRecorded={handleVoiceRecorded}
              isUploading={isUploading}
            />
            
            {/* Send Button */}
            <Button
              onClick={handleSend}
              disabled={!message.trim() || sendMessage.isPending || isUploading}
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OrderChat;
