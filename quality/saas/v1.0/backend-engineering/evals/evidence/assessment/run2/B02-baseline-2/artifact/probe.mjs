import {openStore,reserve} from './store.mjs';
const db=openStore(process.argv[2]??':memory:');let release;let count=0;const gate=new Promise(r=>release=r);const afterRead=async()=>{if(++count===2)release();await gate;};
const results=await Promise.all([reserve(db,{tenant:'north',item:'part-7',quantity:4,version:1},{afterRead}),reserve(db,{tenant:'north',item:'part-7',quantity:4,version:1},{afterRead})]);
console.log(JSON.stringify({results,stock:db.prepare('SELECT * FROM stock').all(),allocations:db.prepare('SELECT * FROM allocations').all()},null,2));db.close();
