import {mount} from './app.js';
if(!new URLSearchParams(location.search).has('test'))mount(document.querySelector('#picker')!,async query=>{await new Promise(r=>setTimeout(r,query.length===1?400:80));return [{id:query,label:query+' Example'}]});

