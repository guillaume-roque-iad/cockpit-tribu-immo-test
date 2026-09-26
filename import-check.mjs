import assert from 'node:assert/strict';
import worker,{publicURL,extract,extractIad} from './worker.mjs';
for(const url of ['http://example.com','https://127.0.0.1','https://[::1]','https://user:pass@example.com','https://localhost','https://x.internal'])assert.throws(()=>publicURL(url));
const html='<script type="application/ld+json">'+JSON.stringify({'@type':'House',name:'Maison test',address:{addressLocality:'Narbonne'},offers:{price:'250000'},url:'/vente/maison'})+'</script><a href="/vente/maison">Voir</a><a href="https://other.com/vente/test">Autre</a>';
const data=extract(html,'https://example.com/');assert.equal(data.listings.length,1);assert.equal(data.listings[0].price,250000);assert.equal(data.listings[0].address,'Narbonne');assert.equal(data.links.length,1);
assert.equal(extract('<script type="application/ld+json">{broken}</script>','https://example.com').listings.length,0);
globalThis.fetch=async()=>new Response(html,{headers:{'Content-Type':'text/html'}});
const request=new Request('https://cockpit.example/api/import-site',{method:'POST',headers:{Origin:'https://cockpit.example'},body:JSON.stringify({url:'https://example.com'})});
const response=await worker.fetch(request,{});assert.equal(response.status,200);assert.equal((await response.json()).listings.length,1);
assert.equal((await worker.fetch(new Request('https://cockpit.example/api/import-site',{method:'POST',body:'{}'}),{})).status,403);
console.log('PASS: extraction, duplicate removal, URL restrictions, malformed data and API origin checks');

const card=(id,kind,price)=>`<article><p>${price} €</p><a href="/annonce/local-${kind}-narbonne/r${id}" data-dd-action-name="property_card_link"><p>Bureaux à Narbonne (11100)</p></a><ul><li>22 m²</li></ul></article>`;
const iad=extractIad('Mes biens disponibles (2)'+card(1,'vente','118 000')+card(2,'location','750')+'Dernières transactions'+card(3,'vente','99000'),'https://www.iadfrance.fr/conseiller-immobilier/test');
assert.equal(iad.listings.length,2);assert.equal(iad.listings[0].price,118000);assert.equal(iad.listings[1].transaction,'location');assert.equal(iad.expected,2);console.log('PASS: iad available cards, prices, rentals, sold exclusion');
