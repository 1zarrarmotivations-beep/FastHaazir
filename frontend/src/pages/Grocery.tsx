import { motion } from "framer-motion";
import { ArrowLeft, Search, Filter, Store } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import BusinessCard from "@/components/BusinessCard";
import BottomNav from "@/components/BottomNav";
import { useBusinesses } from "@/hooks/useBusinesses";

const Grocery = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const { data: groceryStores, isLoading } = useBusinesses('grocery');

  useEffect(() => {
    document.title = "Fast Haazir – Grocery Delivery in Quetta | Fast & Fresh";
  }, []);

  const filteredStores = groceryStores?.filter(store =>
    store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    store.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="mobile-container bg-background min-h-screen pb-24">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border"
      >
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="icon" size="icon-sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-bold text-foreground text-lg">Grocery Stores</h1>
            <p className="text-xs text-muted-foreground">
              Fresh produce & daily essentials
            </p>
          </div>
          <Button variant="ghost" size="icon">
            <Filter className="w-5 h-5" />
          </Button>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search grocery stores..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted border-0"
            />
          </div>
        </div>
      </motion.header>

      {/* Content */}
      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-muted rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredStores && filteredStores.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {filteredStores.map((store, index) => (
              <motion.div
                key={store.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <BusinessCard
                  id={store.id}
                  name={store.name}
                  image={store.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400'}
                  rating={store.rating || 4.5}
                  eta={store.eta || '20-30 min'}
                  distance={store.distance || '1.0 km'}
                  category={store.category || 'Grocery'}
                  featured={store.featured}
                  onClick={() => navigate(`/restaurant/${store.id}`)}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Store className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">No stores found</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {searchQuery ? "Try a different search term" : "No grocery stores available"}
            </p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Grocery;
