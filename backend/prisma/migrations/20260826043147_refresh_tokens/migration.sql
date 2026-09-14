-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "revocado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_tokenHash_key" ON "RefreshToken"("tokenHash");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
