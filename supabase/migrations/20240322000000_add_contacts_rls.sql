-- Enable RLS on contacts table
alter table public.contacts enable row level security;

-- Users can view their own contacts and contacts where they are the contact
create policy "Users can view their own contacts and contacts where they are the contact"
    on public.contacts for select
    using (auth.uid() = user_id or auth.uid() = contact_user_id);

-- Users can create contacts where they are the user
create policy "Users can create their own contacts"
    on public.contacts for insert
    with check (auth.uid() = user_id);

-- Users can delete their own contacts
create policy "Users can delete their own contacts"
    on public.contacts for delete
    using (auth.uid() = user_id); 