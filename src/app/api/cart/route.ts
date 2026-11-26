import { currentUser } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { api } from "@/lib/server/http";

export const GET = api(async () => {
  const user = await currentUser();
  const items = user ? await db.cartItem.findMany({where:{cartId:user.id,service:{active:true}},select:{serviceId:true,quantity:true}}) : [];
  return {items};
});
