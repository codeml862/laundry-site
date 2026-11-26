CREATE TABLE "DispatchRider" (
 "id" TEXT NOT NULL, "name" TEXT NOT NULL, "phone" TEXT NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true, "userId" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "DispatchRider_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DispatchRider_userId_key" ON "DispatchRider"("userId");
ALTER TABLE "DispatchRider" ADD CONSTRAINT "DispatchRider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE TABLE "DispatchRequest" (
 "id" TEXT NOT NULL, "orderId" TEXT NOT NULL, "kind" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'PENDING', "date" TEXT NOT NULL, "slot" TEXT NOT NULL, "riderId" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "DispatchRequest_pkey" PRIMARY KEY ("id"), CONSTRAINT "DispatchRequest_kind_check" CHECK ("kind" IN ('PICKUP','DELIVERY')),
 CONSTRAINT "DispatchRequest_status_check" CHECK ("status" IN ('PENDING','ASSIGNED','IN_TRANSIT','COMPLETED','CANCELLED'))
);
CREATE UNIQUE INDEX "DispatchRequest_orderId_kind_key" ON "DispatchRequest"("orderId","kind");
CREATE INDEX "DispatchRequest_date_status_idx" ON "DispatchRequest"("date","status");
CREATE INDEX "DispatchRequest_riderId_status_idx" ON "DispatchRequest"("riderId","status");
ALTER TABLE "DispatchRequest" ADD CONSTRAINT "DispatchRequest_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DispatchRequest" ADD CONSTRAINT "DispatchRequest_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "DispatchRider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE TABLE "DispatchEvent" (
 "id" TEXT NOT NULL, "requestId" TEXT NOT NULL, "status" TEXT NOT NULL, "note" TEXT NOT NULL, "actorId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "DispatchEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "DispatchEvent_requestId_createdAt_idx" ON "DispatchEvent"("requestId","createdAt");
ALTER TABLE "DispatchEvent" ADD CONSTRAINT "DispatchEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "DispatchRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
