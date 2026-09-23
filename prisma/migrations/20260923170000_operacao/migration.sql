-- Manutenção operacional e checklists. Não altera Lancamento nem a tela financeira /manutencao.

CREATE TABLE "Manutencao" (
    "id" TEXT NOT NULL,
    "condominioId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "local" TEXT,
    "prioridade" TEXT NOT NULL DEFAULT 'NORMAL',
    "dataPrevista" TIMESTAMP(3),
    "responsavelId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "iniciadoEm" TIMESTAMP(3),
    "concluidoEm" TIMESTAMP(3),
    "concluidoPorId" TEXT,
    "notasConclusao" TEXT,
    "custoCents" INTEGER,
    "criadoPorId" TEXT,
    "chaveIdempotencia" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Manutencao_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ModeloChecklist" (
    "id" TEXT NOT NULL,
    "condominioId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "departamento" TEXT NOT NULL,
    "diasSemana" INTEGER[],
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "exigeFoto" BOOLEAN NOT NULL DEFAULT true,
    "exigeJustificativa" BOOLEAN NOT NULL DEFAULT true,
    "criadoPorId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModeloChecklist_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ItemModeloChecklist" (
    "id" TEXT NOT NULL,
    "condominioId" TEXT NOT NULL,
    "modeloId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "exigeFoto" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemModeloChecklist_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AtribuicaoModeloChecklist" (
    "id" TEXT NOT NULL,
    "condominioId" TEXT NOT NULL,
    "modeloId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AtribuicaoModeloChecklist_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChecklistDiario" (
    "id" TEXT NOT NULL,
    "condominioId" TEXT NOT NULL,
    "modeloId" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "responsavelId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "iniciadoEm" TIMESTAMP(3),
    "concluidoEm" TIMESTAMP(3),
    "concluidoPorId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChecklistDiario_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ItemChecklistDiario" (
    "id" TEXT NOT NULL,
    "condominioId" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "exigeFoto" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "comentario" TEXT,
    "feitoEm" TIMESTAMP(3),
    "questionamento" TEXT,
    "questionadoEm" TIMESTAMP(3),
    "questionadoPorId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemChecklistDiario_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EvidenciaChecklist" (
    "id" TEXT NOT NULL,
    "condominioId" TEXT NOT NULL,
    "checklistId" TEXT NOT NULL,
    "itemId" TEXT,
    "caminho" TEXT NOT NULL,
    "nomeOriginal" TEXT,
    "tipo" TEXT,
    "tamanho" INTEGER,
    "enviadoPorId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EvidenciaChecklist_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ImportacaoOperacao" (
    "id" TEXT NOT NULL,
    "condominioId" TEXT NOT NULL,
    "tabela" TEXT NOT NULL,
    "idOrigem" TEXT NOT NULL,
    "idDestino" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportacaoOperacao_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Manutencao_condominioId_status_idx" ON "Manutencao"("condominioId", "status");
CREATE INDEX "Manutencao_condominioId_criadoEm_idx" ON "Manutencao"("condominioId", "criadoEm");
CREATE UNIQUE INDEX "Manutencao_idempotencia_key" ON "Manutencao"("condominioId", "criadoPorId", "chaveIdempotencia") WHERE "chaveIdempotencia" IS NOT NULL AND "criadoPorId" IS NOT NULL;

CREATE INDEX "ModeloChecklist_condominioId_ativo_idx" ON "ModeloChecklist"("condominioId", "ativo");
CREATE INDEX "ItemModeloChecklist_modeloId_idx" ON "ItemModeloChecklist"("modeloId");
CREATE INDEX "ItemModeloChecklist_condominioId_idx" ON "ItemModeloChecklist"("condominioId");
CREATE UNIQUE INDEX "AtribuicaoModeloChecklist_modeloId_usuarioId_key" ON "AtribuicaoModeloChecklist"("modeloId", "usuarioId");
CREATE INDEX "AtribuicaoModeloChecklist_condominioId_idx" ON "AtribuicaoModeloChecklist"("condominioId");

CREATE INDEX "ChecklistDiario_condominioId_data_idx" ON "ChecklistDiario"("condominioId", "data");
CREATE INDEX "ChecklistDiario_modeloId_idx" ON "ChecklistDiario"("modeloId");
CREATE UNIQUE INDEX "ChecklistDiario_com_resp_key" ON "ChecklistDiario"("condominioId", "modeloId", "data", "responsavelId") WHERE "responsavelId" IS NOT NULL;
CREATE UNIQUE INDEX "ChecklistDiario_sem_resp_key" ON "ChecklistDiario"("condominioId", "modeloId", "data") WHERE "responsavelId" IS NULL;

CREATE INDEX "ItemChecklistDiario_checklistId_idx" ON "ItemChecklistDiario"("checklistId");
CREATE INDEX "ItemChecklistDiario_condominioId_idx" ON "ItemChecklistDiario"("condominioId");
CREATE INDEX "EvidenciaChecklist_checklistId_idx" ON "EvidenciaChecklist"("checklistId");
CREATE INDEX "EvidenciaChecklist_condominioId_idx" ON "EvidenciaChecklist"("condominioId");
CREATE UNIQUE INDEX "ImportacaoOperacao_condominioId_tabela_idOrigem_key" ON "ImportacaoOperacao"("condominioId", "tabela", "idOrigem");
CREATE INDEX "ImportacaoOperacao_condominioId_idx" ON "ImportacaoOperacao"("condominioId");

ALTER TABLE "Manutencao" ADD CONSTRAINT "Manutencao_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "Condominio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Manutencao" ADD CONSTRAINT "Manutencao_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Manutencao" ADD CONSTRAINT "Manutencao_concluidoPorId_fkey" FOREIGN KEY ("concluidoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Manutencao" ADD CONSTRAINT "Manutencao_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ModeloChecklist" ADD CONSTRAINT "ModeloChecklist_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "Condominio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ModeloChecklist" ADD CONSTRAINT "ModeloChecklist_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ItemModeloChecklist" ADD CONSTRAINT "ItemModeloChecklist_modeloId_fkey" FOREIGN KEY ("modeloId") REFERENCES "ModeloChecklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AtribuicaoModeloChecklist" ADD CONSTRAINT "AtribuicaoModeloChecklist_modeloId_fkey" FOREIGN KEY ("modeloId") REFERENCES "ModeloChecklist"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AtribuicaoModeloChecklist" ADD CONSTRAINT "AtribuicaoModeloChecklist_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ChecklistDiario" ADD CONSTRAINT "ChecklistDiario_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "Condominio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ChecklistDiario" ADD CONSTRAINT "ChecklistDiario_modeloId_fkey" FOREIGN KEY ("modeloId") REFERENCES "ModeloChecklist"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ChecklistDiario" ADD CONSTRAINT "ChecklistDiario_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ChecklistDiario" ADD CONSTRAINT "ChecklistDiario_concluidoPorId_fkey" FOREIGN KEY ("concluidoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ItemChecklistDiario" ADD CONSTRAINT "ItemChecklistDiario_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "ChecklistDiario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ItemChecklistDiario" ADD CONSTRAINT "ItemChecklistDiario_questionadoPorId_fkey" FOREIGN KEY ("questionadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EvidenciaChecklist" ADD CONSTRAINT "EvidenciaChecklist_checklistId_fkey" FOREIGN KEY ("checklistId") REFERENCES "ChecklistDiario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EvidenciaChecklist" ADD CONSTRAINT "EvidenciaChecklist_enviadoPorId_fkey" FOREIGN KEY ("enviadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ImportacaoOperacao" ADD CONSTRAINT "ImportacaoOperacao_condominioId_fkey" FOREIGN KEY ("condominioId") REFERENCES "Condominio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Manutencao" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ModeloChecklist" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ItemModeloChecklist" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AtribuicaoModeloChecklist" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ChecklistDiario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ItemChecklistDiario" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EvidenciaChecklist" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ImportacaoOperacao" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "Manutencao" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ModeloChecklist" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ItemModeloChecklist" FORCE ROW LEVEL SECURITY;
ALTER TABLE "AtribuicaoModeloChecklist" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ChecklistDiario" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ItemChecklistDiario" FORCE ROW LEVEL SECURITY;
ALTER TABLE "EvidenciaChecklist" FORCE ROW LEVEL SECURITY;
ALTER TABLE "ImportacaoOperacao" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "Manutencao"
  USING (app_condominio_id() IS NULL OR "condominioId" = app_condominio_id())
  WITH CHECK (app_condominio_id() IS NULL OR "condominioId" = app_condominio_id());
CREATE POLICY tenant_isolation ON "ModeloChecklist"
  USING (app_condominio_id() IS NULL OR "condominioId" = app_condominio_id())
  WITH CHECK (app_condominio_id() IS NULL OR "condominioId" = app_condominio_id());
CREATE POLICY tenant_isolation ON "ItemModeloChecklist"
  USING (app_condominio_id() IS NULL OR "condominioId" = app_condominio_id())
  WITH CHECK (app_condominio_id() IS NULL OR "condominioId" = app_condominio_id());
CREATE POLICY tenant_isolation ON "AtribuicaoModeloChecklist"
  USING (app_condominio_id() IS NULL OR "condominioId" = app_condominio_id())
  WITH CHECK (app_condominio_id() IS NULL OR "condominioId" = app_condominio_id());
CREATE POLICY tenant_isolation ON "ChecklistDiario"
  USING (app_condominio_id() IS NULL OR "condominioId" = app_condominio_id())
  WITH CHECK (app_condominio_id() IS NULL OR "condominioId" = app_condominio_id());
CREATE POLICY tenant_isolation ON "ItemChecklistDiario"
  USING (app_condominio_id() IS NULL OR "condominioId" = app_condominio_id())
  WITH CHECK (app_condominio_id() IS NULL OR "condominioId" = app_condominio_id());
CREATE POLICY tenant_isolation ON "EvidenciaChecklist"
  USING (app_condominio_id() IS NULL OR "condominioId" = app_condominio_id())
  WITH CHECK (app_condominio_id() IS NULL OR "condominioId" = app_condominio_id());
CREATE POLICY tenant_isolation ON "ImportacaoOperacao"
  USING (app_condominio_id() IS NULL OR "condominioId" = app_condominio_id())
  WITH CHECK (app_condominio_id() IS NULL OR "condominioId" = app_condominio_id());
