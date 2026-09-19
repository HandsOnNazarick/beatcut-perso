const p="https://openrouter.ai/api/v1";function c(){return localStorage.getItem("beatcut:or_key")||""}function f(e){localStorage.setItem("beatcut:or_key",e)}function g(){return!!c()}const d=[{id:"meta-llama/llama-3.1-8b-instruct:free",name:"Llama 3.1 8B (gratuit)",description:"Rapide, bon pour le tri et la sélection"},{id:"mistralai/mistral-7b-instruct:free",name:"Mistral 7B (gratuit)",description:"Alternative française, bon pour textes FR"},{id:"google/gemma-2-9b-it:free",name:"Gemma 2 9B (gratuit)",description:"Google, équilibré"}];function h(){return localStorage.getItem("beatcut:or_model")||d[0].id}function S(e){localStorage.setItem("beatcut:or_model",e)}async function l(e,t={}){var r,o,i;const n=c();if(!n)throw new Error("Clé OpenRouter manquante");const a=t.model||h(),s=await fetch(`${p}/chat/completions`,{method:"POST",headers:{Authorization:`Bearer ${n}`,"Content-Type":"application/json","HTTP-Referer":window.location.origin,"X-Title":"BeatCut Perso"},body:JSON.stringify({model:a,messages:t.messages||[{role:"user",content:e}],temperature:t.temperature??.7,max_tokens:t.max_tokens??1e3})});if(!s.ok){const u=await s.text();throw new Error(`OpenRouter ${s.status}: ${u.slice(0,300)}`)}return((i=(o=(r=(await s.json()).choices)==null?void 0:r[0])==null?void 0:o.message)==null?void 0:i.content)||""}async function y(e){const{lyrics:t,bpm:n,candidates:a}=e,s=`Tu es un directeur artistique pour clips musicaux TikTok.

Voici les paroles de la musique :
"${t}"

BPM : ${n}

Voici des candidats de scènes de films :
${a.map((o,i)=>`
${i+1}. "${o.movieTitle}" (${o.year||"?"}) — Phrase : "${o.quote}"
   Timestamp : ${o.timestamp}s
   Match score : ${o.matchScore}
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
}`,r=(await l(s,{temperature:.6,max_tokens:600})).match(/\{[\s\S]*\}/);if(!r)throw new Error("LLM n'a pas retourné de JSON");return JSON.parse(r[0])}async function T(e){const t=`Analyse les paroles suivantes et détermine :
1. Le thème principal (1-3 mots)
2. L'émotion dominante
3. 3-5 mots-clés visuels pour un clip vidéo

Paroles :
"${e}"

Réponds UNIQUEMENT en JSON :
{
  "theme": "...",
  "emotion": "...",
  "visualKeywords": ["...", "...", "..."]
}`,a=(await l(t,{temperature:.5,max_tokens:200})).match(/\{[\s\S]*\}/);return a?JSON.parse(a[0]):{theme:"mélancolique",emotion:"contemplatif",visualKeywords:["ville","nuit","pluie"]}}export{d as FREE_MODELS,l as callLLM,T as detectTheme,c as getOpenRouterApiKey,h as getSelectedModel,g as isOpenRouterApiKeyConfigured,y as selectBestClips,f as setOpenRouterApiKey,S as setSelectedModel};
