-- Create triggers for the expenses table
DROP TRIGGER IF EXISTS expenses_recalc_job_totals_after_change ON public.expenses;
CREATE TRIGGER expenses_recalc_job_totals_after_change
AFTER INSERT OR UPDATE OR DELETE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.trigger_recalc_job_totals();

-- Create triggers for the time_logs table
DROP TRIGGER IF EXISTS time_logs_recalc_job_totals_after_change ON public.time_logs;
CREATE TRIGGER time_logs_recalc_job_totals_after_change
AFTER INSERT OR UPDATE OR DELETE ON public.time_logs
FOR EACH ROW EXECUTE FUNCTION public.trigger_recalc_job_totals();