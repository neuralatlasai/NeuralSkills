import {readFileSync, existsSync} from 'node:fs';
import {openStore, seed, migrate, createBackup, restore} from './store.mjs';
const [command, source, target, ledger] = process.argv.slice(2);
if (!source) throw new Error('Usage: node cli.mjs setup|migrate|interrupt|backup|restore SOURCE [TARGET] [DELETIONS]');
let db;
try {
  if (command === 'setup') { if (existsSync(source)) throw new Error('Setup refuses to reinitialize existing data'); db = openStore(source); seed(db); }
  else if (command === 'migrate' || command === 'interrupt') { db = openStore(source); console.log(JSON.stringify(migrate(db, {afterBatch(event) { console.log(JSON.stringify(event)); if (command === 'interrupt') throw new Error('INTENTIONAL interruption after first committed batch'); }}))); }
  else if (command === 'backup') createBackup(source, target);
  else if (command === 'restore') db = restore(source, target, {deletions: JSON.parse(readFileSync(ledger, 'utf8'))});
  else throw new Error('Unknown command');
} finally { if (db) db.close(); }
