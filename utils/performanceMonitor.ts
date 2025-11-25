import { onCLS, onFID, onLCP, onINP, onTTFB, Metric } from 'web-vitals';
import { recordMetric, recordEvent } from './telemetry';

function logMetric(metric: Metric): void {
  const value = metric.name === 'CLS' ? metric.value * 1000 : metric.value;
  recordMetric(`web-vitals:${metric.name.toLowerCase()}`, value, metric.name === 'CLS' ? 'ms' : metric.delta >= 0 ? 'ms' : undefined, [metric.id], {
    rating: metric.rating,
  });
}

export function startPerformanceMonitoring(): void {
  if (typeof window === 'undefined') return;

  onCLS(logMetric);
  onFID(logMetric);
  onLCP(logMetric);
  onINP(logMetric);
  onTTFB(logMetric);

  recordEvent('performance_monitoring_started');
}
