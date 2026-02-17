# Supabase Storage Bucket Setup for Rider Documents

## 🎯 Create Storage Bucket

You need to create a storage bucket in Supabase Dashboard manually.

### Step 1: Open Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/jqbwynomwwjhsebcicpm/storage/buckets
2. Login if needed

### Step 2: Create New Bucket

1. Click **"New bucket"** button
2. Fill in details:
   - **Name**: `rider-documents`
   - **Public bucket**: ✅ **YES** (check this box)
   - **File size limit**: 50 MB (default is fine)
   - **Allowed MIME types**: Leave empty (allow all) or add: `image/jpeg, image/png, image/jpg`

3. Click **"Create bucket"**

### Step 3: Set Bucket Policies (Important!)

After creating bucket, set policies:

1. Click on `rider-documents` bucket
2. Go to **"Policies"** tab
3. Click **"New policy"**
4. Choose **"For full customization"**

**Policy 1: Allow Upload (INSERT)**
```sql
CREATE POLICY "Allow authenticated users to upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'rider-documents');
```

**Policy 2: Allow Public Read (SELECT)**
```sql
CREATE POLICY "Allow public to read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'rider-documents');
```

**Policy 3: Allow Update (UPDATE)**
```sql
CREATE POLICY "Allow authenticated users to update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'rider-documents');
```

**Policy 4: Allow Delete (DELETE)**
```sql
CREATE POLICY "Allow authenticated users to delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'rider-documents');
```

### Step 4: Verify Bucket

1. Go back to Storage → Buckets
2. Verify `rider-documents` shows as **Public**
3. Try uploading a test file manually

---

## 🚀 Quick Setup (SQL Editor)

Alternatively, run this in Supabase SQL Editor:

```sql
-- Create storage bucket (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('rider-documents', 'rider-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Set policies
CREATE POLICY IF NOT EXISTS "Allow authenticated upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'rider-documents');

CREATE POLICY IF NOT EXISTS "Allow public read"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'rider-documents');

CREATE POLICY IF NOT EXISTS "Allow authenticated update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'rider-documents');

CREATE POLICY IF NOT EXISTS "Allow authenticated delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'rider-documents');
```

---

## ✅ After Setup

1. Rebuild app: `npm run build`
2. Sync: `npx cap sync android`
3. Build APK: `./gradlew assembleDebug`
4. Test rider registration
5. Images will upload to Storage
6. Submit will work! ✅

---

## 🐛 If Still Getting Error

**Check**:
1. Bucket name is exactly `rider-documents`
2. Bucket is marked as Public
3. Policies are created
4. User is authenticated when uploading

**Debug**:
- Open browser console
- Check Network tab
- Look for Storage upload request
- Check response error
