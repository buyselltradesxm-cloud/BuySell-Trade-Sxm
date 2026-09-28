-- Run after apple-purchases.sql inside the SAME uncommitted transaction.
do $$
declare u uuid := gen_random_uuid(); token uuid := gen_random_uuid(); p jsonb; current_plan text;
begin
  insert into auth.users(id, email, raw_user_meta_data) values(u, 'apple-ledger-qa@example.invalid', '{"name":"Apple ledger QA"}');
  insert into public.apple_purchase_intents(token,user_id,product_id)
    values(token,u,'com.korekdigitalmarketing.buyselltradesxm.pro_starter_monthly');
  p := jsonb_build_object('transaction_id','qa-'||token, 'original_transaction_id','qa-'||token,
    'token',token, 'product_id','com.korekdigitalmarketing.buyselltradesxm.pro_starter_monthly',
    'plan','pro-starter','boost_days',null, 'purchase_date',now(), 'expires_date',now()+interval '1 month',
    'revoked',false,'signed_date',now(),'environment','Sandbox');
  perform public.apply_apple_transaction(p);
  perform public.apply_apple_transaction(p);
  if (select count(*) from public.apple_transactions t where t.token= (p->>'token')::uuid) <> 1 then raise exception 'Duplicate delivery not idempotent'; end if;
  select account_plan into current_plan from public.profiles where id=u;
  if current_plan <> 'pro-starter' then raise exception 'Entitlement not delivered'; end if;
  perform public.apply_apple_transaction(p || jsonb_build_object('revoked',true,'signed_date',now()+interval '1 second'));
  perform public.apply_apple_transaction(p);
  select account_plan into current_plan from public.profiles where id=u;
  if current_plan <> 'personal-free' then raise exception 'Replay restored a revoked entitlement'; end if;
  if has_function_privilege('authenticated','public.apply_apple_transaction(jsonb)','execute') then raise exception 'Client can grant purchases'; end if;
  if has_table_privilege('authenticated','public.apple_purchase_intents','insert') then raise exception 'Client can create unverified intents'; end if;
end;
$$;
