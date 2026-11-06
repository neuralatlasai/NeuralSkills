export type Person = {id:string; label:string};
export type Search = (query:string, signal?:AbortSignal)=>Promise<Person[]>;
export function mount(root:HTMLElement, search:Search){
 const input=root.querySelector<HTMLInputElement>('#query')!;
 const list=root.querySelector<HTMLElement>('#options')!;
 const status=root.querySelector<HTMLElement>('#status')!;
 const retry=root.querySelector<HTMLButtonElement>('#retry')!;
 const chosen=root.querySelector<HTMLElement>('#chosen')!;
 let items:Person[]=[]; let active=-1; let open=false;
 let generation=0; let controller:AbortController|undefined; let disposed=false;
 let composing=false; let committed='';
 function invalidate(){generation++;controller?.abort();controller=undefined;}
 function render(){
  list.replaceChildren(...(open?items:[]).map((person,i)=>{
   const li=document.createElement('li');li.id='person-'+i;li.role='option';li.textContent=person.label;
   li.setAttribute('aria-selected',String(i===active));return li;
  }));
  const visible=open&&items.length>0;list.hidden=!visible;
  input.setAttribute('aria-expanded',String(visible));
  if(visible&&active>=0&&active<items.length)input.setAttribute('aria-activedescendant','person-'+active);
  else input.removeAttribute('aria-activedescendant');
 }
 async function load(force=false){
  if(disposed||composing)return;
  const query=input.value;
  if(!force&&query===committed)return;
  committed=query;invalidate();const ticket=generation;
  items=[];active=-1;open=false;retry.hidden=true;
  if(!query.trim()){status.textContent='';render();return;}
  controller=new AbortController();const signal=controller.signal;
  status.textContent='Loading';render();
  try{
   const result=await search(query,signal);
   if(disposed||ticket!==generation)return;
   if(!Array.isArray(result)||!result.every(p=>p&&typeof p.id==='string'&&typeof p.label==='string'))throw Error('Invalid search response');
   items=result;active=items.length?0:-1;open=items.length>0;
   status.textContent=items.length+' people';render();
  }catch{
   if(disposed||ticket!==generation)return;
   items=[];active=-1;open=false;status.textContent='Search failed';retry.hidden=false;render();
  }
 }
 function onInput(event:Event){if(!composing&&!(event as InputEvent).isComposing)void load();}
 function onStart(){composing=true;invalidate();items=[];active=-1;open=false;status.textContent='';retry.hidden=true;render();}
 function onEnd(){composing=false;void load(true);}
 function onRetry(){void load(true);input.focus();}
 function onKey(event:KeyboardEvent){
  if(composing||event.isComposing)return;
  if(event.key==='Escape'){event.preventDefault();invalidate();open=false;active=-1;status.textContent='';retry.hidden=true;render();}
  else if((event.key==='ArrowDown'||event.key==='ArrowUp')&&items.length){
   event.preventDefault();if(!open){open=true;active=event.key==='ArrowDown'?0:items.length-1;}
   else active=(active+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;
   render();
  }else if(event.key==='Enter'&&open&&items[active]){
   event.preventDefault();chosen.textContent=items[active].label;open=false;active=-1;render();
  }
 }
 function onPointer(event:MouseEvent){
  const option=(event.target as Element).closest('[role=option]');
  if(!option||!list.contains(option))return;
  event.preventDefault();const index=Array.from(list.children).indexOf(option);
  if(items[index]){chosen.textContent=items[index].label;open=false;active=-1;render();input.focus();}
 }
 input.addEventListener('input',onInput);input.addEventListener('compositionstart',onStart);input.addEventListener('compositionend',onEnd);
 input.addEventListener('keydown',onKey);retry.addEventListener('click',onRetry);list.addEventListener('mousedown',onPointer);render();
 return {dispose(){if(disposed)return;disposed=true;invalidate();input.removeEventListener('input',onInput);input.removeEventListener('compositionstart',onStart);input.removeEventListener('compositionend',onEnd);input.removeEventListener('keydown',onKey);retry.removeEventListener('click',onRetry);list.removeEventListener('mousedown',onPointer);}};
}

