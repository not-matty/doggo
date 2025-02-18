-- Create user_likes table
create table if not exists public.user_likes (
    id uuid default gen_random_uuid() primary key,
    liker_id uuid not null references public.profiles(id),
    liked_id uuid not null references public.profiles(id),
    created_at timestamptz default now() not null,
    unique (liker_id, liked_id)
);

-- Add RLS policies
alter table public.user_likes enable row level security;

create policy "Users can view their own likes and likes on them"
    on public.user_likes for select
    using (auth.uid() = liker_id or auth.uid() = liked_id);

create policy "Users can create their own likes"
    on public.user_likes for insert
    with check (auth.uid() = liker_id);

create policy "Users can delete their own likes"
    on public.user_likes for delete
    using (auth.uid() = liker_id);

-- Create function to check if users have liked each other
create or replace function public.check_mutual_like(user_a uuid, user_b uuid)
returns boolean
language plpgsql security definer
as $$
begin
    return exists (
        select 1 from public.user_likes
        where (liker_id = user_a and liked_id = user_b)
        and exists (
            select 1 from public.user_likes
            where liker_id = user_b and liked_id = user_a
        )
    );
end;
$$;

-- Create function to get all mutual likes for a user
create or replace function public.get_mutual_likes(user_id uuid)
returns table (
    matched_user_id uuid,
    matched_at timestamptz
)
language plpgsql security definer
as $$
begin
    return query
    select 
        case 
            when ul1.liker_id = user_id then ul1.liked_id
            else ul1.liker_id
        end as matched_user_id,
        greatest(ul1.created_at, ul2.created_at) as matched_at
    from public.user_likes ul1
    join public.user_likes ul2 on 
        (ul1.liker_id = ul2.liked_id and ul1.liked_id = ul2.liker_id)
    where 
        (ul1.liker_id = user_id or ul1.liked_id = user_id)
    order by matched_at desc;
end;
$$; 