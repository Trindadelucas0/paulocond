-- CreateSchema

-- CreateTable
CREATE TABLE "Condominio" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Condominio_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TotalOficial" (
    "id" TEXT NOT NULL,
    "condominioId" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "arquivo" TEXT NOT NULL,
    "periodoInicio" TEXT NOT NULL,
    "periodoFim" TEXT NOT NULL,
    "rotulo" TEXT NOT NULL,
    "receitaCents" INTEGER NOT NULL,
    "despesaCents" INTEGER NOT NULL,
    "resultadoCents" INTEGER NOT NULL,
    "saldoInicialCents" INTEGER NOT NULL,
    "saldoFinalCents" INTEGER NOT NULL,
    "movimentoLiquidoCents" INTEGER NOT NULL,
    "qualidade" TEXT NOT NULL,
    "avisosJson" TEXT NOT NULL DEFAULT '[]',

    CONSTRAINT "TotalOficial_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Periodo" (
    "id" TEXT NOT NULL,
    "condominioId" TEXT NOT NULL,
    "competencia" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "saldoAnteriorCents" INTEGER,
    "saldoFinalCents" INTEGER,
    "movimentoLiquidoCents" INTEGER,
    "qualidade" TEXT NOT NULL,

    CONSTRAINT "Periodo_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL,
    "condominioId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "grupo" TEXT NOT NULL,
    "natureza" TEXT NOT NULL,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DicionarioCategoria" (
    "id" TEXT NOT NULL,
    "condominioId" TEXT NOT NULL,
    "nomeCru" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,

    CONSTRAINT "DicionarioCategoria_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Lancamento" (
    "id" TEXT NOT NULL,
    "condominioId" TEXT NOT NULL,
    "periodoId" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "valorCents" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "origem" TEXT NOT NULL,
    "origemValor" TEXT NOT NULL,
    "linhaPlanilha" INTEGER NOT NULL,
    "arquivo" TEXT NOT NULL,
    "rotuloCru" TEXT NOT NULL,

    CONSTRAINT "Lancamento_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "condominioId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "papel" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Sessao" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiraEm" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Sessao_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Condominio_codigo_key" ON "Condominio"("codigo");
CREATE INDEX "TotalOficial_condominioId_idx" ON "TotalOficial"("condominioId");
CREATE UNIQUE INDEX "TotalOficial_condominioId_origem_key" ON "TotalOficial"("condominioId", "origem");
CREATE INDEX "Periodo_condominioId_idx" ON "Periodo"("condominioId");
CREATE UNIQUE INDEX "Periodo_condominioId_competencia_origem_key" ON "Periodo"("condominioId", "competencia", "origem");
CREATE INDEX "Categoria_condominioId_idx" ON "Categoria"("condominioId");
CREATE UNIQUE INDEX "Categoria_condominioId_slug_tipo_key" ON "Categoria"("condominioId", "slug", "tipo");
CREATE INDEX "DicionarioCategoria_condominioId_idx" ON "DicionarioCategoria"("condominioId");
CREATE UNIQUE INDEX "DicionarioCategoria_condominioId_nomeCru_origem_key" ON "DicionarioCategoria"("condominioId", "nomeCru", "origem");
CREATE INDEX "Lancamento_condominioId_tipo_idx" ON "Lancamento"("condominioId", "tipo");
CREATE INDEX "Lancamento_condominioId_origem_idx" ON "Lancamento"("condominioId", "origem");
CREATE INDEX "Lancamento_periodoId_idx" ON "Lancamento"("periodoId");
CREATE INDEX "Usuario_condominioId_idx" ON "Usuario"("condominioId");
CREATE UNIQUE INDEX "Usuario_condominioId_email_key" ON "Usuario"("condominioId", "email");
CREATE UNIQUE INDEX "Sessao_tokenHash_key" ON "Sessao"("tokenHash");
CREATE INDEX "Sessao_usuarioId_idx" ON "Sessao"("usuarioId");

ALTER TABLE "TotalOficial" ADD CONSTRAINT "TotalOficial_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "Condominio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Periodo" ADD CONSTRAINT "Periodo_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "Condominio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Categoria" ADD CONSTRAINT "Categoria_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "Condominio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DicionarioCategoria" ADD CONSTRAINT "DicionarioCategoria_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "Condominio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DicionarioCategoria" ADD CONSTRAINT "DicionarioCategoria_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "Condominio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_periodoId_fkey" FOREIGN KEY ("periodoId") REFERENCES "Periodo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Lancamento" ADD CONSTRAINT "Lancamento_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "Condominio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Sessao" ADD CONSTRAINT "Sessao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS: policies apply when app.condominio_id is set. Superuser (postgres local) bypasses RLS.
CREATE OR REPLACE FUNCTION app_condominio_id() RETURNS text AS $$
  SELECT NULLIF(current_setting('app.condominio_id', true), '');
$$ LANGUAGE sql STABLE;

ALTER TABLE "Condominio" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TotalOficial" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Periodo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Categoria" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DicionarioCategoria" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Lancamento" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Usuario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Sessao" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "Condominio" FORCE ROW LEVEL SECURITY;
ALTER TABLE "TotalOficial" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Periodo" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Categoria" FORCE ROW LEVEL SECURITY;
ALTER TABLE "DicionarioCategoria" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Lancamento" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Usuario" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Sessao" FORCE ROW LEVEL SECURITY;

CREATE POLICY condominio_isolation ON "Condominio"
  USING (app_condominio_id() IS NULL OR id = app_condominio_id())
  WITH CHECK (app_condominio_id() IS NULL OR id = app_condominio_id());

CREATE POLICY tenant_isolation ON "TotalOficial"
  USING (app_condominio_id() IS NULL OR "condominioId" = app_condominio_id())
  WITH CHECK (app_condominio_id() IS NULL OR "condominioId" = app_condominio_id());

CREATE POLICY tenant_isolation ON "Periodo"
  USING (app_condominio_id() IS NULL OR "condominioId" = app_condominio_id())
  WITH CHECK (app_condominio_id() IS NULL OR "condominioId" = app_condominio_id());

CREATE POLICY tenant_isolation ON "Categoria"
  USING (app_condominio_id() IS NULL OR "condominioId" = app_condominio_id())
  WITH CHECK (app_condominio_id() IS NULL OR "condominioId" = app_condominio_id());

CREATE POLICY tenant_isolation ON "DicionarioCategoria"
  USING (app_condominio_id() IS NULL OR "condominioId" = app_condominio_id())
  WITH CHECK (app_condominio_id() IS NULL OR "condominioId" = app_condominio_id());

CREATE POLICY tenant_isolation ON "Lancamento"
  USING (app_condominio_id() IS NULL OR "condominioId" = app_condominio_id())
  WITH CHECK (app_condominio_id() IS NULL OR "condominioId" = app_condominio_id());

CREATE POLICY tenant_isolation ON "Usuario"
  USING (app_condominio_id() IS NULL OR "condominioId" = app_condominio_id())
  WITH CHECK (app_condominio_id() IS NULL OR "condominioId" = app_condominio_id());

CREATE POLICY tenant_isolation ON "Sessao"
  USING (
    app_condominio_id() IS NULL OR EXISTS (
      SELECT 1 FROM "Usuario" u WHERE u.id = "Sessao"."usuarioId" AND u."condominioId" = app_condominio_id()
    )
  )
  WITH CHECK (
    app_condominio_id() IS NULL OR EXISTS (
      SELECT 1 FROM "Usuario" u WHERE u.id = "Sessao"."usuarioId" AND u."condominioId" = app_condominio_id()
    )
  );
