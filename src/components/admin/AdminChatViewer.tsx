import { useState, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  X, 
  User, 
  Store, 
  Bike, 
  EyeOff,
  Play,
  Pause,
  Shield,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useChatMessages, ChatMessage } from '@/hooks/useChat';
import { format } from 'date-fns';

interface AdminChatViewerProps {
  orderId?: string;
  riderRequestId?: string;
  isOpen: boolean;
  onClose: () => void;
  orderInfo?: {
    customerLabel?: string;
    riderName?: string;
    businessName?: string;
  };
}

// Voice Note Player Component (Read-only) - Fixed for Android WebView compatibility
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
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration || 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveformHeightsRef = useRef<number[]>([]);

  // Generate stable waveform heights once
  if (waveformHeightsRef.current.length === 0) {
    waveformHeightsRef.current = Array.from({ length: 25 }, () => Math.random() * 100);
  }

  useEffect(() => {
    if (!voiceUrl) {
      console.error('[VoicePlayer] No voice URL provided');
      setHasError(true);
      setIsLoading(false);
      return;
    }

    console.log('[VoicePlayer] Initializing audio with URL:', voiceUrl.substring(0, 100) + '...');
    
    const audio = new Audio();
    audioRef.current = audio;
    
    audio.crossOrigin = 'anonymous';
    audio.preload = 'metadata';

    const handleLoadedMetadata = () => {
      console.log('[VoicePlayer] Audio metadata loaded, duration:', audio.duration);
      setAudioDuration(audio.duration || duration || 0);
      setIsLoading(false);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handleError = (e: Event) => {
      const audioError = (e.target as HTMLAudioElement)?.error;
      console.error('[VoicePlayer] Audio error:', {
        code: audioError?.code,
        message: audioError?.message,
      });
      setHasError(true);
      setIsLoading(false);
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    audio.src = voiceUrl;
    audio.load();

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.src = '';
      audioRef.current = null;
    };
  }, [voiceUrl, duration]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (hasError) {
      setHasError(false);
      setIsLoading(true);
      audio.load();
      return;
    }

    try {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        if (audio.readyState < 2) {
          setIsLoading(true);
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Load timeout')), 10000);
            const onCanPlay = () => {
              clearTimeout(timeout);
              audio.removeEventListener('canplay', onCanPlay);
              resolve();
            };
            audio.addEventListener('canplay', onCanPlay);
          });
          setIsLoading(false);
        }

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
        }
        setIsPlaying(true);
      }
    } catch (error: any) {
      console.error('[VoicePlayer] Playback error:', error.message);
      setHasError(true);
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
        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
      </Button>
      
      <div className="flex-1 space-y-1">
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

// Message Bubble Component (Admin View - Shows full sender info)
const AdminMessageBubble = memo(({ 
  msg,
  orderInfo
}: { 
  msg: ChatMessage;
  orderInfo?: {
    customerLabel?: string;
    riderName?: string;
    businessName?: string;
  };
}) => {
  const isCustomerMessage = msg.sender_type === 'customer';
  const isVoiceMessage = msg.message_type === 'voice' && msg.voice_url;
  
  const getSenderLabel = () => {
    switch (msg.sender_type) {
      case 'customer':
        return orderInfo?.customerLabel ? `${orderInfo.customerLabel}` : 'Customer';
      case 'rider':
        return orderInfo?.riderName ? `Rider: ${orderInfo.riderName}` : 'Rider';
      case 'business':
        return orderInfo?.businessName ? `${orderInfo.businessName}` : 'Business';
      case 'admin':
        return 'Admin';
      default:
        return 'Unknown';
    }
  };

  const getSenderIcon = () => {
    switch (msg.sender_type) {
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
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isCustomerMessage ? 'justify-end' : 'justify-start'}`}
    >
      <div className={`max-w-[85%] ${isCustomerMessage ? 'order-2' : 'order-1'}`}>
        {/* Sender Label with Icon */}
        <div className={`flex items-center gap-1.5 mb-1 ${isCustomerMessage ? 'justify-end' : 'justify-start'}`}>
          {getSenderIcon()}
          <span className={`text-xs font-medium ${
            msg.sender_type === 'customer' ? 'text-blue-600' : 
            msg.sender_type === 'rider' ? 'text-green-600' : 
            msg.sender_type === 'business' ? 'text-orange-600' : 'text-purple-600'
          }`}>
            {getSenderLabel()}
          </span>
        </div>
        
        {/* Message Bubble */}
        <div
          className={`px-4 py-3 shadow-sm ${
            isCustomerMessage
              ? 'bg-blue-500 text-white'
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
          <p className={`text-xs mt-2 flex items-center gap-1 ${
            isCustomerMessage 
              ? 'text-white/70 justify-end' 
              : 'text-muted-foreground justify-start'
          }`}>
            <Clock className="w-3 h-3" />
            {format(new Date(msg.created_at), 'MMM d, HH:mm:ss')}
          </p>
        </div>
      </div>
    </motion.div>
  );
});

AdminMessageBubble.displayName = 'AdminMessageBubble';

// Main Admin Chat Viewer Component
const AdminChatViewer = ({ 
  orderId, 
  riderRequestId, 
  isOpen, 
  onClose,
  orderInfo 
}: AdminChatViewerProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Use existing chat messages hook - READ ONLY, no write operations
  const { data: messages = [], isLoading } = useChatMessages(orderId, riderRequestId);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed inset-0 z-[100] bg-background flex flex-col md:inset-auto md:bottom-4 md:right-4 md:w-[450px] md:h-[600px] md:rounded-xl md:shadow-2xl md:border md:border-border overflow-hidden"
      >
        {/* ==================== HEADER ==================== */}
        <div className="bg-slate-800 text-white p-4 flex items-center justify-between md:rounded-t-xl shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative">
              <MessageCircle className="w-5 h-5" />
              <EyeOff className="w-3 h-3 absolute -bottom-1 -right-1 text-amber-400" />
            </div>
            <div>
              <span className="font-semibold">Admin Chat Monitor</span>
              <p className="text-xs text-slate-300">Order #{(orderId || riderRequestId)?.slice(0, 8)}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/20"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* ==================== SILENT MODE BANNER ==================== */}
        <div className="px-4 py-3 bg-amber-500/10 border-b border-amber-500/30 flex items-center gap-3 shrink-0">
          <div className="p-2 rounded-full bg-amber-500/20">
            <EyeOff className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-700">Silent Mode</p>
            <p className="text-xs text-amber-600/80">
              You are viewing this chat privately. Participants are not notified.
            </p>
          </div>
        </div>

        {/* ==================== PARTICIPANT INFO ==================== */}
        <div className="px-4 py-2 bg-muted/50 border-b border-border flex items-center gap-4 text-xs shrink-0">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-blue-500" />
            <span className="text-muted-foreground">
              {orderInfo?.customerLabel || 'Customer'}
            </span>
          </div>
          <span className="text-muted-foreground">↔</span>
          <div className="flex items-center gap-1.5">
            <Bike className="w-3.5 h-3.5 text-green-500" />
            <span className="text-muted-foreground">
              {orderInfo?.riderName || 'Rider'}
            </span>
          </div>
          {orderInfo?.businessName && (
            <>
              <span className="text-muted-foreground">•</span>
              <div className="flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-muted-foreground">{orderInfo.businessName}</span>
              </div>
            </>
          )}
        </div>

        {/* ==================== CHAT MESSAGES (Read-only) ==================== */}
        <div className="flex-1 overflow-y-auto p-4 min-h-0 bg-slate-50/50">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageCircle className="w-12 h-12 mb-2 opacity-50" />
              <p>No messages in this conversation</p>
              <p className="text-sm">Messages will appear here in real-time</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <AdminMessageBubble
                  key={msg.id}
                  msg={msg}
                  orderInfo={orderInfo}
                />
              ))}
              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ==================== FOOTER (Read-only notice) ==================== */}
        <div className="p-4 border-t border-border bg-slate-100 md:rounded-b-xl shrink-0">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Shield className="w-4 h-4" />
            <span>Read-only mode • Messages: {messages.length}</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AdminChatViewer;
