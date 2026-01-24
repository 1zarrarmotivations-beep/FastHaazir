#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

## user_problem_statement: "Fix broken chat (text + voice) with correct Supabase RLS + Storage policies, and ensure admin-added businesses appear immediately on customer dashboard (realtime/refetch + correct RLS). Ensure no phone numbers are exposed; admin can read chats silently only; no duplicate RLS policies."
## backend:
##   - task: "Supabase SQL patch: chat_messages schema + clean RLS + storage policies + public_businesses realtime"
##     implemented: true
##     working: "NA"  # requires Supabase environment verification
##     file: "/app/supabase/migrations/20260124_fix_chat_and_public_businesses.sql"
##     stuck_count: 0
##     priority: "high"
##     needs_retesting: true
##     status_history:
##       - working: "NA"
##         agent: "main"
##         comment: "Created SQL migration to align chat_messages columns (message_type/voice_url/voice_duration + sender_type admin), drop/recreate chat policies to ensure exactly one participant INSERT policy, admin SELECT-only monitoring, and storage bucket/policies for chat voice notes (private bucket, signed URLs). Also ensured public_businesses is in realtime publication. Needs to be applied and verified in Supabase."
##
## frontend:
##   - task: "Chat send (text + voice): private bucket path storage + signed URL playback + admin cannot send"
##     implemented: true
##     working: "NA"  # needs live Supabase test with real order/request
##     file: "/app/frontend/src/hooks/useChat.tsx, /app/frontend/src/components/chat/OrderChat.tsx"
##     stuck_count: 0
##     priority: "high"
##     needs_retesting: true
##     status_history:
##       - working: "NA"
##         agent: "main"
##         comment: "Updated voice note flow to upload to private bucket and store path; fetch hook now converts paths to signed URLs for playback. Blocked admin sending."
##
##   - task: "Businesses live update for customers: use public_businesses + realtime subscription"
##     implemented: true
##     working: "NA"  # needs live Supabase test with admin creating a business
##     file: "/app/frontend/src/hooks/useBusinesses.tsx"
##     stuck_count: 0
##     priority: "high"
##     needs_retesting: true
##     status_history:
##       - working: "NA"
##         agent: "main"
##         comment: "Customer business list now queries public_businesses (is_active + is_approved + not deleted) and subscribes to realtime changes on public_businesses for instant updates."
##
##   - task: "Privacy: remove customer phone from admin order/request views and chat monitor label"
##     implemented: true
##     working: true
##     file: "/app/frontend/src/components/admin/OrdersManager.tsx, /app/frontend/src/components/admin/RiderRequestsManager.tsx, /app/frontend/src/components/admin/AdminChatViewer.tsx"
##     stuck_count: 0
##     priority: "high"
##     needs_retesting: false
##     status_history:
##       - working: true
##         agent: "main"
##         comment: "Admin UI no longer renders customer_phone; displays Customer #xxxxxx labels."
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 1
##   run_ui: true
##
## test_plan:
##   current_focus:
##     - "Chat send (text + voice)"
##     - "Customer business list updates immediately after admin creates business"
##   stuck_tasks: []
##   test_all: false
##   test_priority: "high_first"
##
## agent_communication:
##   - agent: "main"
##     message: "Implemented frontend changes for chat (private storage path + signed URL playback) and customer businesses query/subscription to public_businesses. Added Supabase SQL migration to clean chat RLS + storage policies + publication. Please run frontend e2e tests; Supabase verification may require seed data."