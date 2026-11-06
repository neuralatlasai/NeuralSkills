export type Person = {id:string; label:string};
export type Search = (query:string, signal?:AbortSignal)=>Promise<Person[]>;
export function mount(root:HTMLElement, search:Search){
 const input=root.querySelector<HTMLInputElement>('#query')!;
 const list=root.querySelector<HTMLElement>('#options')!;
 const status=root.querySelector<HTMLElement>('#status')!;
 const retry=root.querySelector<HTMLButtonElement>('#retry')!;
 const chosen=root.querySelector<HTMLElement>('#chosen')!;
 let items:Person[]=[], active=-1, open=false, composing=false, disposed=false;
 let generation=0, committed='', controller:AbortController|undefined;
 function invalidate(){generation++;controller?.abort();}
 function render(){
  list.replaceChildren(...items.map((person,i)=>{
   const li=document.createElement('li');li.id=list.id+'-option-'+i;
   li.role='option';li.textContent=person.label;li.dataset.index=String(i);
   li.setAttribute('aria-selected',String(i===active));return li;
  }));
  const visible=open&&items.length>0;
  list.hidden=!visible;input.setAttribute('aria-expanded',String(visible));
  if(visible&&active>=0&&active<items.length)input.setAttribute('aria-activedescendant',list.children[active].id);
  else input.removeAttribute('aria-activedescendant');
 }
 async function load(force=false){
  if(disposed||composing)return;
  const query=input.value;
  if(!force&&query===committed)return;
  committed=query;invalidate();const request=generation;
  items=[];active=-1;open=false;retry.hidden=true;render();
  if(!query.trim()){status.textContent='';return;}
  controller=new AbortController();status.textContent='Loading';
  try{
   const result=await search(query,controller.signal);
   if(disposed||request!==generation)return;
   items=result;active=items.length?0:-1;open=items.length>0;
   status.textContent=items.length+' people';render();
  }catch{
   if(disposed||request!==generation)return;
   status.textContent='Search failed';retry.hidden=false;render();
  }
 }
 function onInput(event:Event){if(!composing&&!(event as InputEvent).isComposing)void load();}
 function onCompositionStart(){composing=true;invalidate();items=[];active=-1;open=false;status.textContent='';retry.hidden=true;render();}
 function onCompositionEnd(){composing=false;void load(true);}
 function onRetry(){void load(true);}
 function select(index:number){if(!open||!items[index])return;chosen.textContent=items[index].label;open=false;active=-1;render();}
 function onKey(event:KeyboardEvent){
  if(composing||event.isComposing)return;
  if(event.key==='Escape'){event.preventDefault();invalidate();open=false;active=-1;if(status.textContent==='Loading')status.textContent='';render();}
  else if((event.key==='ArrowDown'||event.key==='ArrowUp')&&items.length){
   event.preventDefault();open=true;
   active=event.key==='ArrowDown'?(active+1)%items.length:(active<=0?items.length-1:active-1);render();
  }else if(event.key==='Enter'&&open&&active>=0){event.preventDefault();select(active);}
 }
 function onPointer(event:PointerEvent){if((event.target as Element).closest('[role=option]'))event.preventDefault();}
 function onClick(event:MouseEvent){const option=(event.target as Element).closest<HTMLElement>('[role=option]');if(option){select(Number(option.dataset.index));input.focus();}}
 input.addEventListener('input',onInput);input.addEventListener('compositionstart',onCompositionStart);
 input.addEventListener('compositionend',onCompositionEnd);input.addEventListener('keydown',onKey);
 retry.addEventListener('click',onRetry);list.addEventListener('pointerdown',onPointer);list.addEventListener('click',onClick);
 render();
 return {dispose(){if(disposed)return;disposed=true;invalidate();
  input.removeEventListener('input',onInput);input.removeEventListener('compositionstart',onCompositionStart);
  input.removeEventListener('compositionend',onCompositionEnd);input.removeEventListener('keydown',onKey);
  retry.removeEventListener('click',onRetry);list.removeEventListener('pointerdown',onPointer);list.removeEventListener('click',onClick);
 }};
}

