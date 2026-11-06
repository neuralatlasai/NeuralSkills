/** Compile-time description of the local fixture. These are synthetic test identities. */
export interface InventoryItem {
  id: string; tenant: string; owner: string; name: string; quantity: number; version: number;
}
export interface ProblemDetails {
  type: string; title: string; status: number; detail: string; instance: string;
  traceId: string;
}
export type EvidenceStatus = 'PASS' | 'FAIL' | 'UNVERIFIED' | 'NOT_APPLICABLE';
export interface CaseResult {
  id: string; name: string; status: EvidenceStatus; durationMs: number;
  details: Record<string, unknown>; reason?: string;
}
export interface FixtureBounds {
  bodyBytes: number; active: number; queued: number; queueAgeMs: number;
  requestDeadlineMs: number; cacheEntries: number; telemetryEntries: number;
}
