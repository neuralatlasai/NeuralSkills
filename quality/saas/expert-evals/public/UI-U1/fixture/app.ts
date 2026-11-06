export type Person = {id:string; label:string};
export type Search = (query:string, signal?:AbortSignal)=>Promise<Person[]>;
export function mount(root:HTMLElement, search:Search){
 const input=root.querySelector<HTMLInputElement>('#query')!;
 const list=root.querySelector<HTMLElement>('#options')!;
 const status=root.querySelector<HTMLElement>('#status')!;
 const retry=root.querySelector<HTMLButtonElement>('#retry')!;
 const chosen=root.querySelector<HTMLElement>('#chosen')!;
 let items:Person[]=[]; let active=-1;
 function render(){list.replaceChildren(...items.map((person,i)=>{const li=document.createElement('li');li.id='person-'+person.id;li.role='option';li.textContent=person.label;li.setAttribute('aria-selected',String(i===active));return li}));input.setAttribute('aria-expanded',String(items.length>0));input.setAttribute('aria-activedescendant','person-'+items[active]?.id);input.blur();}
 async function load(){status.textContent='Loading';retry.hidden=true;try{items=await search(input.value);active=0;status.textContent=items.length+' people';render()}catch{status.textContent='Search failed';retry.hidden=false}}
 input.addEventListener('input',load); retry.addEventListener('click',load);
 input.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){active=Math.min(items.length-1,active+1);render()}if(event.key==='Enter'&&items[active])chosen.textContent=items[active].label;});
 return {dispose(){input.removeEventListener('input',load)}};
}

