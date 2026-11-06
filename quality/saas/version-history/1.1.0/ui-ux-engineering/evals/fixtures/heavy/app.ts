import { createLatestLoader } from '../lab/state.js';
type RecordRow = { id: string; title: string; team: string; status: string; amount: number };
type Intent = { search: string; slow: boolean; fail: boolean };
type Sample = { query: string; eventAt: number; feedbackAt: number; animationAt?: number; settledAt?: number; applied?: boolean };
declare global { interface Window { heavyTelemetry: Sample[] } }
const rows: RecordRow[] = Array.from({length:1000},(_,index)=>({id:String(index+1).padStart(4,'0'),title:`Record ${String(index+1).padStart(4,'0')} — Renewal review`,team:['North','South','East','West'][index%4],status:['Pending','In review','Ready'][index%3],amount:100+index*7}));
const byId = <T extends HTMLElement>(id:string) => document.getElementById(id) as T;
const search = byId<HTMLInputElement>('search');
const selected = new Set<string>();
const size = 50;
let page = 1;
window.heavyTelemetry = [];
const loader = createLatestLoader<RecordRow,Intent>(async intent => {
  // Deliberately ignores abort: the reused intent guard must reject late replies.
  await new Promise(resolve => setTimeout(resolve,intent.slow || intent.search === 'Record 0' ? 650 : 180));
  if(intent.fail) throw new Error('Synthetic refresh failure');
  const query = intent.search.toLowerCase();
  return rows.filter(row => `${row.title} ${row.team}`.toLowerCase().includes(query));
});
const updateSelected = () => {byId('selection').textContent=`${selected.size} selected`;};
function render(){
  const state = loader.state;
  const active = document.activeElement as HTMLElement | null;
  const focusedId = active?.dataset.rowId;
  const last = Math.max(1,Math.ceil(state.items.length/size)); page=Math.min(page,last);
  const body=byId<HTMLTableSectionElement>('rows'); body.replaceChildren();
  for(const row of state.items.slice((page-1)*size,page*size)){
    const tr=document.createElement('tr'); const td=document.createElement('td'); const input=document.createElement('input'); input.type='checkbox';input.checked=selected.has(row.id);input.dataset.rowId=row.id;input.setAttribute('aria-label',`Select record ${row.id}`);
    input.addEventListener('change',()=>{if(input.checked)selected.add(row.id);else selected.delete(row.id);updateSelected();});td.append(input);tr.append(td);
    for(const text of [row.id,row.title,row.team,row.status,`$${row.amount.toLocaleString('en-US')}`]){const cell=document.createElement('td');cell.textContent=text;tr.append(cell);}body.append(tr);
  }
  if(focusedId)body.querySelector<HTMLInputElement>(`input[data-row-id="${focusedId}"]`)?.focus({preventScroll:true});
  const busy=state.phase==='loading'||state.phase==='refreshing';
  byId<HTMLButtonElement>('refresh').disabled=busy;byId('cancel').hidden=!busy;byId('stale').hidden=!state.stale;byId('error').hidden=state.phase!=='error';body.parentElement?.setAttribute('aria-busy',String(busy));
  byId('status').textContent=busy?'Updating records. Previous results stay visible.':state.phase==='error'?'Update failed. Try again.':`${state.items.length} matching records.`;
  byId('page-label').textContent=`Page ${page} of ${last} · ${state.items.length} records`;
  byId<HTMLButtonElement>('previous').disabled=page===1;byId<HTMLButtonElement>('next').disabled=page===last;
  updateSelected();
}
loader.subscribe(render);
async function reload(sample?:Sample){
  const slow=byId<HTMLInputElement>('slow'),fail=byId<HTMLInputElement>('fail');
  const intent={search:search.value,slow:slow.checked,fail:fail.checked};slow.checked=false;fail.checked=false;
  const applied=await loader.load(intent);if(sample){sample.settledAt=performance.now();sample.applied=applied;}
}
search.addEventListener('input',()=>{
  const sample:Sample={query:search.value,eventAt:performance.now(),feedbackAt:0};
  byId('input-feedback').textContent=`Search: ${search.value||'all records'}`;sample.feedbackAt=performance.now();window.heavyTelemetry.push(sample);requestAnimationFrame(()=>{sample.animationAt=performance.now();});page=1;reload(sample);
});
byId('refresh').addEventListener('click',()=>reload());byId('retry').addEventListener('click',()=>reload());byId('cancel').addEventListener('click',()=>loader.cancel());
byId('previous').addEventListener('click',()=>{page--;render();});byId('next').addEventListener('click',()=>{page++;render();});byId('clear').addEventListener('click',()=>{selected.clear();render();});
reload();
