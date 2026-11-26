import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync } from "node:crypto";

const db = new PrismaClient();
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || password.length < 12 || password.length > 128)) {
  throw new Error("Supply a valid ADMIN_EMAIL and ADMIN_PASSWORD between 12 and 128 characters.");
}
try {
  // Creates the settings row with schema defaults; configure the real business in the admin dashboard.
  await db.settings.upsert({where:{id:1},update:{},create:{}});
  if (email && password) {
    const salt = randomBytes(16).toString("hex");
    const passwordHash = salt+":"+scryptSync(password,salt,64).toString("hex");
    const existing = await db.user.findUnique({where:{email},select:{role:true}});
    if (existing && existing.role !== "ADMIN") throw new Error("The seed email belongs to a non-admin account.");
    await db.user.upsert({where:{email},update:{},create:{email,name:"Administrator",role:"ADMIN",verified:true,passwordHash}});
  }
  console.log("Quicklywash seed complete.");
} finally {
  await db.$disconnect();
}
