-- CreateTable
CREATE TABLE "AlertSettings" (
    "id" SERIAL NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "timeWindowStart" TEXT NOT NULL DEFAULT '00:00',
    "timeWindowEnd" TEXT NOT NULL DEFAULT '23:59',
    "threshold" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "duration" INTEGER NOT NULL DEFAULT 5,
    "cooldown" INTEGER NOT NULL DEFAULT 15,
    "speakerGroup" TEXT NOT NULL DEFAULT 'media_player.google_home_group',
    "volume" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "timezone" TEXT NOT NULL DEFAULT 'Australia/Sydney',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertLog" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gridValue" DOUBLE PRECISION NOT NULL,
    "triggered" BOOLEAN NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AlertLog_timestamp_idx" ON "AlertLog"("timestamp");
