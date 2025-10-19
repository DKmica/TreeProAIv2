-- Create a function to recalculate totals for a given job
CREATE OR REPLACE FUNCTION public.recalc_job_totals(job_uuid uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.jobs j
  SET
    total_cost = COALESCE((
      SELECT SUM(amount) FROM public.expenses WHERE job_id = job_uuid
    ), 0),
    total_time_minutes = COALESCE((
      SELECT SUM(EXTRACT(EPOCH FROM (clock_out_time - clock_in_time))/60)::integer
      FROM public.time_logs
      WHERE job_id = job_uuid AND clock_out_time IS NOT NULL
    ), 0)
  WHERE j.id = job_uuid;
END;
$$;

-- Create a trigger function that calls the recalculation function
CREATE OR REPLACE FUNCTION public.trigger_recalc_job_totals()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  job_to_update UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    job_to_update := OLD.job_id;
  ELSE
    job_to_update := NEW.job_id;
  END IF;
  
  PERFORM public.recalc_job_totals(job_to_update);
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;