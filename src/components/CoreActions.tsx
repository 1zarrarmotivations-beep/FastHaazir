import React from 'react';
import { motion } from 'framer-motion';
import { Bike, Utensils, ShoppingBasket, ChevronRight, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface ServiceCardProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  onClick: () => void;
  colorClass: string;
  className?: string;
  delay?: number;
  featured?: boolean;
}

const ServiceCard: React.FC<ServiceCardProps> = ({
  title,
  subtitle,
  icon,
  onClick,
  colorClass,
  className = "",
  delay = 0,
  featured = false
}) => (
  <motion.button
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay, type: "spring", stiffness: 400, damping: 17 }}
    whileHover={{ y: -5, scale: 1.02 }}
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className={`relative overflow-hidden group rounded-[28px] p-5 text-left flex flex-col justify-between ${className} ${colorClass} shadow-xl ring-1 ring-white/10`}
  >
    {/* Glass Shine Effect */}
    <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine" />

    {/* Background Decorative Blobs */}
    <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/20 rounded-full blur-3xl opacity-60 pointer-events-none group-hover:scale-150 transition-transform duration-700" />
    <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-black/10 rounded-full blur-3xl opacity-40 pointer-events-none" />

    {/* Header Section: Icon & Content */}
    <div className="flex flex-col gap-4 relative z-10 h-full">
      {/* Icon Capsule with Glow */}
      <div className="flex justify-between items-start">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center backdrop-blur-xl bg-white/20 shadow-inner ring-1 ring-white/30 group-hover:rotate-6 transition-transform duration-300`}>
          {icon}
        </div>

        {/* Helper Arrow Icon */}
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300">
          <ArrowRight className="w-4 h-4 text-white" />
        </div>
      </div>

      {/* Text Area */}
      <div className="mt-auto">
        <h3 className="text-xl font-bold text-white tracking-wide leading-tight drop-shadow-sm">
          {title}
        </h3>
        <p className="text-sm text-white/90 font-medium mt-1 leading-relaxed opacity-90">
          {subtitle}
        </p>
      </div>
    </div>
  </motion.button>
);

const CoreActions: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <section className="px-4 py-5 space-y-5">
      {/* Service Cards Grid - 2+1 Layout */}
      <div className="space-y-4">
        {/* Top Row: Assign Rider & Order Food - Updated Gradients */}
        <div className="grid grid-cols-2 gap-4">
          <ServiceCard
            title={t('home.assignRider', 'Assign Rider')}
            subtitle={t('home.onDemandDelivery', 'On-demand delivery')}
            icon={<Bike className="w-7 h-7 text-white drop-shadow-md" />}
            colorClass="bg-gradient-to-br from-[#3b82f6] via-[#2563eb] to-[#1d4ed8]"
            onClick={() => navigate('/assign-rider')}
            delay={0.1}
            className="h-[200px]"
          />

          <ServiceCard
            title={t('home.orderFood', 'Order Food')}
            subtitle={t('home.restaurantsDining', 'Restaurants & dining')}
            icon={<Utensils className="w-7 h-7 text-white drop-shadow-md" />}
            colorClass="bg-gradient-to-br from-[#f97316] via-[#ea580c] to-[#c2410c]"
            onClick={() => navigate('/restaurants')}
            delay={0.2}
            className="h-[200px]"
          />
        </div>

        {/* Bottom Row: Grocery (Featured) - Premium Green Gradient */}
        <ServiceCard
          title={t('home.orderGrocery', 'Order Grocery')}
          subtitle={t('home.dailyEssentials', 'Daily essentials')}
          icon={<ShoppingBasket className="w-8 h-8 text-white drop-shadow-md" />}
          colorClass="bg-gradient-to-br from-[#10b981] via-[#059669] to-[#047857]"
          onClick={() => navigate('/restaurants?type=grocery')}
          delay={0.3}
          featured={true}
          className="h-[150px] w-full"
        />
      </div>
    </section>
  );
};

export default CoreActions;
