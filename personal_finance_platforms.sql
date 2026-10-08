-- PERSONAL FINANCE / لوحة تحكم صالح
-- تشغيل مرة واحدة في Supabase SQL Editor
-- هذه الترقية تخص نظام PERSONAL FINANCE فقط.

drop index if exists public.personal_finance_accounts_user_type_uq;
drop index if exists public.personal_finance_accounts_user_account_type_key;
drop index if exists public.personal_finance_accounts_user_id_account_type_key;

create unique index if not exists personal_finance_accounts_user_name_uq
on public.personal_finance_accounts(user_id, lower(account_name));

create index if not exists personal_finance_transactions_source_lookup_idx
on public.personal_finance_transactions(user_id, source_type, source_id);

-- بعد تشغيلها سيصبح ممكنًا وجود:
-- Bybit Saleh
-- Bybit Mahmoud
-- Binance
-- وأي منصة أخرى
-- مع منع تكرار نفس اسم الحساب لنفس المستخدم.
