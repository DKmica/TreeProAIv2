type TelemetryType = 'error' | 'metric' | 'event';

type TelemetryPayload = {
  id: string;
  type: TelemetryType;
  name: string;
  message?: string;
  stack?: string;
  value?: number;
  unit?: string;
  tags?: string[];
  data?: Record<string, unknown>;
  context?: string;
  timestamp: number;
  url?: string;
  userAgent?: string;
  severity?: 'info' | 'warning' | 'error' | 'critical';
};

const queue: TelemetryPayload[] = [];
let flushTimer: number | null = null;

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getBaseMetadata(): Pick<TelemetryPayload, 'url' | 'userAgent'> {
  if (typeof window === 'undefined') {
    return {};
  }

  return {
    url: window.location.href,
    userAgent: window.navigator.userAgent,
  };
}

async function sendTelemetryBatch(batch: TelemetryPayload[]): Promise<void> {
  const body = JSON.stringify({ events: batch });

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon('/api/telemetry', body);
      return;
    }

    await fetch('/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    });
  } catch (error) {
    console.warn('Telemetry dispatch failed; will retry on next event.', error);
    queue.unshift(...batch);
  }
}

function scheduleFlush(): void {
  if (flushTimer !== null) {
    return;
  }

  flushTimer = window.setTimeout(() => {
    flushTimer = null;
    if (!queue.length) return;

    const batch = queue.splice(0, queue.length);
    void sendTelemetryBatch(batch);
  }, 1000);
}

function enqueue(payload: TelemetryPayload): void {
  queue.push(payload);
  if (typeof window !== 'undefined') {
    scheduleFlush();
  }
}

function normalizeError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  return { message: 'Unknown error', stack: JSON.stringify(error) };
}

export function recordError(error: unknown, context?: string, data?: Record<string, unknown>): void {
  const normalized = normalizeError(error);
  enqueue({
    id: generateId(),
    type: 'error',
    name: context ?? 'Unhandled Error',
    message: normalized.message,
    stack: normalized.stack,
    data,
    context,
    severity: 'error',
    timestamp: Date.now(),
    ...getBaseMetadata(),
  });
}

export function recordMetric(
  name: string,
  value: number,
  unit?: string,
  tags?: string[],
  data?: Record<string, unknown>
): void {
  enqueue({
    id: generateId(),
    type: 'metric',
    name,
    value,
    unit,
    tags,
    data,
    severity: 'info',
    timestamp: Date.now(),
    ...getBaseMetadata(),
  });
}

export function recordEvent(name: string, data?: Record<string, unknown>, tags?: string[]): void {
  enqueue({
    id: generateId(),
    type: 'event',
    name,
    data,
    tags,
    severity: 'info',
    timestamp: Date.now(),
    ...getBaseMetadata(),
  });
}

export function registerGlobalErrorHandlers(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('error', (event) => {
    recordError(event.error ?? event.message, 'Global error', {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    recordError(event.reason, 'Unhandled promise rejection');
  });
}

export function flushTelemetryImmediately(): void {
  if (!queue.length) return;
  const batch = queue.splice(0, queue.length);
  void sendTelemetryBatch(batch);
}
