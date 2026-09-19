const c="beatcut:proxy_url";function g(){const e=new URLSearchParams(window.location.search).get("proxy");return e?(localStorage.setItem(c,e),e):localStorage.getItem(c)||""}function $(t){localStorage.setItem(c,t)}function k(){localStorage.removeItem(c)}function h(){return!!g()}function y(){return h()?"proxy":localStorage.getItem("beatcut:or_key")||""}function b(t){localStorage.setItem("beatcut:or_key",t)}function v(){return h()?!0:!!y()}const x=[{id:"meta-llama/llama-3.1-8b-instruct:free",name:"Llama 3.1 8B (gratuit)",description:"Rapide, bon pour le tri et la sélection"},{id:"mistralai/mistral-7b-instruct:free",name:"Mistral 7B (gratuit)",description:"Alternative française, bon pour textes FR"},{id:"google/gemma-2-9b-it:free",name:"Gemma 2 9B (gratuit)",description:"Google, équilibré"}];function T(){return localStorage.getItem("beatcut:or_model")||x[0].id}function E(t){localStorage.setItem("beatcut:or_model",t)}async function S(t,e={}){var r,i,u,p,d,f;const s=g();if(s){const a=await fetch(`${s}/llm`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:e.messages||[{role:"user",content:t}],model:e.model,max_tokens:e.max_tokens||1e3,temperature:e.temperature??.7})});if(!a.ok){const w=await a.text();throw new Error(`Proxy ${a.status}: ${w.slice(0,300)}`)}return((u=(i=(r=(await a.json()).choices)==null?void 0:r[0])==null?void 0:i.message)==null?void 0:u.content)||""}const o=y();if(!o||o==="proxy")throw new Error("Clé OpenRouter manquante (ou configure un proxy)");const l=e.model||T(),n=await fetch(`${OR_BASE}/chat/completions`,{method:"POST",headers:{Authorization:`Bearer ${o}`,"Content-Type":"application/json","HTTP-Referer":window.location.origin,"X-Title":"BeatCut Perso"},body:JSON.stringify({model:l,messages:e.messages||[{role:"user",content:t}],temperature:e.temperature??.7,max_tokens:e.max_tokens??1e3})});if(!n.ok){const a=await n.text();throw new Error(`OpenRouter ${n.status}: ${a.slice(0,300)}`)}return((f=(d=(p=(await n.json()).choices)==null?void 0:p[0])==null?void 0:d.message)==null?void 0:f.content)||""}async function P(t){const{lyrics:e,bpm:s,candidates:o}=t,l=`Tu es un directeur artistique pour clips musicaux TikTok.

Voici les paroles de la musique :
"${e}"

BPM : ${s}

Voici des candidats de scènes de films :
${o.map((r,i)=>`
${i+1}. "${r.movieTitle}" (${r.year||"?"}) — Phrase : "${r.quote}"
   Timestamp : ${r.timestamp}s
   Match score : ${r.matchScore}
`).join("")}

Tâche : sélectionne les 3 à 5 scènes qui matchent le MIEUX avec le thème/l'ambiance des paroles.

Critères :
- Cohérence thématique avec les paroles
- Émotion/mood similaire
- Diversité visuelle (pas 5 scènes du même film)
- Timing adapté pour un clip TikTok (15-30s)

Réponds UNIQUEMENT avec un JSON valide (pas de markdown, pas de texte autour) :
{
  "selections": [
    { "index": 1, "reason": "Pourquoi cette scène matche" },
    ...
  ]
}`,m=(await S(l,{temperature:.6,max_tokens:600})).match(/\{[\s\S]*\}/);if(!m)throw new Error("LLM n'a pas retourné de JSON");return JSON.parse(m[0])}async function _(t){const e=`Analyse les paroles suivantes et détermine :
1. Le thème principal (1-3 mots)
2. L'émotion dominante
3. 3-5 mots-clés visuels pour un clip vidéo

Paroles :
"${t}"

Réponds UNIQUEMENT en JSON :
{
  "theme": "...",
  "emotion": "...",
  "visualKeywords": ["...", "...", "..."]
}`,o=(await S(e,{temperature:.5,max_tokens:200})).match(/\{[\s\S]*\}/);return o?JSON.parse(o[0]):{theme:"mélancolique",emotion:"contemplatif",visualKeywords:["ville","nuit","pluie"]}}export{x as FREE_MODELS,S as callLLM,k as clearProxyUrl,_ as detectTheme,y as getOpenRouterApiKey,g as getProxyUrl,T as getSelectedModel,v as isOpenRouterApiKeyConfigured,h as isProxyMode,P as selectBestClips,b as setOpenRouterApiKey,$ as setProxyUrl,E as setSelectedModel};
