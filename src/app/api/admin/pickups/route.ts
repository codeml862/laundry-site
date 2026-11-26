import { api, body } from "@/lib/server/http";
import { limit } from "@/lib/server/auth";
import { dispatchUser, listDispatch, mutateDispatch } from "@/lib/server/pickups";
export const GET = api(async request => listDispatch(request,await dispatchUser()));
export const POST = api(async request => {
  const user = await dispatchUser();
  await limit(`dispatch:${user.id}`,100,5);
  return mutateDispatch(await body(request),user);
});
