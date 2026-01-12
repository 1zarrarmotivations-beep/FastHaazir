import React from 'react';
import { motion } from 'framer-motion';
import { Star, Clock, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface BusinessCardProps {
  id: string;
  name: string;
  image: string;
  rating: number;
  eta: string;
  distance: string;
  category: string;
  featured?: boolean;
  priority?: boolean;
  onClick?: () => void;
}

// Optimize Unsplash URLs for better performance
const optimizeImageUrl = (url: string): string => {
  if (!url.includes('unsplash.com')) return url;
  
  // Parse existing URL and rebuild with optimal params
  // Use exact display dimensions (200x112), WebP format, and aggressive compression (q=40)
  const baseUrl = url.split('?')[0];
  return `${baseUrl}?w=200&h=112&fit=crop&auto=format&q=40`;
};

const BusinessCard: React.FC<BusinessCardProps> = ({
  id,
  name,
  image,
  rating,
  eta,
  distance,
  category,
  featured,
  priority,
  onClick,
}) => {
  const optimizedImage = optimizeImageUrl(image);
  
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card 
        variant="elevated"
        className="overflow-hidden cursor-pointer min-w-[200px] w-[200px]"
        onClick={onClick}
      >
        <div className="relative">
          <img 
            src={optimizedImage} 
            alt={name}
            className="w-full h-28 object-cover"
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "low"}
            decoding={priority ? "sync" : "async"}
            width={200}
            height={112}
          />
          {featured && (
            <Badge className="absolute top-2 left-2">
              Featured
            </Badge>
          )}
          <div className="absolute bottom-2 right-2 bg-card/90 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1">
            <Star className="w-3 h-3 text-primary fill-primary" />
            <span className="text-xs font-semibold">{rating}</span>
          </div>
        </div>
        <div className="p-3">
          <h3 className="font-semibold text-sm text-foreground truncate">{name}</h3>
          <p className="text-xs text-muted-foreground mb-2">{category}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{eta}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>{distance}</span>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default BusinessCard;
