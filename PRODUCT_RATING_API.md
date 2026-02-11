# 🛍️ PRODUCT RATING SYSTEM API
**Fast Haazir - Menu Item Rating Backend**

---

## 📋 OVERVIEW

Complete product/menu item rating system with:
- ✅ Individual product ratings (separate from restaurant rating)
- ✅ Quality, Value, Presentation ratings
- ✅ "Would order again" metric
- ✅ Photo reviews support
- ✅ Helpful vote system
- ✅ Global top products leaderboard
- ✅ Tag-based feedback

---

## 🗄️ DATABASE STRUCTURE

### **New Tables:**

| Table | Purpose |
|-------|---------|
| `product_ratings` | Individual product reviews by customers |
| `product_rating_stats` | Aggregated stats per product (avg, distribution) |

---

## 🔌 API ENDPOINTS

### 1. **Submit Product Rating**

```typescript
import { supabase } from '@/integrations/supabase/client';

const submitProductRating = async (
  orderId: string,
  productName: string,
  rating: number,
  review?: string,
  tags?: string[],
  wouldOrderAgain = true,
  qualityRating?: number,
  valueRating?: number,
  presentationRating?: number,
  imageUrl?: string
) => {
  const { data, error } = await supabase.rpc('submit_product_rating', {
    p_order_id: orderId,
    p_customer_id: (await supabase.auth.getUser()).data.user?.id,
    p_product_name: productName,
    p_rating: rating,
    p_review: review,
    p_tags: tags,
    p_would_order_again: wouldOrderAgain,
    p_quality_rating: qualityRating,
    p_value_rating: valueRating,
    p_presentation_rating: presentationRating,
    p_image_url: imageUrl
  });

  if (error) throw error;
  return data;
};

// Example: Rate "Chicken Sajji Full"
await submitProductRating(
  'order-uuid-123',
  'Chicken Sajji Full',
  5.0,
  'Best Sajji I ever had! Perfectly cooked and very flavorful.',
  ['fresh', 'tasty', 'good_portion', 'well_cooked'],
  true,
  5.0, // quality
  4.5, // value
  5.0  // presentation
);
```

**Response:**
```json
{
  "success": true,
  "rating_id": "uuid",
  "product_new_rating": 4.87
}
```

---

### 2. **Get Product Rating Details**

```typescript
const getProductDetails = async (businessId: string, productName: string) => {
  const { data, error } = await supabase.rpc('get_product_rating_details', {
    p_business_id: businessId,
    p_product_name: productName
  });
  
  return data;
};
```

**Response:**
```json
{
  "business_id": "uuid",
  "product_name": "Chicken Sajji Full",
  "average_rating": 4.87,
  "total_ratings": 145,
  "rating_distribution": {
    "5_star": 120,
    "4_star": 18,
    "3_star": 5,
    "2_star": 2,
    "1_star": 0
  },
  "quality_metrics": {
    "quality": 4.92,
    "value": 4.65,
    "presentation": 4.88,
    "would_order_again_pct": 94.5
  },
  "top_positive_tags": ["fresh", "tasty", "good_portion"],
  "recent_reviews": [
    {
      "rating": 5.0,
      "review": "Amazing texture and flavor!",
      "tags": ["fresh", "well_cooked"],
      "would_order_again": true,
      "image_url": "https://...",
      "helpful_count": 12,
      "created_at": "2026-02-11T19:00:00Z"
    }
  ]
}
```

---

### 3. **Get Top Products by Restaurant**

```typescript
const getTopProducts = async (businessId: string, limit = 10) => {
  const { data, error } = await supabase.rpc('get_top_products_by_restaurant', {
    p_business_id: businessId,
    p_limit: limit
  });
  
  return data;
};
```

**Response:**
```json
[
  {
    "product_name": "Chicken Sajji Full",
    "average_rating": 4.87,
    "total_ratings": 145,
    "would_order_again_pct": 94.5
  },
  {
    "product_name": "Mutton Karahi",
    "average_rating": 4.82,
    "total_ratings": 98,
    "would_order_again_pct": 92.0
  }
]
```

---

### 4. **Get Global Top Products**

```typescript
const getGlobalTopProducts = async (limit = 20) => {
  const { data, error } = await supabase.rpc('get_top_products_global', {
    p_limit: limit
  });
  
  return data;
};
```

**Response:**
```json
[
  {
    "business_id": "uuid",
    "business_name": "Sajji House",
    "product_name": "Chicken Sajji Full",
    "average_rating": 4.92,
    "total_ratings": 234
  },
  {
    "business_id": "uuid",
    "business_name": "Khan Baba Restaurant",
    "product_name": "Mutton Karahi",
    "average_rating": 4.88,
    "total_ratings": 189
  }
]
```

---

### 5. **Mark Review as Helpful**

```typescript
const markHelpful = async (ratingId: string) => {
  const { error } = await supabase.rpc('mark_review_helpful', {
    p_rating_id: ratingId
  });
  
  if (error) throw error;
};
```

---

### 6. **Get Customer's Product Ratings**

```typescript
const getMyProductRatings = async (customerId: string) => {
  const { data, error } = await supabase.rpc('get_customer_product_ratings', {
    p_customer_id: customerId
  });
  
  return data;
};
```

**Response:**
```json
[
  {
    "product_name": "Chicken Sajji Full",
    "business_name": "Sajji House",
    "rating": 5.0,
    "review": "Best Sajji ever!",
    "created_at": "2026-02-11T19:00:00Z"
  }
]
```

---

## 🏷️ PRODUCT RATING TAGS

### **Positive Tags**
```typescript
const PRODUCT_POSITIVE_TAGS = [
  'fresh',
  'tasty',
  'good_portion',
  'well_cooked',
  'authentic',
  'spicy_perfect',
  'tender',
  'aromatic',
  'value_for_money',
  'hot_delivery',
  'beautiful_presentation'
];
```

### **Negative Tags**
```typescript
const PRODUCT_NEGATIVE_TAGS = [
  'cold',
  'overcooked',
  'undercooked',
  'bland',
  'too_spicy',
  'small_portion',
  'stale',
  'burnt',
  'soggy',
  'overpriced',
  'poor_packaging'
];
```

---

## 🎨 UI COMPONENT EXAMPLE

### **Product Rating Card**

```tsx
import { Star, ThumbsUp } from 'lucide-react';

interface ProductRatingCardProps {
  productName: string;
  rating: number;
  totalRatings: number;
  wouldOrderAgain: number;
  onRate: () => void;
}

const ProductRatingCard = ({ 
  productName, 
  rating, 
  totalRatings, 
  wouldOrderAgain,
  onRate 
}: ProductRatingCardProps) => {
  return (
    <div className="border rounded-lg p-4 hover:shadow-md transition">
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-bold text-lg">{productName}</h3>
        <button 
          onClick={onRate}
          className="text-sm text-primary hover:underline"
        >
          Rate
        </button>
      </div>
      
      <div className="flex items-center gap-2 mb-2">
        <div className="flex">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-4 h-4 ${
                star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
              }`}
            />
          ))}
        </div>
        <span className="font-bold">{rating.toFixed(1)}</span>
        <span className="text-sm text-muted-foreground">({totalRatings} reviews)</span>
      </div>
      
      <div className="flex items-center gap-1 text-sm text-green-600">
        <ThumbsUp className="w-4 h-4" />
        <span>{wouldOrderAgain}% would order again</span>
      </div>
    </div>
  );
};
```

---

### **Product Rating Modal**

```tsx
const ProductRatingModal = ({ 
  productName, 
  orderId, 
  onSubmit 
}: ProductRatingModalProps) => {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [wouldOrderAgain, setWouldOrderAgain] = useState(true);

  const handleSubmit = async () => {
    await submitProductRating(
      orderId,
      productName,
      rating,
      review,
      selectedTags,
      wouldOrderAgain
    );
    onSubmit();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Rate {productName}</h2>
      
      {/* Star Rating */}
      <div>
        <label className="block mb-2">Overall Rating</label>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-8 h-8 cursor-pointer ${
                star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
              }`}
              onClick={() => setRating(star)}
            />
          ))}
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="block mb-2">What did you like?</label>
        <div className="flex flex-wrap gap-2">
          {PRODUCT_POSITIVE_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => {
                setSelectedTags(
                  selectedTags.includes(tag)
                    ? selectedTags.filter((t) => t !== tag)
                    : [...selectedTags, tag]
                );
              }}
              className={`px-3 py-1 rounded-full text-sm ${
                selectedTags.includes(tag)
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {tag.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Review */}
      <textarea
        className="w-full p-3 border rounded-lg"
        placeholder="Share your experience..."
        value={review}
        onChange={(e) => setReview(e.target.value)}
        rows={4}
      />

      {/* Would Order Again */}
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={wouldOrderAgain}
          onChange={(e) => setWouldOrderAgain(e.target.checked)}
        />
        I would order this again
      </label>

      <button
        onClick={handleSubmit}
        className="w-full bg-primary text-white py-3 rounded-lg font-bold"
      >
        Submit Rating
      </button>
    </div>
  );
};
```

---

## 📊 ADMIN QUERIES

### Get Low-Rated Products
```sql
SELECT 
  b.name as restaurant,
  ps.product_name,
  ps.average_rating,
  ps.total_ratings
FROM product_rating_stats ps
JOIN businesses b ON b.id = ps.business_id
WHERE ps.average_rating < 3.5 AND ps.total_ratings >= 5
ORDER BY ps.average_rating ASC;
```

### Top Products by "Would Order Again"
```sql
SELECT * FROM product_rating_stats
WHERE total_ratings >= 10
ORDER BY would_order_again_percentage DESC
LIMIT 20;
```

---

## ✅ DEPLOYMENT READY

Run `PRODUCT_RATING_SYSTEM.sql` in Supabase SQL Editor to activate! 🚀
