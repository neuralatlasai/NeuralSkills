/** Frozen v1 SQL adapter: intentionally does not know the additive description column. */
export function legacyRead(db,tenant,id){
  return db.prepare('SELECT tenant,id,owner,name,quantity,version FROM items WHERE tenant=? AND id=?').get(tenant,id);
}
export function legacyCreate(db,{tenant,id,owner,name,quantity}){
  if(!tenant||!id)throw new Error('Legacy writer requires a tenant and identifier');
  return db.prepare('INSERT INTO items(tenant,id,owner,name,quantity,version) VALUES(?,?,?,?,?,1)').run(tenant,id,owner,name,quantity);
}
