-- completed_at was writable directly, so a client could store any timestamp,
-- including one in the future. The trigger now owns the value: a client can
-- only mark a consultation complete (any non-null value) or incomplete
-- (null), and the time recorded is when it was first marked complete.
--
-- Rule violations also get their own SQLSTATE (LM001) so the API can tell
-- them apart from other database errors without matching on messages.

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
