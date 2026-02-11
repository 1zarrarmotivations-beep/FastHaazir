import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    Star,
    Users,
    Store,
    Package
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardStats {
    riders: {
        average_rating: number;
        total_rated: number;
        excellent_count: number;
        poor_count: number;
    };
    restaurants: {
        average_rating: number;
        total_rated: number;
        excellent_count: number;
        poor_count: number;
    };
    products: {
        average_rating: number;
        total_rated: number;
        excellent_count: number;
        poor_count: number;
    };
    recent_activity: {
        total_reviews_today: number;
        total_reviews_week: number;
        avg_rating_today: number;
    };
}

interface RatingTrend {
    date: string;
    avg_rider_rating: number;
    avg_restaurant_rating: number;
    avg_product_rating: number;
    total_ratings: number;
}

interface LowRatedEntity {
    rider_id?: string;
    rider_name?: string;
    business_id?: string;
    business_name?: string;
    product_name?: string;
    average_rating: number;
    total_ratings: number;
    recent_poor_ratings: number;
    status: 'CRITICAL' | 'WARNING' | 'NEEDS_ATTENTION';
}

const RatingAnalyticsDashboard = () => {
    // Fetch dashboard stats
    const { data: dashboardStats, isLoading: statsLoading } = useQuery({
        queryKey: ['rating-dashboard-stats'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_rating_dashboard_stats');
            if (error) throw error;
            return data as DashboardStats;
        },
        refetchInterval: 60000 // Refresh every minute
    });

    // Fetch rating trends
    const { data: ratingTrends, isLoading: trendsLoading } = useQuery({
        queryKey: ['rating-trends'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_rating_trends_daily', { p_days: 30 });
            if (error) throw error;
            return data as RatingTrend[];
        }
    });

    // Fetch low-rated riders
    const { data: lowRatedRiders, isLoading: ridersLoading } = useQuery({
        queryKey: ['low-rated-riders'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_low_rated_riders', {
                p_min_ratings: 5,
                p_threshold: 3.5
            });
            if (error) throw error;
            return data as LowRatedEntity[];
        }
    });

    // Fetch low-rated restaurants
    const { data: lowRatedRestaurants, isLoading: restaurantsLoading } = useQuery({
        queryKey: ['low-rated-restaurants'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_low_rated_restaurants', {
                p_min_ratings: 5,
                p_threshold: 3.5
            });
            if (error) throw error;
            return data as LowRatedEntity[];
        }
    });

    // Fetch low-rated products
    const { data: lowRatedProducts, isLoading: productsLoading } = useQuery({
        queryKey: ['low-rated-products'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_low_rated_products', {
                p_min_ratings: 3,
                p_threshold: 3.5
            });
            if (error) throw error;
            return data as LowRatedEntity[];
        }
    });

    // Fetch reviews for moderation
    const { data: reviewsForModeration, isLoading: reviewsLoading } = useQuery({
        queryKey: ['reviews-moderation'],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_reviews_for_moderation');
            if (error) throw error;
            return data;
        }
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'CRITICAL': return 'destructive';
            case 'WARNING': return 'secondary';
            default: return 'secondary';
        }
    };

    const renderStars = (rating: number) => {
        return (
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        className={`w-4 h-4 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                            }`}
                    />
                ))}
            </div>
        );
    };

    if (statsLoading) {
        return (
            <div className="p-6 space-y-4">
                <Skeleton className="h-12 w-64" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Rating Analytics</h1>
                    <p className="text-muted-foreground">Monitor and manage ratings across the platform</p>
                </div>
                <Button variant="outline" onClick={() => window.location.reload()}>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Riders Card */}
                <Card className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Riders</p>
                            <h3 className="text-2xl font-bold">{dashboardStats?.riders.average_rating.toFixed(2)}</h3>
                        </div>
                        <div className="bg-blue-100 p-3 rounded-full">
                            <Users className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Rated:</span>
                            <span className="font-semibold">{dashboardStats?.riders.total_rated}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-green-600">Excellent (4.5+):</span>
                            <span className="font-semibold">{dashboardStats?.riders.excellent_count}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-red-600">Poor (&lt;3.5):</span>
                            <span className="font-semibold">{dashboardStats?.riders.poor_count}</span>
                        </div>
                    </div>
                </Card>

                {/* Restaurants Card */}
                <Card className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Restaurants</p>
                            <h3 className="text-2xl font-bold">{dashboardStats?.restaurants.average_rating.toFixed(2)}</h3>
                        </div>
                        <div className="bg-green-100 p-3 rounded-full">
                            <Store className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Rated:</span>
                            <span className="font-semibold">{dashboardStats?.restaurants.total_rated}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-green-600">Excellent (4.5+):</span>
                            <span className="font-semibold">{dashboardStats?.restaurants.excellent_count}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-red-600">Poor (&lt;3.5):</span>
                            <span className="font-semibold">{dashboardStats?.restaurants.poor_count}</span>
                        </div>
                    </div>
                </Card>

                {/* Products Card */}
                <Card className="p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Products</p>
                            <h3 className="text-2xl font-bold">{dashboardStats?.products.average_rating.toFixed(2)}</h3>
                        </div>
                        <div className="bg-purple-100 p-3 rounded-full">
                            <Package className="w-6 h-6 text-purple-600" />
                        </div>
                    </div>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Total Rated:</span>
                            <span className="font-semibold">{dashboardStats?.products.total_rated}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-green-600">Excellent (4.5+):</span>
                            <span className="font-semibold">{dashboardStats?.products.excellent_count}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-red-600">Poor (&lt;3.5):</span>
                            <span className="font-semibold">{dashboardStats?.products.poor_count}</span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Tabs for different views */}
            <Tabs defaultValue="trends" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="trends">Trends</TabsTrigger>
                    <TabsTrigger value="alerts">
                        Alerts
                        {(lowRatedRiders?.length || 0) + (lowRatedRestaurants?.length || 0) > 0 && (
                            <Badge variant="destructive" className="ml-2">
                                {(lowRatedRiders?.length || 0) + (lowRatedRestaurants?.length || 0)}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="moderation">
                        Moderation
                        {reviewsForModeration?.length > 0 && (
                            <Badge variant="warning" className="ml-2">{reviewsForModeration.length}</Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* Trends Tab */}
                <TabsContent value="trends" className="space-y-4">
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold mb-4">Rating Trends (Last 30 Days)</h3>
                        {trendsLoading ? (
                            <Skeleton className="h-80" />
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={ratingTrends}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="date" />
                                    <YAxis domain={[0, 5]} />
                                    <Tooltip />
                                    <Legend />
                                    <Line
                                        type="monotone"
                                        dataKey="avg_rider_rating"
                                        stroke="#3b82f6"
                                        name="Riders"
                                        strokeWidth={2}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="avg_restaurant_rating"
                                        stroke="#10b981"
                                        name="Restaurants"
                                        strokeWidth={2}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="avg_product_rating"
                                        stroke="#8b5cf6"
                                        name="Products"
                                        strokeWidth={2}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        )}
                    </Card>
                </TabsContent>

                {/* Alerts Tab */}
                <TabsContent value="alerts" className="space-y-4">
                    {/* Low-Rated Riders */}
                    <Card className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                            <h3 className="text-lg font-semibold">Low-Rated Riders</h3>
                            <Badge variant="destructive">{lowRatedRiders?.length || 0}</Badge>
                        </div>
                        <div className="space-y-3">
                            {ridersLoading ? (
                                <Skeleton className="h-20" />
                            ) : lowRatedRiders && lowRatedRiders.length > 0 ? (
                                lowRatedRiders.map((rider) => (
                                    <div key={rider.rider_id} className="flex justify-between items-center p-4 border rounded-lg">
                                        <div>
                                            <p className="font-semibold">{rider.rider_name}</p>
                                            <p className="text-sm text-muted-foreground">{rider.rider_phone}</p>
                                            <div className="flex items-center gap-4 mt-2 text-sm">
                                                {renderStars(rider.average_rating)}
                                                <span className="font-semibold">{rider.average_rating.toFixed(2)}</span>
                                                <span className="text-muted-foreground">({rider.total_ratings} ratings)</span>
                                                <span className="text-red-600">{rider.recent_poor_ratings} poor in last 7 days</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Badge variant={getStatusColor(rider.status)}>{rider.status}</Badge>
                                            <Button size="sm" variant="outline">Review</Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-muted-foreground py-8">No low-rated riders at the moment 🎉</p>
                            )}
                        </div>
                    </Card>

                    {/* Low-Rated Restaurants */}
                    <Card className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <AlertTriangle className="w-5 h-5 text-orange-600" />
                            <h3 className="text-lg font-semibold">Low-Rated Restaurants</h3>
                            <Badge variant="warning">{lowRatedRestaurants?.length || 0}</Badge>
                        </div>
                        <div className="space-y-3">
                            {restaurantsLoading ? (
                                <Skeleton className="h-20" />
                            ) : lowRatedRestaurants && lowRatedRestaurants.length > 0 ? (
                                lowRatedRestaurants.map((restaurant) => (
                                    <div key={restaurant.business_id} className="flex justify-between items-center p-4 border rounded-lg">
                                        <div>
                                            <p className="font-semibold">{restaurant.business_name}</p>
                                            <div className="flex items-center gap-4 mt-2 text-sm">
                                                {renderStars(restaurant.average_rating)}
                                                <span className="font-semibold">{restaurant.average_rating.toFixed(2)}</span>
                                                <span className="text-muted-foreground">({restaurant.total_ratings} ratings)</span>
                                                <span className="text-red-600">{restaurant.recent_poor_ratings} poor in last 7 days</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Badge variant={getStatusColor(restaurant.status)}>{restaurant.status}</Badge>
                                            <Button size="sm" variant="outline">Contact</Button>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-muted-foreground py-8">All restaurants performing well! 🎉</p>
                            )}
                        </div>
                    </Card>

                    {/* Low-Rated Products */}
                    <Card className="p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <AlertTriangle className="w-5 h-5 text-yellow-600" />
                            <h3 className="text-lg font-semibold">Low-Rated Products</h3>
                            <Badge variant="secondary">{lowRatedProducts?.length || 0}</Badge>
                        </div>
                        <div className="space-y-3">
                            {productsLoading ? (
                                <Skeleton className="h-20" />
                            ) : lowRatedProducts && lowRatedProducts.length > 0 ? (
                                lowRatedProducts.map((product, index) => (
                                    <div key={index} className="flex justify-between items-center p-4 border rounded-lg">
                                        <div>
                                            <p className="font-semibold">{product.product_name}</p>
                                            <p className="text-sm text-muted-foreground">{product.business_name}</p>
                                            <div className="flex items-center gap-4 mt-2 text-sm">
                                                {renderStars(product.average_rating)}
                                                <span className="font-semibold">{product.average_rating.toFixed(2)}</span>
                                                <span className="text-muted-foreground">({product.total_ratings} ratings)</span>
                                            </div>
                                        </div>
                                        <Badge variant={getStatusColor(product.status)}>{product.status}</Badge>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-muted-foreground py-8">All products rated well! 🎉</p>
                            )}
                        </div>
                    </Card>
                </TabsContent>

                {/* Moderation Tab */}
                <TabsContent value="moderation" className="space-y-4">
                    <Card className="p-6">
                        <h3 className="text-lg font-semibold mb-4">Reviews Requiring Moderation</h3>
                        <div className="space-y-3">
                            {reviewsLoading ? (
                                <Skeleton className="h-20" />
                            ) : reviewsForModeration && reviewsForModeration.length > 0 ? (
                                reviewsForModeration.map((review: any) => (
                                    <div key={review.review_id} className="p-4 border rounded-lg space-y-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <Badge variant="outline">{review.review_type}</Badge>
                                                <p className="font-semibold mt-2">{review.entity_name}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                {renderStars(review.rating)}
                                            </div>
                                        </div>
                                        <p className="text-sm italic text-muted-foreground">"{review.review_text}"</p>
                                        <div className="flex justify-between items-center">
                                            <Badge variant="warning">{review.reason}</Badge>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="outline">Approve</Button>
                                                <Button size="sm" variant="destructive">Remove</Button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-center text-muted-foreground py-8">No reviews requiring moderation 🎉</p>
                            )}
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default RatingAnalyticsDashboard;
