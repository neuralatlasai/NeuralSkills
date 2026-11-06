import https from 'node:https';
import http from 'node:http';
import tls from 'node:tls';
import { performance } from 'node:perf_hooks';

/** Each call opens an actual TCP/TLS connection; certificate validation remains enabled. */
export function request(fixture, path='/health', {method='GET', token='fixture-token-a', body, rawBody, headers={}, ca=fixture.certs?.ca, servername='localhost', timeoutMs=1500}={}) {
  const start=performance.now();
  return new Promise(resolve=>{
    const payload=rawBody!==undefined?rawBody:body===undefined?undefined:JSON.stringify(body);
    const req=https.request({hostname:'127.0.0.1',port:fixture.port,path,method,servername,ca,rejectUnauthorized:true,agent:false,headers:{authorization:`Bearer ${token}`,...(payload!==undefined?{'content-type':'application/json','content-length':Buffer.byteLength(payload)}:{}),...headers}},res=>{
      const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>{
        const text=Buffer.concat(chunks).toString();let value;try{value=JSON.parse(text);}catch{value=text;}
        resolve({status:res.statusCode,headers:res.headers,body:value,latencyMs:performance.now()-start,peerFingerprint:req.socket?.getPeerCertificate()?.fingerprint256});
      });
      res.on('error',error=>resolve({status:0,error:error.code||error.message,latencyMs:performance.now()-start}));
    });
    req.setTimeout(timeoutMs,()=>req.destroy(Object.assign(new Error('Client deadline'),{code:'CLIENT_TIMEOUT'})));
    req.on('error',error=>resolve({status:0,error:error.code||error.message,latencyMs:performance.now()-start}));
    if(payload!==undefined)req.write(payload);req.end();
  });
}

export function slowBody(fixture) {
  const start=performance.now();
  return new Promise(resolve=>{
    const req=https.request({hostname:'127.0.0.1',port:fixture.port,path:'/v1/items',method:'POST',servername:'localhost',ca:fixture.certs.ca,rejectUnauthorized:true,agent:false,headers:{authorization:'Bearer fixture-token-a','content-type':'application/json','content-length':'100','idempotency-key':'slow-body'}},res=>{const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.on('end',()=>resolve({status:res.statusCode,body:Buffer.concat(chunks).toString(),latencyMs:performance.now()-start}));});
    req.setTimeout(1200,()=>req.destroy(Object.assign(new Error('Client deadline'),{code:'CLIENT_TIMEOUT'})));
    req.on('error',error=>resolve({status:0,error:error.code||error.message,latencyMs:performance.now()-start}));req.write('{');
  });
}

export function directAppRequest(fixture) {
  return new Promise(resolve=>{const req=http.get({hostname:'127.0.0.1',port:fixture.appPort,path:'/health',headers:{authorization:'Bearer fixture-token-a','x-forwarded-proto':'https','x-ingress-secret':'forged'}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',error=>resolve(error.code));});
}

export function malformedFraming(fixture) {
  return new Promise(resolve=>{
    const chunks=[];const started=performance.now();const socket=tls.connect({host:'127.0.0.1',port:fixture.port,servername:'localhost',ca:fixture.certs.ca,rejectUnauthorized:true},()=>socket.write('POST /v1/items HTTP/1.1\r\nHost: localhost\r\nContent-Length: 5\r\nTransfer-Encoding: chunked\r\nConnection: close\r\n\r\n0\r\n\r\n'));
    socket.setTimeout(1000,()=>socket.destroy());socket.on('data',chunk=>chunks.push(chunk));socket.on('error',error=>resolve({status:0,error:error.code,latencyMs:performance.now()-started}));socket.on('close',()=>{const raw=Buffer.concat(chunks).toString();resolve({status:Number(/^HTTP\/1\.1 (\d+)/.exec(raw)?.[1]||0),raw,latencyMs:performance.now()-started});});
  });
}
