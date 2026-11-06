export const SQL='SELECT * FROM parcels WHERE tenant=? ORDER BY created_at DESC';
export const bindings=(tenant,limit)=>[tenant];
export function listReady(db,tenant,limit=20){return db.prepare(SQL).all(...bindings(tenant,limit)).filter(r=>r.status==='ready').slice(0,limit).map(({id,created_at})=>({id,created_at}));}
