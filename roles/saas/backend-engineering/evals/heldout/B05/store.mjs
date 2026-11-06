import {DatabaseSync} from 'node:sqlite';import {copyFileSync} from 'node:fs';
export function openStore(file){return new DatabaseSync(file);}
export function seed(db){db.exec("PRAGMA user_version=1;CREATE TABLE customers(tenant TEXT NOT NULL,id TEXT NOT NULL,name TEXT NOT NULL,PRIMARY KEY(tenant,id));INSERT INTO customers VALUES('north','c1','Aster'),('north','c2','Birch'),('south','c1','Cedar'),('north','erased','Delete requested');");}
export function migrate(db,{afterBatch=()=>{}}={}){db.exec('ALTER TABLE customers ADD COLUMN state TEXT;');db.exec("UPDATE customers SET state='active';");afterBatch();db.exec('PRAGMA user_version=2;');}
export function restore(source,target){copyFileSync(source,target);return openStore(target);}
