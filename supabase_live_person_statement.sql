-- BADGEIFY PERSONAL FINANCE: secure, read-only live person statements
-- Run this file once in Supabase SQL Editor.
create table if not exists public.personal_finance_loan_statement_shares (
  token uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  person_id bigint not null references public.personal_finance_loan_people(id) on delete cascade,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index if not exists idx_pf_statement_shares_owner_person
  on public.personal_finance_loan_statement_shares(user_id, person_id);
alter table public.personal_finance_loan_statement_shares enable row level security;
drop policy if exists "pf statement shares owner" on public.personal_finance_loan_statement_shares;
create policy "pf statement shares owner" on public.personal_finance_loan_statement_shares
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.get_person_loan_statement_share(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare result jsonb;
begin
  select jsonb_build_object(
    'person_name', p.person_name,
    'updated_at', now(),
    'lent_total', coalesce((
      select sum(greatest(l.amount - coalesce((select sum(lp.amount) from public.personal_finance_loan_payments lp where lp.loan_id=l.id and lp.user_id=s.user_id),0),0))
      from public.personal_finance_loans l
      where l.user_id=s.user_id and l.person_id=p.id and l.status <> 'cancelled'
        and coalesce(l.loan_direction,l.loan_type,'lent')='lent'
    ),0),
    'borrowed_total', coalesce((
      select sum(greatest(l.amount - coalesce((select sum(lp.amount) from public.personal_finance_loan_payments lp where lp.loan_id=l.id and lp.user_id=s.user_id),0),0))
      from public.personal_finance_loans l
      where l.user_id=s.user_id and l.person_id=p.id and l.status <> 'cancelled'
        and coalesce(l.loan_direction,l.loan_type,'lent')='borrowed'
    ),0),
    'loans', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', l.id,
        'loan_date', l.loan_date,
        'direction', coalesce(l.loan_direction,l.loan_type,'lent'),
        'amount', l.amount,
        'purpose', l.purpose,
        'notes', l.notes,
        'account_name', a.account_name,
        'paid', coalesce((select sum(lp.amount) from public.personal_finance_loan_payments lp where lp.loan_id=l.id and lp.user_id=s.user_id),0),
        'remaining', greatest(l.amount - coalesce((select sum(lp.amount) from public.personal_finance_loan_payments lp where lp.loan_id=l.id and lp.user_id=s.user_id),0),0),
        'payments', coalesce((
          select jsonb_agg(jsonb_build_object('date',lp.payment_date,'amount',lp.amount,'notes',lp.notes) order by lp.payment_date desc)
          from public.personal_finance_loan_payments lp
          where lp.loan_id=l.id and lp.user_id=s.user_id
        ), '[]'::jsonb)
      ) order by l.loan_date desc, l.id desc)
      from public.personal_finance_loans l
      left join public.personal_finance_accounts a on a.id=l.wallet_account_id and a.user_id=s.user_id
      where l.user_id=s.user_id and l.person_id=p.id and l.status <> 'cancelled'
    ), '[]'::jsonb)
  ) into result
  from public.personal_finance_loan_statement_shares s
  join public.personal_finance_loan_people p on p.id=s.person_id and p.user_id=s.user_id
  where s.token=p_token and s.revoked_at is null
  limit 1;
  return result;
end;
$$;
revoke all on function public.get_person_loan_statement_share(uuid) from public;
grant execute on function public.get_person_loan_statement_share(uuid) to anon, authenticated;
