-- Clients could write any completed_at, even a future one. Now any non-null
-- value just means "complete" and the trigger records when that happened.
-- Rule violations also get their own error code, LM001, for the API to map.

create or replace function public.enforce_consultation_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and old.status = 'cancelled' then
    raise exception 'Cancelled consultations cannot be modified'
      using errcode = 'LM001';
  end if;

  if (tg_op = 'INSERT' or new.scheduled_at is distinct from old.scheduled_at)
     and new.scheduled_at <= now() then
    raise exception 'Consultations must be scheduled in the future'
      using errcode = 'LM001';
  end if;

  if tg_op = 'UPDATE' then
    if new.completed_at is not null then
      new.completed_at := coalesce(old.completed_at, now());
    end if;
    new.updated_at := now();
  end if;

  return new;
end;
$$;
