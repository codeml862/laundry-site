import type { ReactNode } from "react";
import { redirectIfSignedIn } from "@/lib/server/guards";

/** Renders its children only for signed-out visitors; signed-in users go to their own area. */
export async function SignedOut({ children }: { children: ReactNode }) {
  await redirectIfSignedIn();
  return children;
}
