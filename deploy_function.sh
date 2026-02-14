
# 2. Deploy the function to the NEW project with Personal Access Token
# Project Ref: jqbwynomwwjhsebcicpm
# Using Token: sbp_v0_81a793756438b90bd4a390b95239be1966f13eb4 (Do not commit real tokens!)

project_id="jqbwynomwwjhsebcicpm"
token="sbp_v0_81a793756438b90bd4a390b95239be1966f13eb4"

echo "Deploying to project: $project_id"

# Login first (if needed, though token can be passed directly)
# npx supabase login --token "$token"

# Link project
npx supabase link --project-ref "$project_id" --password "$token"

# Deploy function
npx supabase functions deploy create-user --project-ref "$project_id"
