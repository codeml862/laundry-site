"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";

type SearchResult = {kind:"orders"|"customers"|"services";id:string;label:string;detail:string};
export function DashboardSearch({onPick}:{onPick:(kind:SearchResult["kind"],id:string)=>void}) {
  const [query,setQuery] = useState("");
  const [open,setOpen] = useState(false);
  const term=query.trim().toLowerCase().replace(/^#/,"");
  const [state,setState] = useState<{query:string;results:SearchResult[];error?:string}>({query:"",results:[]});
  useEffect(()=>{
    if(!term)return;
    const controller = new AbortController();
    const timer = setTimeout(()=>{
      fetch(`/api/admin/search?q=${encodeURIComponent(term)}`,{signal:controller.signal,cache:"no-store"}).then(async(response)=>{
        const data=await response.json();if(!response.ok)throw new Error(data.error||"Search unavailable.");
        if(!controller.signal.aborted)setState({query:term,results:data.results});
      }).catch((error)=>{if(!controller.signal.aborted)setState({query:term,results:[],error:error.message||"Search unavailable."});});
    },250);
    return ()=>{clearTimeout(timer);controller.abort();};
  },[term]);
  const results = state.query===term ? state.results : [];
  return <div className="relative w-full md:max-w-sm" onBlur={(event)=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false);}} onKeyDown={(event)=>{if(event.key==="Escape")setOpen(false);}}>
    <label className="flex h-11 items-center gap-2 rounded-full border border-[#dce2d5] bg-white px-4"><Search className="size-4 shrink-0" aria-hidden="true" /><span className="sr-only">Search orders, customers, or services</span><input type="search" value={query} maxLength={100} onFocus={()=>setOpen(true)} onChange={(event)=>{setQuery(event.target.value);setOpen(true);}} placeholder="Search orders, customers, or services…" className="min-w-0 flex-1 bg-transparent text-sm outline-none" aria-expanded={open&&Boolean(term)} aria-controls="dashboard-search-results" /></label>
    {open&&term&&<div id="dashboard-search-results" className="absolute inset-x-0 top-full z-40 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-border bg-white p-2 shadow-xl"><div className="flex items-center justify-between px-2 pb-1 text-xs text-muted-foreground"><span>Matching records</span><button type="button" onClick={()=>setOpen(false)} aria-label="Close search results" className="grid size-7 place-items-center"><X className="size-4" /></button></div>{results.length ? results.map((result)=><button key={result.kind+result.id} type="button" onClick={()=>{onPick(result.kind,result.id);setOpen(false);setQuery("");}} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-secondary"><span className="flex justify-between gap-2 text-sm font-semibold">{result.label}<span className="text-xs font-normal text-primary">{result.kind}</span></span><span className="block truncate text-xs text-muted-foreground">{result.detail}</span></button>) : <p className="px-3 py-4 text-sm text-muted-foreground">{state.query!==term ? "Searching…" : state.error || "No matching records."}</p>}</div>}
  </div>;
}

