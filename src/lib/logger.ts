interface LogEvent {
  event: string;
  endpoint?: string;
  latency_ms?: number;
  tokens_used?: number;
  query_plan?: any;
  grounding_verdict?: string;
  error?: any;
  [key: string]: any;
}

export function log(eventData: LogEvent) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    ...eventData
  };

  // Output as single-line JSON to stdout for log aggregators
  console.log(JSON.stringify(logEntry));
}