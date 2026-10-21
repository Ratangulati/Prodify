-- CreateTable
CREATE TABLE "GitHubConnection" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "installationId" INTEGER NOT NULL,
    "accountLogin" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GitHubConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GitHubRepo" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "githubId" INTEGER NOT NULL,
    "fullName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GitHubRepo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GitHubConnection_workspaceId_key" ON "GitHubConnection"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "GitHubConnection_installationId_key" ON "GitHubConnection"("installationId");

-- CreateIndex
CREATE UNIQUE INDEX "GitHubRepo_githubId_key" ON "GitHubRepo"("githubId");

-- CreateIndex
CREATE INDEX "GitHubRepo_workspaceId_idx" ON "GitHubRepo"("workspaceId");

-- AddForeignKey
ALTER TABLE "GitHubConnection" ADD CONSTRAINT "GitHubConnection_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GitHubRepo" ADD CONSTRAINT "GitHubRepo_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

