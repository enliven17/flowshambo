-- Create games table
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  player_address text not null,
  bet_amount numeric not null,
  prediction text not null,
  winner text,
  payout numeric,
  transaction_id text,
  game_id text, -- Flow game ID if available
  status text check (status in ('pending', 'completed', 'failed')) default 'pending'
);

-- Enable Row Level Security (RLS)
alter table public.games enable row level security;

-- Create policies
-- Allow anyone to read game history
create policy "Public read access" 
  on public.games for select 
  using (true);

-- Allow anyone to insert game results (Note: In a real secure app, this would be validated via Edge Function or RLS with Auth)
create policy "Public insert access" 
  on public.games for insert 
  with check (true);

-- Indexes for performance
create index idx_games_player_address on public.games(player_address);
create index idx_games_created_at on public.games(created_at desc);
