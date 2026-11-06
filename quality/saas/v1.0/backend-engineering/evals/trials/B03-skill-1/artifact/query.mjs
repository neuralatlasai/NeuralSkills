export const SQL = "SELECT id,created_at FROM parcels WHERE tenant=? AND status='ready' ORDER BY created_at DESC,id DESC LIMIT ?";
export function bindings(tenant, limit = 20) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new RangeError('limit must be an integer from 1 through 100');
  }
  return [tenant, limit];
}
export function listReady(db, tenant, limit = 20) {
  const parameters = bindings(tenant, limit);
  return db.prepare(SQL).all(...parameters);
}
