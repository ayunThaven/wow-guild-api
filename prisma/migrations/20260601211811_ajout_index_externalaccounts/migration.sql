/*
  Warnings:

  - A unique constraint covering the columns `[provider,providerAccountId]` on the table `ExternalAccount` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "ExternalAccount_provider_providerAccountId_key" ON "ExternalAccount"("provider", "providerAccountId");
