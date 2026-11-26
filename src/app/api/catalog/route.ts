import { db } from "@/lib/server/db";
import { getSettings } from "@/lib/server/catalog";
import { api } from "@/lib/server/http";

export const GET = api(async () => {
  const [services,settings,records] = await Promise.all([
    db.service.findMany({where:{active:true},orderBy:{id:"asc"}}),
    getSettings(),
    db.review.findMany({where:{order:{status:"DELIVERED"}},orderBy:{createdAt:"desc"},take:12,
      select:{rating:true,comment:true,createdAt:true,user:{select:{name:true}}}}),
  ]);
  const reviews = records.map(({user,...review})=>({...review,name:user.name.split(" ")[0]}));
  return {services,settings,reviews};
});
