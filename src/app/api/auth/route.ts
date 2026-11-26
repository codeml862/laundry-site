import { db } from "@/lib/server/db";
import { api, body, clientIp, emailValue, expect, oneOf, str } from "@/lib/server/http";
import { checkPassword, currentUser, digest, endSession, hashPassword, limit, passwordValue, startSession, token, userFields } from "@/lib/server/auth";
import { emailMessage, mailConfigured } from "@/lib/server/mail";
import type { TokenPurpose } from "@prisma/client";

async function sendLink(request: Request, user: {id:string;email:string}, purpose: TokenPurpose) {
  if (!mailConfigured() && process.env.NODE_ENV === "production") return;
  const origin = process.env.APP_URL ?? new URL(request.url).origin;
  expect(process.env.NODE_ENV !== "production" || (process.env.APP_URL && new URL(origin).protocol === "https:"),"Email links are temporarily unavailable.",503);
  const value = token();
  await db.authToken.create({data:{userId:user.id,purpose,tokenHash:digest(value),expiresAt:new Date(Date.now()+(purpose === "VERIFY" ? 86_400_000 : 3_600_000))}});
  const path = purpose === "VERIFY" ? "/verify-email" : "/reset-password";
  const link = new URL(path,origin);
  link.searchParams.set("token",value);
  await emailMessage(user.email,purpose === "VERIFY" ? "Verify your Quicklywash email" : "Reset your Quicklywash password",
    `Use this one-time link: ${link.href}\nIf you did not request this email, you can ignore it.`);
}

export const GET = api(async () => ({user:await currentUser()}));
export const POST = api(async (request) => {
  const input = await body(request);
  const action = oneOf(input.action,["login","register","logout","forgot","reset","verify","resend"],"auth action");
  if (action === "logout") {
    await endSession();
    return {user:null};
  }
  const ip = clientIp(request);
  const portal = input.portal === "admin" ? "admin" : "customer";
  // Sign-in: per network address (stops password spraying across accounts); stricter for the team portal.
  if (action === "login") await limit(`auth:login:${portal}:ip:${ip}`, portal === "admin" ? 10 : 20, 15, "Too many sign-in attempts");
  else await limit(`auth:${action}:${ip}`, 50, 15);
  if (action === "reset" || action === "verify") {
    const raw = str(input.token,"email link token",80);
    const tokenHash = digest(raw);
    const purpose = action === "reset" ? "RESET" : "VERIFY";
    const link = await db.authToken.findUnique({where:{tokenHash},include:{user:{select:{active:true,role:true}}}});
    expect(link && link.user.active && link.purpose === purpose && link.expiresAt > new Date(), "This link is invalid or has expired.");
    const passwordHash = action === "reset" ? await hashPassword(passwordValue(input.password)) : undefined;
    await db.$transaction(async (tx) => {
      const consumed = await tx.authToken.deleteMany({where:{tokenHash,userId:link.userId,purpose,expiresAt:{gt:new Date()}}});
      expect(consumed.count === 1,"This link has already been used.");
      await tx.user.update({where:{id:link.userId},data:passwordHash ? {passwordHash} : {verified:true}});
      if (passwordHash) await tx.session.deleteMany({where:{userId:link.userId}});
      await tx.authToken.deleteMany({where:{userId:link.userId,purpose}});
    },{isolationLevel:"Serializable"});
    // Team accounts sign in at /admin/login; customers at /login.
    return {message:passwordHash ? "Password reset. You can now sign in." : "Email address verified.",loginPath:link.user.role === "CUSTOMER" ? "/login" : "/admin/login"};
  }
  if (action === "resend") {
    const user = await currentUser();
    if (user && !user.verified) {
      await limit(`resend:${user.id}`,3,60);
      await sendLink(request,user,"VERIFY");
    } else if (input.email) {
      const email = emailValue(input.email);
      await limit(`resend:${email}`,3,60);
      const account = await db.user.findUnique({where:{email}});
      if (account?.active && !account.verified) await sendLink(request,account,"VERIFY");
    }
    return {message:"If verification is needed, check your inbox for a link."};
  }
  const email = emailValue(input.email);
  // Per account: stops guessing one account's password from many addresses.
  if (action === "login") await limit(`auth:login:${portal}:email:${email}`, 5, 15, "Too many sign-in attempts for this account");
  else await limit(`auth:${action}:${email}`, 4, 15);
  if (action === "register") {
    expect(mailConfigured() || process.env.NODE_ENV !== "production", "Registration email is temporarily unavailable.",503);
    const passwordHash = await hashPassword(passwordValue(input.password));
    const user = await db.user.create({data:{name:str(input.name,"name",80),email,passwordHash,verified:false,profile:{create:{}}},select:userFields});
    await startSession(user.id);
    if (!user.verified) await sendLink(request,user,"VERIFY");
    return {user,message:user.verified ? "Account created." : "Check your inbox to verify your email."};
  }
  const record = await db.user.findUnique({where:{email},select:{...userFields,passwordHash:true,active:true}});
  if (action === "forgot") {
    if (record?.active) await sendLink(request,record,"RESET");
    return {message:"If this email belongs to an account, a reset link will be sent."};
  }
  const password = input.password;
  expect(typeof password === "string" && password.length > 0 && password.length <= 128,"Enter a valid password.");
  const valid = await checkPassword(password,record?.passwordHash);
  expect(valid && record?.active,"Email or password is incorrect.",401);
  const user = {id:record.id,email:record.email,name:record.name,role:record.role,verified:record.verified,permissions:record.permissions};
  // Separate sign-in pages: customers use /login; the team uses /admin/login, which is not linked anywhere.
  // A team account on the customer page gets the same answer as a wrong password, so the team portal is never revealed.
  if (portal === "admin") expect(["ADMIN","STAFF","RIDER"].includes(user.role), "This sign-in is for the operations team. Customers can log in from the main login page.", 403);
  else expect(user.role === "CUSTOMER", "Email or password is incorrect.", 401);
  await startSession(user.id);
  return {user};
});
