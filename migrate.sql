create extension if not exists pgcrypto;


-- Accounts
create table if not exists accounts (
id uuid primary key default gen_random_uuid(),
fb_account_id text unique not null,
name text,
status text default 'unknown',
meta jsonb default '{}',
owner_id uuid references auth.users(id),
created_at timestamptz default now()
);


-- Campaigns
create table if not exists campaigns (
id uuid primary key default gen_random_uuid(),
account_id uuid references accounts(id) on delete cascade,
fb_campaign_id text,
name text,
objective text,
status text,
budget numeric(12,2),
meta jsonb default '{}',
created_by uuid references auth.users(id),
created_at timestamptz default now()
);


-- Jobs log
create table if not exists jobs (
id uuid primary key default gen_random_uuid(),
type text not null,
payload jsonb,
status text default 'pending',
attempts int default 0,
result jsonb,
created_at timestamptz default now(),
updated_at timestamptz default now()
);


-- Tokens (encrypted)
create table if not exists fb_tokens (
id uuid primary key default gen_random_uuid(),
user_id uuid references auth.users(id),
encrypted_token text not null,
token_type text,
expires_at timestamptz,
created_at timestamptz default now()
);


-- Example sample data (optional)
insert into accounts (fb_account_id, name, status) values ('1234567890','Demo Account','Active') on conflict do nothing;
