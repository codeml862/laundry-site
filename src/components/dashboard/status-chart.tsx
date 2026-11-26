const groups = [
  {label:"Completed",color:"#0d640b",statuses:["DELIVERED"]},
  {label:"In Progress",color:"#a4d96c",statuses:["RECEIVED","WASHING","DRYING","IRONING","QUALITY_CHECK","READY","OUT_FOR_DELIVERY"]},
  {label:"Picked Up",color:"#ff7900",statuses:["PICKED_UP"]},
  {label:"Scheduled",color:"#f5c400",statuses:["ORDER_PLACED","PICKUP_SCHEDULED"]},
  {label:"Cancelled",color:"#b7b9b1",statuses:["CANCELLED"]},
];

export function StatusChart({ statuses }: {statuses:{status:string;count:number}[]}) {
  const total = statuses.reduce((sum,item)=>sum+item.count,0);
  let offset = 0;
  const segments = groups.map((group)=>{
    const count = statuses.filter((item)=>group.statuses.includes(item.status)).reduce((sum,item)=>sum+item.count,0);
    const fraction = total ? count/total*100 : 0;
    const segment = {...group,count,fraction,offset}; offset += fraction; return segment;
  });
  return <div className="flex flex-wrap items-center justify-center gap-5 px-5 pb-6">
    <div className="relative size-40 shrink-0">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90" role="img" aria-label={`Order status breakdown for ${total} orders`}>
        <circle cx="60" cy="60" r="46" fill="none" stroke="#edf1e6" strokeWidth="18" />
        {segments.filter((item)=>item.count).map((item)=><circle key={item.label} cx="60" cy="60" r="46" pathLength="100" fill="none" stroke={item.color} strokeWidth="18" strokeDasharray={`${item.fraction} ${100-item.fraction}`} strokeDashoffset={-item.offset}><title>{item.label}: {item.count}</title></circle>)}
      </svg>
      <p className="absolute inset-0 grid content-center text-center"><strong className="text-2xl font-extrabold text-[#12340e]">{total.toLocaleString("en-IN")}</strong><span className="text-xs text-muted-foreground">Total Orders</span></p>
    </div>
    <ul className="min-w-36 flex-1 space-y-3 text-sm">{segments.map((item)=><li key={item.label} className="flex items-center gap-2"><span className="size-3 shrink-0 rounded-sm" style={{background:item.color}} aria-hidden="true" /><span>{item.label}</span><strong className="ml-auto tabular-nums">{Math.round(item.fraction)}%</strong></li>)}</ul>
  </div>;
}
