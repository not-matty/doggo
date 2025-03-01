-- Migration Order for Contact Privacy Implementation
-- This file serves as documentation for the correct order to run migrations

-- Order of migrations:
-- 1. unregistered_user_flow.sql - Creates schema for unregistered users with phone-based identification
-- 2. contact_search_rls.sql - Sets up row level security for contacts and profiles
-- 3. unregistered_user_rls.sql - Sets up row level security for unregistered contacts and likes
-- 4. contact_matching_trigger.sql - Implements automatic matching of contacts with registered users
-- 5. full_text_search_contacts.sql - Adds search capabilities to the contacts table
-- 6. contact_search_view.sql - Creates the contact network view combining registered and unregistered contacts
-- 7. contact_network_posts.sql - Creates function to get posts from a user's contact network
-- 8. contact_recommendations.sql - Implements contact-based recommendations

-- To run all migrations in the correct order:
-- supabase db reset
-- OR
-- Run each .sql file individually in the order listed above 