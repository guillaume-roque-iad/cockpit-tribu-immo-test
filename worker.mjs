const MAX=1500000;
export function publicURL(value,base){
 const u=new URL(value,base);
 if(u.protocol!=='https:'||u.username||u.password||u.port||!/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(u.hostname)||/(^|\.)(localhost|local|internal|test|invalid)$/i.test(u.hostname))throw Error('Indiquez une adresse HTTPS publique.');
 u.hash='';return u;
}
async function page(url){
 const r=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(20000),headers:{Accept:'text/html','User-Agent':'TribuImmoTest/1.0'}});
 if(!r.ok)throw Error('Site inaccessible ou redirection : utilisez son adresse finale.');
 if(!r.headers.get('content-type')?.includes('text/html'))throw Error('Cette adresse ne correspond pas à une page web.');
 const reader=r.body.getReader();let size=0,parts=[];
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX){await reader.cancel();throw Error('Page trop volumineuse.');}parts.push(value);}
 const all=new Uint8Array(size);let offset=0;for(const p of parts){all.set(p,offset);offset+=p.length;}return new TextDecoder().decode(all);
}
const clean=v=>typeof v==='string'?v.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,500):'';
export function extract(html,url){
 const listings=[],links=new Set();
 function walk(n,depth=0){if(!n||typeof n!=='object'||depth>16)return;if(Array.isArray(n)){n.forEach(x=>walk(x,depth+1));return;}
 const types=[n['@type']].flat();
 if(types.some(t=>['RealEstateListing','House','Apartment','Residence','SingleFamilyResidence','Product'].includes(t))){
 const item=n.mainEntity||n.itemOffered||n;const offer=[n.offers||item.offers].flat()[0]||{};const address=item.address||n.address;
 const title=clean(n.name||item.name);const price=Number(offer.price||n.price)||0;
 if(title&&(address||types.includes('RealEstateListing')||(types.includes('Product')&&/maison|appartement|terrain|villa|immeuble|propri[eé]t[eé]/i.test(title)))){
 let source;try{source=publicURL(n.url||item.url||url,url);if(source.origin!==new URL(url).origin)source=null;}catch{}
 if(source)listings.push({title,price:price>0?price:0,address:typeof address==='string'?clean(address):[address?.streetAddress,address?.postalCode,address?.addressLocality].map(clean).filter(Boolean).join(' '),url:source.href,description:clean(n.description||item.description)});
 }}
 for(const v of Object.values(n))walk(v,depth+1);
 }
 for(const match of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{walk(JSON.parse(match[1]));}catch{}}
 for(const match of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi)){try{const u=publicURL(match[1].replace(/&amp;/g,'&'),url);if(u.origin===new URL(url).origin&&/annonce|bien[s]?\/|vente|achat|immobilier\/|propert|listing/i.test(u.pathname))links.add(u.href);}catch{}}
 return {listings,links:[...links]};
}
export function extractIad(html,url){
 const start=html.search(/Mes biens disponibles/);if(start<0)throw Error('La rubrique des biens disponibles iad est introuvable.');
 const end=html.indexOf('Dernières transactions',start);
 const section=html.slice(start,end<0?undefined:end);
 const decode=s=>clean(s).replace(/&amp;/g,'&').replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/&nbsp;/g,' ');
 const listings=[];
 for(const m of section.matchAll(/<article\b[^>]*>([\s\S]*?)<\/article>/gi)){
 const card=m[1];const link=card.match(/<a\b[^>]*href="([^"<>]*\/annonce\/[^"<>]+)"[^>]*data-dd-action-name="property_card_link"[^>]*>([\s\S]*?)<\/a>/i);
 if(!link)continue;const source=publicURL(decode(link[1]),url);if(source.origin!==new URL(url).origin)continue;
 const title=decode(link[2]);const before=decode(card.slice(0,link.index));const prices=[...before.matchAll(/([0-9][0-9\s.,]*)\s*€/g)];const raw=prices.at(-1)?.[1];
 const price=raw?Number(raw.replace(/\s/g,'').replace(',','.')):0;
 const detail=decode(card.slice(link.index+link[0].length)).replace(/Voir plus.*$/,'').trim();
 listings.push({title,price,address:title.split(/ à /).at(-1),url:source.href,description:detail,transaction:/-location-/.test(source.pathname)?'location':'vente',reference:source.pathname.match(/\/(r\d+)$/)?.[1]||''});
 }
 return {listings:[...new Map(listings.map(x=>[x.url,x])).values()],expected:Number(section.match(/Mes biens disponibles[^0-9]*(\d+)/)?.[1])||null};
}
export default {async fetch(request,env){
 const u=new URL(request.url);if(u.pathname!=='/api/import-site')return env.ASSETS.fetch(request);
 const reply=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
 if(request.method!=='POST')return reply({error:'Méthode non autorisée'},405);
 if(request.headers.get('Origin')!==u.origin)return reply({error:'Origine non autorisée'},403);
 try{
 const body=await request.text();if(body.length>3000)return reply({error:'Requête trop longue'},413);
 const start=publicURL(JSON.parse(body).url);const html=await page(start);
 if(start.hostname==='www.iadfrance.fr'&&/^\/conseiller-immobilier\/[^/]+\/?$/.test(start.pathname)){
 const result=extractIad(html,start.href);
 return reply({listings:result.listings,message:`${result.listings.length} annonce(s) récupérée(s) dans les biens disponibles de cette page iad${result.expected?' sur '+result.expected+' affichée(s)':''}. Ventes et locations sont distinguées. Les dernières transactions sont exclues. Vérifiez les annonces avant de créer les dossiers.${result.expected!==result.listings.length?' Attention : extraction potentiellement incomplète.':''}`});
 }
 const first=extract(html,start.href);let results=[...first.listings],failed=0;
 const candidates=first.links.filter(x=>x!==start.href).slice(0,8);
 for(let i=0;i<candidates.length;i+=4){await Promise.all(candidates.slice(i,i+4).map(async link=>{try{results.push(...extract(await page(link),link).listings);}catch{failed++;}}));}
 const unique=[...new Map(results.map(x=>[x.url+'|'+x.title,x])).values()].slice(0,60);
 return reply({listings:unique,message:`${unique.length} annonce(s) reconnue(s). Analyse limitée à ${1+candidates.length} pages. Vérifiez que chaque annonce appartient au conseiller. Les sites chargés uniquement en JavaScript ne sont pas encore pris en charge.${failed?' Certaines pages étaient inaccessibles.':''}`});
 }catch(e){return reply({error:e.message||'Import impossible.'},400);}
}};
