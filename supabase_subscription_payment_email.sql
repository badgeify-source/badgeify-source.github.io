-- Add an optional payment email to each subscription.
-- Existing subscriptions remain unchanged (NULL) until an email is entered.
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS payment_email text;

COMMENT ON COLUMN public.subscriptions.payment_email IS
'Email address used to pay for this subscription';
