-- Enable RLS on profiles table
alter table public.profiles enable row level security;

-- Users can view all profiles
create policy "Users can view all profiles"
    on public.profiles for select
    using (true);

-- Users can update their own profile
create policy "Users can update their own profile"
    on public.profiles for update
    using (auth.uid() = id);

-- Users can delete their own profile
create policy "Users can delete their own profile"
    on public.profiles for delete
    using (auth.uid() = id); 