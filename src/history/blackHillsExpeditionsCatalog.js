// Research-first historical catalog. Dates and sources are cited; no route
// geometry or camp coordinate is invented from place names or illustrations.
export const EXPEDITIONS = Object.freeze([
  { id:'warren-1857', title:'Gouverneur K. Warren reconnaissance', start:'1857', end:'1857', kind:'survey',
    area:'Northern Plains / Black Hills approaches', routeStatus:'not-digitized',
    summary:'Earlier reconnaissance represented on later Black Hills expedition maps.',
    sources:['https://readingroom.usd.edu/post/south-dakota-and-northern-great-plains-historical-maps'] },
  { id:'raynolds-1859', title:'William F. Raynolds expedition', start:'1859', end:'1860', kind:'exploration',
    area:'Northern Black Hills and surrounding northern plains', routeStatus:'not-digitized',
    summary:'Pre-Civil War Army exploration; distinct from Joseph J. Reynolds’s 1876 command.',
    sources:['https://readingroom.usd.edu/post/south-dakota-and-northern-great-plains-historical-maps','https://www.sdgs.usd.edu/pubs/PDF/B-01.pdf'] },
  { id:'custer-1874', title:'Custer Black Hills reconnaissance', start:'1874-07', end:'1874-08', kind:'expedition',
    area:'Fort Abraham Lincoln to and through the Black Hills', routeStatus:'original-map-available',
    summary:'Survey and military expedition led by George A. Custer; William Ludlow’s contemporary map contains dated routes and camps.',
    sources:['https://www.loc.gov/item/73697038/','https://www.history.nd.gov/textbook/unit1_natworld/unit1_2_custer.html'] },
  { id:'jenney-newton-1875', title:'Jenney–Newton geological survey and Dodge escort', start:'1875', end:'1875', kind:'survey',
    area:'Black Hills', routeStatus:'not-digitized',
    summary:'Federal geological investigation with military escort led by Richard I. Dodge.',
    sources:['https://www.npshistory.com/publications/deto/history/intro.htm'] },
  { id:'reynolds-1876', title:'Joseph J. Reynolds / Powder River campaign', start:'1876-03', end:'1876-03', kind:'campaign',
    area:'Powder River country, beyond the Black Hills', routeStatus:'not-digitized',
    summary:'March 1876 campaign connected with the Great Sioux War; not the 1859 Raynolds survey.',
    sources:['https://www.nps.gov/articles/000/fort-laramie-in-1876.htm'] },
  { id:'crook-1876', title:'George Crook campaigns', start:'1876-03', end:'1876-11', kind:'campaign',
    area:'Wyoming, Montana and western Dakota', routeStatus:'historical-route-map-available',
    summary:'Campaign movements and engagements including the Rosebud and the movement toward Slim Buttes.',
    sources:['https://www.nps.gov/articles/000/fort-laramie-in-1876.htm'] },
  { id:'terry-custer-1876', title:'Terry–Custer campaign', start:'1876-05', end:'1876-06', kind:'campaign',
    area:'Northern Plains / Little Bighorn (present-day Montana)', routeStatus:'historical-route-map-available',
    summary:'Part of the coordinated 1876 U.S. campaign; includes the Little Bighorn/Greasy Grass battle.',
    sources:['https://www.nps.gov/libi/learn/historyculture/battle-story.htm'] },
]);
export const ENGAGEMENTS = Object.freeze([
  {id:'powder-river-1876', title:'Battle of Powder River', date:'1876-03-17', region:'Powder River country', sources:['https://www.nps.gov/articles/000/fort-laramie-in-1876.htm']},
  {id:'rosebud-1876', title:'Battle of the Rosebud', date:'1876-06-17', region:'Present-day Montana', sources:['https://www.nps.gov/articles/000/fort-laramie-in-1876.htm']},
  {id:'little-bighorn-1876', title:'Little Bighorn / Greasy Grass', date:'1876-06-25', region:'Present-day Montana', sources:['https://www.nps.gov/libi/learn/historyculture/battle-story.htm']},
  {id:'slim-buttes-1876', title:'Battle of Slim Buttes', date:'1876-09-09', region:'Northwestern South Dakota', sources:['https://www.nps.gov/articles/000/fort-laramie-in-1876.htm']},
]);
export const HISTORICAL_CONTEXT = Object.freeze([
  {id:'treaty-1868', title:'Fort Laramie Treaty of 1868', date:'1868', sources:['https://www.archives.gov/education/lessons/sioux-treaty']},
  {id:'indigenous-perspectives', title:'Lakota and Cheyenne perspectives on the Great Sioux War', date:'1876', sources:['https://home.nps.gov/articles/000/fighting-for-the-black-hills-understanding-indigenous-perspectives-on-the-great-sioux-war-of-1876-1877.htm']},
]);
export function validateHistoricalCatalog(expeditions=EXPEDITIONS,engagements=ENGAGEMENTS) {
  const ids=new Set();
  for(const item of [...expeditions,...engagements]){
    if(!/^[a-z0-9-]+$/.test(item.id) || ids.has(item.id)) throw new Error('Duplicate or invalid historical ID');
    ids.add(item.id);
    if(!Array.isArray(item.sources) || item.sources.length===0 || !item.sources.every(u => /^https:\/\//.test(u))) throw new Error('Missing primary citation');
    if ('latitude' in item || 'longitude' in item || 'geometry' in item) throw new Error('Unverified geographic placement');
  }
  return true;
}
