-- Run once in Supabase (the dashboard project) → SQL Editor → New query → Run. Safe to re-run.
-- Freya's WhatsApp lead log (replaces the "Freya - WhatsApp Leads" Google Sheet).
-- Written by the n8n workflow after every message; shown on the dashboard's Leads page.
create table if not exists public.wa_leads (
  phone          text primary key,                -- "+971542968754" (no "whatsapp:" prefix)
  name           text not null default '',
  wa_name        text not null default '',
  query          text not null default '',
  association    text not null default '',        -- comma separated codes
  interest       text not null default '',        -- comma separated codes
  business_owner text not null default 'unknown',  -- yes | no | unknown
  stage          text not null default 'new',      -- new | engaged | qualified | booking_link_sent | member | handoff | opted_out
  handoff        boolean not null default false,
  notes          text not null default '',
  last_seen      timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists wa_leads_last_seen_idx on public.wa_leads (last_seen desc nulls last);

create or replace function public.wa_leads_touch() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists wa_leads_touch on public.wa_leads;
create trigger wa_leads_touch before update on public.wa_leads for each row execute function public.wa_leads_touch();

alter table public.wa_leads enable row level security;
