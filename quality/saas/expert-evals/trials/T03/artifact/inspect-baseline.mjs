import {DatabaseSync} from 'node:sqlite';
import {writeFileSync} from 'node:fs';
const result={};
for(const [name,file] of [['oversell','test-8080-0.sqlite'],['beforeCommit','test-8080-4.sqlite']]){
 const db=new DatabaseSync(new URL('./evidence/'+file,import.meta.url),{readOnly:true});
 try{result[name]={file,stock:db.prepare('SELECT * FROM inventory').all(),receipts:db.prepare('SELECT * FROM receipts').all(),events:db.prepare('SELECT * FROM events').all()}}finally{db.close()}
}
writeFileSync(new URL('./baseline-state.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
