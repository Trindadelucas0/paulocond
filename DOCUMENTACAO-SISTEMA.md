# Canto do Sabiá — Documentação do Sistema

| Item | Valor |
|------|--------|
| Versão do sistema | 0.10.2 — Excel e PDF das manutenções |
| Última atualização | 23/09/2026 (download da lista em Excel e PDF, com o filtro da tela) |
| Fonte oficial | Este arquivo |

## 1. Como usar este documento

Fonte única de comportamento do dashboard financeiro do condomínio Canto do Sabiá (código 132).  
Antes de alterar código: localizar a tela/fluxo aqui, depois o path em “onde olhar no código”.  
Não inventar tela, regra ou proteção que o código não implementa.

## 2. Tecnologias utilizadas

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4
- PostgreSQL via Prisma (servidor). SQLite deixou de ser a fonte.
- ExcelJS no importador CLI
- GSAP + `@gsap/react` (cliente)
- Sessão opaca (cookie HttpOnly) + `scrypt` para senha
- Testes: `node:test` via `tsx` (inclui `tests/auth.test.ts`)

Frontend não acessa banco nem Excel. Regras e totais saem da API.

### 2.1 Histórico de versões

| Versão | Data | O que mudou |
|--------|------|-------------|
| 0.10.2 — Excel e PDF das manutenções | 23/09/2026 | Botões Excel e PDF em Manutenções. Baixam o filtro atual (tipo, status, responsável, busca), não só a página. Colunas do Excel: título, descrição, tipo, status, prioridade, responsável, local, data, custo. O PDF traz título, tipo, status, responsável e data. ADMIN e LEITURA baixam. |
| 0.10.1 — Responsável da manutenção | 23/09/2026 | Tela Manutenções mostra o nome atribuído na origem (`responsavelNome`) e um resumo: total, pendentes, em andamento, preventivas, corretivas e quantidade por pessoa. Clique no card filtra a lista. |
| 0.10.0 — Operação | 23/09/2026 | Menu Operação: `/operacao/manutencoes`, `/operacao/checklist-modelos`, `/operacao/checklists`. ADMIN grava e executa; LEITURA só lê. A tela financeira `/manutencao` não muda. Carga única: `npm run importar:operacao`. Fotos de checklist em `storage/evidencias`, fora de `public/`. |
| 0.9.1 — Login e usuários | 17/09/2026 | LEITURA não vê `/configuracoes` nem `GET /api/modulo?modulo=configuracoes`; não troca senha em `/conta` nem `PATCH /api/conta/senha`. ADMIN redefine senha em Usuários. `SemPermissao.tsx`. Cookie `Secure` só se `AUTH_COOKIE_SECURE=true` (HTTPS na VPS pública; LAN HTTP no Êxito fica `false`). |
| 0.9.0 — Login e usuários | 17/09/2026 | Login `/login`; papéis ADMIN e LEITURA; `/usuarios` só admin; cookie HttpOnly; APIs financeiras exigem sessão; Prisma em PostgreSQL (`sabia`) com RLS; seed `npm run seed:admin` |
| 0.8.1 — Folha por unidade | 17/09/2026 | Relatório por unidade: print em fluxo (portal no `body`, tabela com `thead`, sem `visibility`/`position: absolute`); PDF não sobrepõe páginas; GSAP zera transform em `print`; `RelatorioUnidadeFolha.tsx`, `app/globals.css` |
| 0.8.0 — PDF por card | 17/09/2026 | Cada card de conteúdo (home e telas de análise) tem botão PDF; `window.print` isolado (`print-card-isolado`); sem PDF no servidor; Relatório da Assembleia continua Imprimir de todos os slides; `CardExportavel.tsx`, `lib/exportar-card.ts` |
| 0.7.0 — Impostos e taxa prevista | 17/09/2026 | Análise: cotas − contratos − impostos − manutenção + acordo; Relatório da Assembleia: slide **Nova taxa condominial prevista** (novo custo, média ÷ 124, tabela por competência); `montarNovaTaxaMensal`, `TabelaNovaTaxaMensal.tsx` |
| 0.6.0 — Fração e simulação | 16/09/2026 | `/taxa-condominial?visao=nova-taxa`: rateio por fração ideal (136 unidades da planilha, aptos + vagas); filtro por código; valor da unidade; ano simulado com % (–50 a +100) só sobre Contratos fixos e Impostos; taxa ideal atual continua sem Impostos; `lib/fracao-ideal.ts`, `dados/fracoes-ideais.json`, `simularAnoTaxa` |
| 0.5.0 — Análise da taxa | 15/09/2026 | `/taxa-condominial`: tablist **Análise** / **Nova taxa condominial** (`?visao=nova-taxa`); demonstrativo (cotas − contratos − manutenção + acordo = Resultado 3); KPIs cotas/saiu/sobrou/média removidos desta tela; cobertura permanece abaixo (cota vs todas as despesas); canvas da taxa ideal (médias + 4,56% + ÷ 124) e folha por unidade; `lib/analise-taxa.ts`, `lib/nova-taxa-ideal.ts` |
| 0.4.0 — Inadimplência | 01/09/2026 | Card **Inadimplência** na Visão Geral e em Taxa condominial: série informada Set/25–Ago/26 (valor e % no fim de cada mês); último mês Ago/26 R$ 13.636,63 (2,92%); pico Jan/26 R$ 18.738,30; **total acumulado 4,56%** = média dos 12 percentuais (não soma dos R$); slide no Relatório; `lib/inadimplencia.ts` |
| 0.3.1 — Contas de consumo | 01/09/2026 | Comparativo e Utilidades: bloco **Contas de consumo** Jan–Jul (água, gás, energia solar); gás médio por **124 unidades**; conferência rateio gás; `lib/consumo.ts`, `lib/format.ts` (`UNIDADES_CONDOMINIO`) |
| 0.3.0 — Cobertura da cota | 01/09/2026 | Bloco **A cota cobriu as despesas?** na Visão Geral e em Taxa condominial: cota + saldo de entrada (R$ 0,00) − despesas registradas; selo Cobriu/Não cobriu; outras receitas e resultado geral; slide no Relatório da Assembleia; `lib/cobertura-cota.ts` |
| 0.2.5 — Visão Geral | 01/09/2026 | Card **Saldo gerencial** na home (recorte Out/25–Set/26) = **R$ 71.204,98** (`SALDO_GERENCIAL_HOME_CENTS`); gráfico e importador mantêm saldo final da planilha R$ 351.239,01; drawer mostra os dois valores |
| 0.2.4 — Telas do menu | 01/09/2026 | Fundo de reserva: card **Saldo do fundo** = R$ 191.599,35 (constante `SALDO_FUNDO_RESERVA_CENTS`); arrecadação e despesa do recorte inalteradas; slide do relatório alinhado |
| 0.2.3 — Telas do menu | 01/09/2026 | Detalhamento: tabela planilha com uma coluna por competência (Out/25…Set/26 ou Jan–Jul) e Total no fim; categorias expansíveis; itens na mesma linha |
| 0.2.2 — Telas do menu | 01/09/2026 | Saldo inicial sempre R$ 0,00 (KPI Fluxo, waterfall, relatório e totais oficiais). Não usa a linha Saldo anterior da planilha |
| 0.2.1 — Telas do menu | 01/09/2026 | Escala visual menor (fonte fluida 13–15px); conteúdo limitado a 1280px; gráficos e pills com rolagem no celular; viewport `device-width` |
| 0.2.0 — Telas do menu | 01/09/2026 | Todas as 17 rotas da sidebar ativas; GET `/api/modulo`; Relatório da Assembleia (slides, tela cheia, imprimir) |
| 0.1.2 — Visão Geral | 01/09/2026 | Cards da home com borda verde fina (`border-card-line`, 1px, verde da marca a 28%) |
| 0.1.1 — Visão Geral | 01/09/2026 | Logo oficial (`public/marca/logo-canto-do-sabia.png`) na sidebar, no header mobile e no ícone da aba |
| 0.1.0 — Visão Geral | 01/09/2026 | Importador CLI, SQLite, GET `/api/visao-geral` e `/api/origem`, tela Visão Geral, motion GSAP, sidebar com 17 itens do PRD |

## 3. Mapa de telas / conexões

```
Excel 2025/2026 (dados/originais)
        ↓ npm run importar
     PostgreSQL sabia (Prisma)
        ↓ sessão (cookie) + condominioId
  GET /api/visao-geral
  GET /api/origem
  GET /api/modulo?modulo=&recorte=&ordem=
        ↓
  /login → / Visão Geral
  /receitas … /relatorio
  /configuracoes /usuarios /conta (ADMIN)
  /operacao/manutencoes
  /operacao/checklist-modelos
  /operacao/checklists
```

Itens da sidebar navegam. **Configurações**, **Usuários** e **Minha senha** só para ADMIN. O grupo **Operação** aparece para ADMIN e LEITURA; gravar e executar é só ADMIN. Sem “Em breve”. Sem cadastro público. A tela `/manutencao` continua sendo o ranking financeiro da planilha.

## 4. Papéis e acesso

| Papel | Quem | O que pode |
|-------|------|------------|
| ADMIN | Primeiro via `npm run seed:admin`; depois o próprio admin cria outros | Dashboard + `/configuracoes` + `/usuarios` + `/conta` + APIs de usuários e senha própria + gravar/executar Operação |
| LEITURA | Criado pelo admin | Dashboard financeiro e leitura de Operação; 403 em Configurações, Minha senha, gestão de usuários e em POST/PATCH/DELETE de Operação |

Sessão: cookie `sabia_sessao` HttpOnly, SameSite=Lax. Tenant: `condominioId` da sessão deve coincidir com `CONDOMINIO_CODIGO` do deploy (132). Sem sessão, páginas vão para `/login`; APIs respondem 401. Papéis síndico/conselho/assembleia: não implementados (só ADMIN e LEITURA).

## 5. Índice de rotas e “onde olhar no código”

| Rota / script | O que faz | Onde olhar |
|---------------|-----------|------------|
| `/login` | Entrar (sem menu) | `app/login/page.tsx`, `components/auth/LoginForm.tsx` |
| `/` | Visão Geral | `app/(app)/page.tsx`, `components/visao-geral/` |
| `/receitas` | Ordinárias, extra, eventuais, composição, ranking | `app/receitas/page.tsx` |
| `/despesas` | Natureza, top 10, impostos | `app/despesas/page.tsx` |
| `/fluxo` | Waterfall: saldo inicial R$ 0,00 + receitas − despesas; saldo final da planilha | `app/fluxo/page.tsx` |
| `/taxa-condominial` | Análise da taxa (demonstrativo) e Nova taxa condominial (fração + simulação %) | `app/taxa-condominial/page.tsx`, `lib/analise-taxa.ts`, `lib/nova-taxa-ideal.ts`, `lib/fracao-ideal.ts` |
| `/fundo-reserva` | Arrecadação, despesa, saldo do fundo (informado) | `app/fundo-reserva/page.tsx` |
| `/taxas-extras` | Academia arrecadado vs utilizado | `app/taxas-extras/page.tsx` |
| `/contratos` | Ranking + Empresa Terceirizada | `app/contratos/page.tsx` |
| `/utilidades` | Água, gás, energia, solar, telefone | `app/utilidades/page.tsx` |
| `/manutencao` | Ranking financeiro da planilha (não é ordem de serviço) | `app/(app)/manutencao/page.tsx`, `lib/modulos.ts` |
| `/operacao/manutencoes` | Ordens de manutenção: listar, criar, editar, iniciar, dar baixa, cancelar, excluir | `app/(app)/operacao/manutencoes/page.tsx`, `components/operacao/PaginaManutencoes.tsx`, `lib/operacao/servico.ts` |
| `/operacao/checklist-modelos` | Modelos de checklist (departamento, dias, itens, responsáveis) | `app/(app)/operacao/checklist-modelos/page.tsx`, `components/operacao/PaginaModelos.tsx` |
| `/operacao/checklists` | Acompanhar e executar o checklist do dia | `app/(app)/operacao/checklists/page.tsx`, `components/operacao/PaginaChecklists.tsx` |
| `/patrimonio` | Bens patrimoniais | `app/patrimonio/page.tsx` |
| `/comparativo` | Só Jan–Jul vs Jan–Jul | `app/comparativo/page.tsx` |
| `/analise-mensal` | Receita/despesa/resultado/saldo por mês | `app/analise-mensal/page.tsx` |
| `/detalhamento` | Planilha categoria/item × meses + Total | `app/detalhamento/page.tsx`, `components/paginas/DetalhamentoTabela.tsx` |
| `/alertas` | Motor objetivo | `app/alertas/page.tsx` |
| `/relatorio` | Slides da assembleia (inclui nova taxa prevista), tela cheia, imprimir | `app/relatorio/page.tsx`, `lib/nova-taxa-ideal.ts` |
| `/configuracoes` | Condomínio, fonte, qualidade, texto de login (ADMIN) | `app/(app)/configuracoes/page.tsx` |
| `/usuarios` | Lista e cria usuários (ADMIN) | `app/(app)/usuarios/page.tsx`, `components/paginas/PaginaUsuarios.tsx` |
| `/conta` | Trocar a própria senha (ADMIN) | `app/(app)/conta/page.tsx`, `ContaSenhaForm.tsx` |
| Shell | Menu + marca; item ativo por pathname; escala fluida | `components/shell/`, `app/globals.css` |
| PDF do card | Botão no canto do card; impressão isolada | `components/paginas/CardExportavel.tsx`, `lib/exportar-card.ts`, `app/globals.css` (`print-card-isolado`) |
| `GET /api/visao-geral?recorte=` | KPIs da home | `app/api/visao-geral/route.ts`, `lib/kpis.ts` |
| `GET /api/origem?kpi=&recorte=` | Drill-down do KPI da home | `app/api/origem/route.ts` |
| `GET /api/modulo?modulo=&recorte=&ordem=` | Payload das 16 telas; `configuracoes` só ADMIN | `app/api/modulo/route.ts`, `lib/modulos.ts` |
| Chrome compartilhado | Recorte, loading, GSAP | `components/paginas/PaginaAnalise.tsx` |
| `POST /api/auth/login` | Autentica e grava cookie | `app/api/auth/login/route.ts` |
| `POST /api/auth/logout` | Invalida sessão | `app/api/auth/logout/route.ts` |
| `GET /api/auth/me` | Perfil da sessão | `app/api/auth/me/route.ts` |
| `GET/POST /api/usuarios` | Lista/cria (ADMIN) | `app/api/usuarios/route.ts` |
| `PATCH /api/usuarios/[id]` | Ativo, papel, senha (ADMIN) | `app/api/usuarios/[id]/route.ts` |
| `PATCH /api/conta/senha` | Própria senha (ADMIN) | `app/api/conta/senha/route.ts` |
| Middleware | Cookie nas rotas privadas; `Secure` só com `AUTH_COOKIE_SECURE=true` | `middleware.ts`, `lib/auth/cookie.ts` |
| `GET/POST /api/operacao/manutencoes` | Lista (50 por página) e cria ordem. POST só ADMIN | `app/api/operacao/manutencoes/route.ts` |
| `GET /api/operacao/manutencoes/exportar` | `formato=xlsx` ou `formato=pdf`. Mesmos filtros da lista. Sessão obrigatória; até 5000 linhas | `app/api/operacao/manutencoes/exportar/route.ts` |
| `GET/PATCH/DELETE /api/operacao/manutencoes/[id]` | Ficha; `acao` iniciar, dar_baixa, cancelar ou editar. Escrita só ADMIN | `app/api/operacao/manutencoes/[id]/route.ts` |
| `GET /api/operacao/usuarios` | Usuários ativos do condomínio (responsável) | `app/api/operacao/usuarios/route.ts` |
| `GET/POST /api/operacao/checklist-modelos` | Lista e cria modelo. POST só ADMIN | `app/api/operacao/checklist-modelos/route.ts` |
| `PATCH /api/operacao/checklist-modelos/[id]` | Edita ou `acao` alternar (ativo). Só ADMIN | `app/api/operacao/checklist-modelos/[id]/route.ts` |
| `GET /api/operacao/checklists?data=&departamento=` | Lista o dia e gera os checklists que faltam | `app/api/operacao/checklists/route.ts` |
| `GET/PATCH /api/operacao/checklists/[id]` | Detalhe; `acao` iniciar, finalizar ou questionar. Escrita só ADMIN | `app/api/operacao/checklists/[id]/route.ts` |
| `PATCH /api/operacao/checklists/[id]/itens/[itemId]` | Feito, não feito, observação. Só ADMIN | `app/api/operacao/checklists/[id]/itens/[itemId]/route.ts` |
| `POST /api/operacao/checklists/[id]/evidencias` | Foto jpg/png/webp até 10 MB. Só ADMIN | `app/api/operacao/checklists/[id]/evidencias/route.ts`, `lib/operacao/arquivos.ts` |
| `GET /api/operacao/evidencias/[id]` | Arquivo autenticado; não é URL pública | `app/api/operacao/evidencias/[id]/route.ts` |
| `npm run importar` | Lê Excel, valida totais, grava PostgreSQL | `scripts/importar-demonstrativo.ts` |
| `npm run importar:operacao -- arquivo.json` | Carga única das manutenções exportadas; não cria usuário | `scripts/importar-operacao.ts` |
| `npm run seed:admin` | Cria o primeiro ADMIN (e-mail/senha só no `.env`) | `scripts/seed-admin.ts` |
| `npm test` | Conciliação + auth (senha, último admin, origem) | `tests/*.test.ts` incl. `tests/auth.test.ts` |
| `npx tsx scripts/conciliar-debitos.ts` | Cruza extrato fiscal `debitos_detalhe` (somente leitura) | `scripts/conciliar-debitos.ts`, `dados/conciliacao-debitos.json` |
| Schema | Tabelas financeiras + Usuario + Sessao + Operação | `prisma/schema.prisma`, `prisma/migrations/20260923170000_operacao/` |

Recortes aceitos: `oficial-2026` (padrão), `oficial-2025`, `equivalente-jan-jul`.

Módulos aceitos: allowlist em `lib/format.ts` (`MODULO_IDS`). Ordem: `valor` ou `nome`.

KPIs de origem (home): `saldo`, `receitas`, `despesas`, `resultado`.

## 6. Telas e fluxos (fichas)

### 6.1 Visão Geral (`/`)

| Aba / seção | Campo | O que é | Obrigatório | Quem preenche | De onde vem | Para onde conecta | Como funciona | Regra / bloqueio | Onde olhar no código |
|-------------|-------|---------|-------------|---------------|-------------|-------------------|---------------|------------------|----------------------|
| Sidebar | Logo | Marca Residencial Canto do Sabiá | Sim | Sistema | Arquivo estático | `/` | Substitui o selo “CS”; “Código 132” abaixo | — | `components/shell/BrandLogo.tsx`, `public/marca/logo-canto-do-sabia.png` |
| Header mobile | Logo | Mesma marca, compacta | Sim | Sistema | Arquivo estático | `/` | Só abaixo de `lg`; botão Menu | — | `components/shell/AppShell.tsx` |
| Canvas | Conteúdo | Área útil da página | Sim | Sistema | CSS | — | Largura máxima 1280px; fonte raiz 13–15px | Sem zoom de página forçado | `app/globals.css`, `app/layout.tsx` (`viewport`) |
| Header | Título | Visão geral | Sim | Sistema | Fixo | — | SplitText na entrada; tamanho fluido (não `text-4xl`) | — | `components/visao-geral/VisaoGeral.tsx`, `app/globals.css` (`.page-title`) |
| Header | Recorte | Pill de período | Sim | Usuário | Competências importadas | Recarrega API | Troca `recorte`; rolagem horizontal no celular | Só os 3 valores da allowlist | `lib/format.ts`, `app/globals.css` (`.recorte-pills`) |
| Header | Selo | REALIZADO | Sim | Sistema | API `periodo.selo` | — | Não mistura projetado | Não há projetado neste ciclo | `lib/kpis.ts` |
| KPI | Saldo gerencial | Valor do card na home | Sim | Constante (recorte 2026) ou coluna B | `SALDO_GERENCIAL_HOME_CENTS` (Out/25–Set/26) ou saldo do mês (Jan–Jul) | Origem | Clique abre drawer com valor da home + saldo final da planilha; sem % no recorte 2026 | Não é saldo bancário de fundo/taxa extra | `lib/kpis.ts`, `lib/money.ts`, `app/globals.css` (`--color-card-line`) |
| KPI | Receitas | Total de receitas | Sim | Cálculo servidor | Coluna B no recorte oficial | Origem | Count-up GSAP | KPI oficial nunca é soma dos meses na tela | `lib/kpis.ts` |
| KPI | Despesas registradas | Total de despesas | Sim | Cálculo servidor | Coluna B | Origem | Rótulo “Despesa registrada” | Sem status Pago | `lib/kpis.ts` |
| KPI | Resultado | Receitas − despesas | Sim | Cálculo servidor | Mov. líquido oficial | Origem | — | — | `lib/kpis.ts` |
| Card | PDF | Um card por arquivo | Não | Usuário | DOM já na tela | Diálogo de impressão (Salvar como PDF) | Botão no canto; `no-print` no botão; cabeçalho com condomínio, tela, recorte e data | Não junta cards; mutex com folha por unidade; loading/erro sem botão | `CardExportavel.tsx`, `lib/exportar-card.ts` |
| KPI saldo | Margem / cobertura | Resultado/receita e saldo/média de despesa dos meses COMPLETO | Não | Cálculo servidor | Série mensal | — | Set/2026 fora da média | — | `lib/kpis.ts` |
| Bloco | Cobertura da cota | A cota cobriu as despesas? | Sim | Cálculo servidor | Cotas + saldo 0 − despesa do recorte | — | Selo Cobriu/Não cobriu; barra %; outras receitas e resultado geral | Saldo de entrada sempre R$ 0,00; não usa Saldo anterior da planilha | `lib/cobertura-cota.ts`, `components/visao-geral/CoberturaCota.tsx` |
| Bloco | Inadimplência | Saldo em atraso informado | Sim | Constante (servidor) | Série Set/25–Ago/26 (`INADIMPLENCIA_MESES`) | Taxa condominial / Relatório | Último mês, pico, tabela mês/valor/%, média 4,56% | Não vem do Excel; não soma os R$; igual em todos os recortes | `lib/inadimplencia.ts`, `components/visao-geral/CardInadimplencia.tsx` |
| Gráfico | Evolução do saldo | Área verde | Sim | API `serieSaldo` | `Periodo.saldoFinalCents` | Clique no ponto foca o mês | pathLength GSAP | — | `components/visao-geral/AreaChartSaldo.tsx` |
| Composição | Despesas / receitas | Barra segmentada + lista | Sim | API | Soma de lançamentos por grupo (inclui residual) | — | — | — | `components/visao-geral/Composicao.tsx` |
| Barras | Receita × despesa mês | Hachura; mês foco sólido | Sim | API `serieMensal` | Lançamentos | Foco do mês | `*` parcial `†` residual | — | `components/visao-geral/BarrasMensais.tsx` |
| Comparativo | Jan–Jul 2025 vs 2026 | Único comparativo da home | Sim | Soma de competências | Lançamentos | — | Nunca 7 meses contra 12 | `lib/kpis.ts` |
| Alertas | Pontos de atenção | Regras objetivas | Não | Servidor | Lançamentos | ScrollTrigger uma vez | Sem texto subjetivo | `lib/alertas.ts` |
| Qualidade | Lista | Conciliado / avisos | Sim | Servidor | Totais + regras | — | — | `lib/kpis.ts` |
| Drawer | Ver origem | Valor da home + saldo planilha (saldo 2026) | Não | API origem | `VALOR_DEFINIDO_HOME` + coluna B | Fecha no overlay | Critério `VALOR_DEFINIDO_HOME` no recorte 2026 | — | `components/visao-geral/OrigemDrawer.tsx`, `app/api/origem/route.ts` |
| Sidebar | 17 itens PRD | Navegação | Sim | `lib/nav.ts` | PRD §5 | `next/link` + pathname | Sem “Em breve” | `components/shell/Sidebar.tsx` |

Estados: loading (skeleton), erro com retry, vazio se ninguém rodou o importador.

### 6.2 Telas de análise (chrome compartilhado)

Todas abaixo usam `PaginaAnalise` + `GET /api/modulo`. Recorte nas pills (3 valores). Ranking, quando existir, ordena por valor ou nome (`ordem=`). Cards com `border-card-line` e botão **PDF** (`CardExportavel`). GSAP entrada/stagger em `.js-block`; `prefers-reduced-motion` zera duração.

| Tela | Rota | O que mostra | Regra / bloqueio | Onde olhar |
|------|------|----------------|------------------|------------|
| Receitas | `/receitas` | KPIs ordinárias / extra / eventuais, composição, evolução, ranking | Total oficial = coluna B no recorte oficial | `lib/modulos.ts` receitas |
| Despesas | `/despesas` | Total, contratos, manutenção, card Impostos, top 10, evolução | Rótulo Despesa registrada | `lib/modulos.ts` despesas |
| Fluxo | `/fluxo` | Waterfall: saldo inicial R$ 0,00; receitas; despesas; saldo gerencial final da planilha; série mensal | Saldo inicial não vem da linha Saldo anterior | `lib/modulos.ts` fluxo |
| Taxa condominial | `/taxa-condominial` | Recorte nas pills do header. Abaixo do título: tablist **Análise** (padrão) e **Nova taxa condominial** (`?visao=nova-taxa`). Sem item extra na sidebar e sem rota nova. | Demonstrativo ≠ cobertura; sem upload; sem CTA ao lado das pills | `lib/modulos.ts` taxa-condominial, `lib/analise-taxa.ts`, `lib/nova-taxa-ideal.ts`, `lib/fracao-ideal.ts`, `PaginaAnalise.tsx` |
| Fundo de reserva | `/fundo-reserva` | Arrecadação, despesa, **saldo do fundo** (R$ 191.599,35 informado) | Arrecadação/despesa = recorte; saldo = constante; nunca “saldo bancário” | `lib/modulos.ts` fundo-reserva, `lib/money.ts` |
| Taxas extras | `/taxas-extras` | Academia arrecadado vs Aquisição Equipamentos vs diferença gerencial | Não é saldo bancário da taxa extra | `lib/modulos.ts` taxas-extras |
| Contratos | `/contratos` | Ranking do grupo Contratos fixos; destaque Empresa Terceirizada e % da despesa | — | `lib/modulos.ts` contratos |
| Utilidades | `/utilidades` | Água, gás, energia, solar, telefone + comparativo Jan–Jul e média de gás ÷ 124 | Só linhas do demonstrativo; copa/salão fora do rateio | `lib/modulos.ts` utilidades, `lib/consumo.ts` |
| Manutenção | `/manutencao` | Ranking + evolução + Jan–Jul vs 2025 | Comparativo só equivalentes | `lib/modulos.ts` manutencao |
| Patrimônio | `/patrimonio` | Bens do grupo Patrimônio | Sem inventário físico | `lib/modulos.ts` patrimonio |
| Comparativo | `/comparativo` | Jan–Jul/2025 × Jan–Jul/2026 + **Contas de consumo** (água, gás, solar; gás ÷ 124) | Aviso se recorte Out/25–Set/26; gás médio igualitário, não medição individual | `lib/modulos.ts` comparativo, `lib/consumo.ts` |
| Análise mensal | `/analise-mensal` | Tabela receita/despesa/resultado/saldo gerencial por competência | * parcial † residual | `lib/modulos.ts` analise-mensal |

### 6.2.1 Taxa condominial — campos

| Aba / seção | Campo | O que é | Obrigatório | Quem preenche | De onde vem | Para onde conecta | Como funciona | Regra / bloqueio | Onde olhar no código |
|-------------|-------|---------|-------------|---------------|-------------|-------------------|---------------|------------------|----------------------|
| Header | Recorte | Período | Sim | Usuário | Allowlist | Recarrega API | Pills no header | Só 3 valores | `PaginaAnalise.tsx` |
| Abaixo do título | Visão | Análise ou Nova taxa | Sim | Usuário | `visao` na URL (opcional) | Mesma rota | Tablist 50/50 no celular; ≥44px | Só `analise` ou `nova-taxa`; outro valor = Análise | `PaginaAnalise.tsx` |
| Análise | Demonstrativo | Cotas − contratos − impostos − manutenção + acordo | Sim | Cálculo servidor | `somaNome` / `somaGrupo` no recorte | Nova taxa (link no rodapé) | Resultado 3 é o único número extra-grande; sticky no celular | Não é cobertura (cota vs todas as despesas). Contratos = grupo inteiro (inclui pró-labore). Impostos = grupo `Impostos` | `lib/analise-taxa.ts`, `AnaliseTaxaDemo.tsx` |
| Análise | KPIs cotas/saiu/sobrou/média | Removidos desta tela | — | — | — | Cobertura abaixo | Evita duplicar a história | — | `lib/modulos.ts` |
| Análise | Cobertura da cota | Cota vs **todas** as despesas | Sim | Servidor | `montarCoberturaCota` | — | Abaixo do demonstrativo | Distinto do Resultado 3 | `CoberturaCota.tsx` |
| Análise | Inadimplência | Série informada | Sim | Constante | `montarInadimplencia` | — | Ao lado da cobertura no desktop | Não vem do Excel | `CardInadimplencia.tsx` |
| Análise | Cotas por competência | Série | Sim | Servidor | Linha Cotas de Condomínio | — | Só na visão Análise | — | `BarrasValor.tsx` |
| Análise | Comparativo Jan–Jul | 2025 vs 2026 | Sim | Soma equivalentes | Lançamentos | — | Só na visão Análise | Nunca 7 vs 12 | `lib/modulos.ts` |
| Análise | Avisos | Recorte / Set parcial / pagamento | Sim | Servidor | `avisoPeriodos` | — | Uma faixa amarela compacta | — | `PaginaAnalise.tsx` |
| Nova taxa | Taxa ideal | Média mensal do condomínio (sem Impostos) | Sim | Cálculo servidor | Médias + markup 4,56% | Folha / lista por fração | Canvas (não é gaveta) | Set/2026 fora da média; meses com valor; Impostos fora deste total | `lib/nova-taxa-ideal.ts`, `NovaTaxaCanvas.tsx` |
| Nova taxa | Igualitário | Taxa (atual ou simulada) ÷ 124 | Sim | Cálculo | `UNIDADES_CONDOMINIO` | Card | Rateio igualitário só neste card | Gás no resto do sistema continua ÷ 124 | `lib/format.ts` |
| Nova taxa | Composição | Contratos (sem pró-labore) + síndico + manutenção + inadimplência | Sim | Cálculo | Grupos/nomes canônicos | — | Pró-labore separado, não duplicado | Nomes em `dados/dicionario.json` | `lib/nova-taxa-ideal.ts` |
| Nova taxa | Ano simulado | % sobre Contratos fixos e Impostos | Não | Usuário | Campo na tela (não persiste) | Lista por fração | fator = 1 + %/100; síndico e manutenção iguais; markup sobre nova base (inclui Impostos) | −50 a +100; inválido não aplica; 0% ainda soma Impostos | `simularAnoTaxa`, `NovaTaxaCanvas.tsx` |
| Nova taxa | Por fração | Taxa da base × fração da unidade | Sim | Cálculo + JSON | `dados/fracoes-ideais.json` | Filtro / detalhe / folha | 136 códigos (124 aptos + 12 vagas); residual na última linha | Sem upload; soma das frações ≈ 1 | `lib/fracao-ideal.ts` |
| Nova taxa | Busca unidade | Filtro por código | Não | Usuário | Input | Tabela | Igual, prefixo ou vaga sem o V | Empty: nenhuma unidade | `NovaTaxaCanvas.tsx` |
| Nova taxa | Relatório por unidade | Lista códigos reais e valores distintos | Não | Usuário | Base ativa (atual ou simulada) | `window.print` / Salvar como PDF | Portal no `body`; tabela Unidade \| Valor (`thead` no topo de cada folha); Esc fecha | Sem overlay absoluto; 136 linhas em sequência; sem PDF no servidor | `RelatorioUnidadeFolha.tsx`, `app/globals.css` |

Oculto na visão Nova taxa: cobertura, inadimplência, gráfico de cotas, comparativo.
| Detalhamento | `/detalhamento` | Planilha: categoria (expansível) e itens com coluna por competência + Total | Soma dos meses ≠ coluna B se houver residual (†); rolagem horizontal; nome e Total fixos | `components/paginas/DetalhamentoTabela.tsx`, `lib/modulos.ts` detalhamento |
| Alertas | `/alertas` | Motor objetivo | Sem texto subjetivo | `lib/alertas.ts` |

### 6.3 Relatório da Assembleia (`/relatorio`)

| Aba / seção | Campo | O que é | Obrigatório | Quem preenche | De onde vem | Para onde conecta | Como funciona | Regra / bloqueio | Onde olhar no código |
|-------------|-------|---------|-------------|---------------|-------------|-------------------|---------------|------------------|----------------------|
| Header | Recorte | Mesmas pills | Sim | Usuário | Allowlist | Recarrega API | Slides recálculo | — | `PaginaAnalise.tsx` |
| Ações | Tela cheia | `requestFullscreen` no palco | Não | Usuário | Browser | — | Alterna fullscreen | — | `RelatorioAssembleia.tsx` |
| Ações | Imprimir | `window.print()` | Não | Usuário | Browser | CSS print | Todos os slides | Sem PDF gerado no servidor. Sem botão PDF por slide neste ciclo | `RelatorioAssembleia.tsx` |
| Palco | Slides | Quadro-resumo, receitas, despesas, cotas, **nova taxa prevista**, cobertura da cota, inadimplência, fundo, academia, terceirizada, Jan–Jul, alertas, fonte | Sim | Servidor | `montarModulo` | Setas / teclado | Sem opinião | Só números do demonstrativo, salvo slide de inadimplência (série informada) e slide da taxa prevista (médias da taxa ideal + tabela mensal) | `lib/modulos.ts` relatorio, `RelatorioAssembleia.tsx`, `TabelaNovaTaxaMensal.tsx` |
| Palco | Nova taxa prevista | Novo custo (taxa ideal) e média ÷ 124; tabela por competência | Sim | Cálculo | `montarNovaTaxaIdeal` + `montarNovaTaxaMensal` | Mesma fórmula da visão Nova taxa | Coluna Média = taxa ideal (Set/2026 fora); células mostram o mês; Impostos fora deste total | Imprimir inclui a tabela | `lib/nova-taxa-ideal.ts` |

### 6.4 Configurações (`/configuracoes`)

| Aba / seção | Campo | O que é | Obrigatório | Quem preenche | De onde vem | Para onde conecta | Como funciona | Regra / bloqueio | Onde olhar no código |
|-------------|-------|---------|-------------|---------------|-------------|-------------------|---------------|------------------|----------------------|
| Condomínio | Nome / código | Canto do Sabiá / 132 | Sim | Importador | PostgreSQL | — | Leitura | Só ADMIN; LEITURA: Sem permissão | `lib/modulos.ts` configuracoes, `SemPermissao.tsx` |
| Fonte | Arquivos | Nomes dos Excel | Sim | Importador | `TotalOficial.arquivo` | — | — | — | — |
| Qualidade | Lista | Coluna B, residual, Set parcial | Sim | Fixo + totais | Servidor | — | — | — | — |
| Pagamento | Aviso | Status de pagamento não disponível | Sim | Sistema | Fixo | — | — | Não finge “Pago” | — |
| Importar | Atalho | Texto `npm run importar` | Sim | Operador no terminal | — | CLI | Sem upload na UI | — | — |
| Login | Texto | Acesso com login; admin gerencia usuários | Sim | Sistema | Fixo | `/usuarios` | Leitura | Só ADMIN vê a tela e o GET `modulo=configuracoes` | `lib/modulos.ts` configuracoes |

### 6.5 Login (`/login`)

| Aba / seção | Campo | O que é | Obrigatório | Quem preenche | De onde vem | Para onde conecta | Como funciona | Regra / bloqueio | Onde olhar no código |
|-------------|-------|---------|-------------|---------------|-------------|-------------------|---------------|------------------|----------------------|
| Form | E-mail | Identidade | Sim | Usuário | Digitação | POST `/api/auth/login` | Lowercase no servidor | Sem cadastro | `LoginForm.tsx` |
| Form | Senha | Credencial | Sim | Usuário | Digitação | Mesmo POST | Cookie HttpOnly | Mensagem genérica se falhar; 429 após 5/min | `lib/auth/senha.ts`, `rate-limit.ts` |
| Ação | Entrar | Submete | Sim | Usuário | Botão | `/` | Loading desabilita o botão | Sem “criar conta” | `app/login/page.tsx` |

### 6.6 Usuários (`/usuarios`)

| Aba / seção | Campo | O que é | Obrigatório | Quem preenche | De onde vem | Para onde conecta | Como funciona | Regra / bloqueio | Onde olhar no código |
|-------------|-------|---------|-------------|---------------|-------------|-------------------|---------------|------------------|----------------------|
| Lista | Tabela | Quem entra | Sim | API | GET `/api/usuarios` | PATCH | Nome, e-mail, papel, status | Só ADMIN; LEITURA vê “Sem permissão” | `PaginaUsuarios.tsx` |
| Novo | Nome, e-mail, senha, papel | Criar conta | Sim | Admin | POST `/api/usuarios` | Login do novo | Senha ≥ 10 | 409 e-mail duplicado no condomínio | `app/api/usuarios/route.ts` |
| Ações | Ativar, papel, senha | Manutenção | Não | Admin | PATCH `/api/usuarios/[id]` | Sessões invalidadas se inativo/senha | Não remove o último ADMIN | `app/api/usuarios/[id]/route.ts` |

### 6.7 Minha senha (`/conta`)

| Aba / seção | Campo | O que é | Obrigatório | Quem preenche | De onde vem | Para onde conecta | Como funciona | Regra / bloqueio | Onde olhar no código |
|-------------|-------|---------|-------------|---------------|-------------|-------------------|---------------|------------------|----------------------|
| Form | Senha atual / nova | Troca | Sim | ADMIN | PATCH `/api/conta/senha` | Sidebar “Minha senha” (só ADMIN) | Invalida outras sessões | Nova ≥ 10; LEITURA 403 | `app/(app)/conta/page.tsx`, `requireAdmin` |

### 6.8 Operação (manutenções e checklists)

O grupo **Operação** da sidebar não substitui **Análise → Manutenção** (`/manutencao`), que continua o ranking da planilha. Não há papéis síndico nem zelador: ADMIN faz o que no sistema de origem era síndico e operacional; LEITURA só consulta.

| Tela | Ações do ADMIN | LEITURA |
|------|----------------|---------|
| Manutenções | Nova, Filtrar, Limpar, Ver, Editar, Excluir, Iniciar (pendente), Dar baixa (em andamento, com notas), Cancelar (pendente ou em andamento), Salvar, Voltar | Ver e filtrar. Sem botões de escrita |
| Modelos Checklist | Novo, Editar, Ativar/Desativar, Salvar, Voltar, Adicionar item, Remover item (não remove o último), dias, departamento, exige foto, exige justificativa, responsáveis | Só a lista |
| Acompanhar Checklists | Data, Departamento, Filtrar, Hoje, Iniciar, Feito, Não feito, Salvar observação, Enviar foto, Finalizar, Questionar | Lista e detalhe, sem escrita |

Estados da manutenção: `pendente` → `em_andamento` ou `cancelada`; `em_andamento` → `concluida` ou `cancelada`. Concluída e cancelada não editam, não excluem e não mudam de status. Dar baixa só a partir de em andamento. Lista pagina de 50, da data prevista mais recente para a mais antiga.

No topo da lista, o resumo do condomínio inteiro (não só da página): total, pendentes, em andamento, preventivas, corretivas e um botão por pessoa atribuída. Clicar filtra. **Excel** e **PDF** baixam esse filtro, com todas as páginas, até 5000 linhas. Texto que começa com `=`, `+`, `-` ou `@` entra no Excel como texto, para não virar fórmula. O nome vem de `responsavelNome` quando a pessoa ainda não tem conta neste dashboard. A carga de 23/09/2026 preencheu francisco (214), OPERACIONAL (37) e Francisco das Chagas Silva (1). Nova ordem com responsável escolhido em Usuários grava o nome da conta.

Checklist: departamentos `ZELADORIA` e `LIMPEZA`. Dias 0=domingo … 6=sábado. Ao listar uma data, o servidor cria os checklists do dia para modelos ativos daquele dia (um por responsável; se não houver responsável, um sem responsável). Não há agendador. Iniciar só de `PENDING`. Finalizar só de `IN_PROGRESS`. Item `NOT_DONE` exige justificativa se o modelo exige. Item `DONE` exige foto se o item ou o modelo exige. Questionar só item `NOT_DONE`. Foto: jpg, png ou webp, até 10 MB, pasta `storage/evidencias/{condominioId}/`, servida só por `GET /api/operacao/evidencias/[id]`.

O histórico exportado tinha 252 manutenções e zero modelos, checklists e fotos. A lista de modelos começa vazia até o admin criar um. A carga não cria usuários: responsável só aparece se o e-mail já existir em Usuários.

## 7. Regras de negócio

1. Totais oficiais do período = coluna B da planilha, nunca a soma das colunas mensais.
2. Coluna N do arquivo 2026 (`Total do período`) é duplicata da B e não é somada.
3. Out/2025 (2026) e Jan/2025 (2025) não têm coluna: residual = col B − soma dos meses visíveis, origem `RESIDUAL_MES_AUSENTE`.
4. Só linhas de detalhe entram como lançamento. Grupos, `Total de`, `Saldo anterior`, `Saldo Final` e `Mov. Líquido` não viram receita/despesa.
5. Subtotais `Total de` são validados contra filhos (tolerância 1 centavo). Divergência aborta o importador.
6. Se os totais oficiais não baterem com os valores conferidos da planilha, o importador falha. A tela não “ajusta” KPI.
7. Set/2026 é REALIZADO parcial (receita baixa, despesa 0). Não entra na média de cobertura.
8. Comparativo **entre anos** (home, tela Comparativo, slides): somente Jan–Jul/2025 vs Jan–Jul/2026. Aviso se o recorte da barra for Out/2025–Set/2026 (12 competências) contra o arquivo 2025 (7 meses).
9. Status de despesa neste ciclo: **Despesa registrada**. Não existe “Pago”.
10. **Fundo de reserva:** card **Saldo do fundo** = valor informado **R$ 191.599,35** (`SALDO_FUNDO_RESERVA_CENTS` em `lib/money.ts`), igual em todos os recortes. Arrecadação e despesa = lançamentos do recorte. Nunca rotulado como saldo bancário. **Taxa extra Academia:** diferença gerencial = arrecadação − despesa lançada no recorte. Nunca rotulado como saldo bancário.
11. Toda tabela de negócio tem `condominioId`. Queries da API filtram por ele.
12. Importação financeira só via CLI. Login obrigatório nas páginas e nas APIs (exceto `/login` e `POST /api/auth/login`). Foto de checklist é o único upload da UI e exige ADMIN.
13. `GET /api/modulo` só aceita `modulo`, `recorte` e `ordem` da allowlist. Não concatena SQL.
14. Ranking configurável: período = pills de recorte; ordem = valor ou nome.
15. Extrato `debitos_detalhe` (débitos fiscais multiempresa de escritório contábil) **não** é fonte do dashboard. Código 132 no extrato pode ser empresa cliente (ex.: ART FORT), não o condomínio Canto do Sabiá. Conciliação: `npx tsx scripts/conciliar-debitos.ts`.
16. **Saldo inicial** (Fluxo, waterfall, quadro do relatório, `TotalOficial.saldoInicialCents` e drawer de origem) é sempre **R$ 0,00**. A linha **Saldo anterior** da planilha continua no Excel e pode ser lida no importador para saldos mensais (`Periodo.saldoAnteriorCents`), mas **não** entra no saldo inicial da tela. Constante `SALDO_INICIAL_CENTS` em `lib/money.ts`.
17. **Saldo do fundo de reserva** na tela `/fundo-reserva` e no slide do relatório: **R$ 191.599,35** (`SALDO_FUNDO_RESERVA_CENTS`). Não é arrecadação − despesa do recorte.
18. **Saldo gerencial na Visão Geral** (recorte `oficial-2026` / Out/25–Set/26): card exibe **R$ 71.204,98** (`SALDO_GERENCIAL_HOME_CENTS` em `lib/money.ts`). O saldo final da planilha (**R$ 351.239,01**) permanece no importador, no gráfico **Evolução do saldo**, em Fluxo, Análise mensal e Relatório. Drawer de origem mostra os dois valores (critério `VALOR_DEFINIDO_HOME`). Demais recortes usam saldo da planilha no card.
19. **Cobertura da cota** (Visão Geral, Taxa condominial, slide do relatório): **disponível** = cotas de condomínio + saldo de entrada (sempre R$ 0,00); **saiu** = despesas registradas do recorte; **sobrou/faltou** = disponível − saiu. Selo **Cobriu** se sobrou ≥ 0. Mostra também outras receitas e resultado geral (todas as receitas − despesas). Função `montarCoberturaCota` em `lib/cobertura-cota.ts`.
20. **Contas de consumo** (Comparativo e Utilidades): comparativo Jan–Jul de **Água e Esgoto**, **Gás** e **Energia Solar** (despesa registrada). **Gás médio por unidade** = despesa da linha `Gás` ÷ **124** (`UNIDADES_CONDOMINIO` em `lib/format.ts`); **média mensal** = total ÷ 7 competências ÷ 124. Não inclui **Gás para Copa - Salão de Festas**. Na tela Comparativo, linhas extras: **Rateio Gás (receita)** e **Gás não rateado** (despesa Gás − rateio). Não é medição individual por apartamento. `lib/consumo.ts`.
21. **Inadimplência** (Visão Geral, Taxa condominial, slide do relatório): série informada de **saldo em atraso no fim de cada mês**, Set/2025 a Ago/2026 (12 linhas). Não vem do demonstrativo Excel. **Total acumulado 4,56%** = média aritmética dos 12 percentuais (arredondada); a coluna Valor do rodapé fica vazia de propósito — cada mês é posição de estoque, não se soma. Último mês (31/ago): R$ 13.636,63 e 2,92%. Pico (31/jan): R$ 18.738,30. Igual em todos os recortes. `montarInadimplencia` em `lib/inadimplencia.ts`.
22. **Demonstrativo da taxa** (visão Análise em `/taxa-condominial`): **Cotas de Condomínio** (RECEITA); **(−) Contratos fixos** = grupo `Contratos fixos` (DESPESA, grupo inteiro, inclui pró-labore); **(−) Impostos** = grupo `Impostos`; **Resultado 1**; **(−) Manutenções** = grupo `Manutenção`; **Resultado 2**; **(+) Cotas de Acordo** (RECEITA); **Resultado 3**. Totais do recorte (coluna B / soma equivalente), não médias. **Não** é cobertura da cota contra todas as despesas. `montarAnaliseTaxa` em `lib/analise-taxa.ts`.
23. **Nova taxa condominial** (mesma rota): **Taxa ideal mensal** = média de Contratos fixos **sem** `Pró Labore do Síndico` + média do pró-labore + média de Manutenção + markup de **4,56%** (`INADIMPLENCIA_MEDIA_PERCENTUAL_BP` = 456) sobre a soma das três médias. **Impostos não entram** nesse total. **Igualitário** = taxa ÷ **124**. **Por fração** = taxa da base (atual ou ano simulado) × fração em `dados/fracoes-ideais.json` (136 unidades; aptos + vagas; soma ≈ 1). **Ano simulado:** um % (−50 a +100) multiplica só Contratos fixos (sem pró-labore) e a média de Impostos; síndico e manutenção iguais; markup 4,56% sobre a nova base (já com Impostos). Com % = 0 a taxa simulada ainda inclui Impostos e pode ser maior que a ideal atual. Média = meses **com valor**; **Set/2026** (PARCIAL) fora. Sem upload. Folha: códigos reais e valores distintos; **Imprimir** pagina a tabela (sem sobreposição; `thead` Unidade/Valor no topo de cada folha; sem PDF no servidor). O slide **Nova taxa condominial prevista** do Relatório da Assembleia usa os mesmos totais e uma tabela mês a mês (`montarNovaTaxaMensal`); a coluna Média copia a taxa ideal (não a média das células). `montarNovaTaxaIdeal` / `simularAnoTaxa` / `montarNovaTaxaMensal` em `lib/nova-taxa-ideal.ts`; `lib/fracao-ideal.ts`.
24. **PDF por card:** o botão no canto do card chama `window.print()` com classe `print-card-isolado` no `body` e `data-card-print-ativo` só naquele card. O arquivo é um card (cabeçalho: condomínio, tela, recorte, data). Não há PDF no servidor nem jsPDF. O botão não entra no PDF (`no-print`). Não pode coincidir com `print-folha-unidade`. Relatório da Assembleia não usa este botão (Imprimir de todos os slides). KPI da home: o valor abre origem; o PDF não abre origem. `lib/exportar-card.ts`.
25. **Usuários:** papéis `ADMIN` e `LEITURA`. Sem cadastro público. Primeiro admin só com `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` (mínimo 10 caracteres) via `npm run seed:admin`. Não desativar nem rebaixar o último ADMIN ativo. Lookup de usuário sempre `id` + `condominioId`. Senha com `scrypt`; cookie assinado com `AUTH_SECRET`. `lib/auth/`. LEITURA não vê Configurações (`podeVerConfig`) nem troca senha (`podeTrocarSenha` / `PATCH /api/conta/senha`). Admin redefine senha de LEITURA em Usuários.
26. **Operação:** tipos `PREVENTIVA` e `CORRETIVA`; prioridades `BAIXA`, `NORMAL`, `ALTA`, `URGENTE`. Transições em `lib/operacao/regras.ts`. Custo em centavos inteiros. Chave de idempotência única por condomínio + criador quando os dois existem. Checklist único por condomínio + modelo + data + responsável (índices parciais; responsável nulo é outro índice). `npm run importar:operacao` grava só manutenções do JSON, casa usuário por e-mail já cadastrado e grava o nome de origem em `responsavelNome` mesmo sem conta. Não copia senha e não cria conta de teste. Rodar de novo atualiza o nome e não duplica a ordem. Exportação Excel/PDF usa a sessão do condomínio e no máximo 5000 linhas. `/manutencao` financeiro permanece.

Totais que o importador exige:

| Origem | Receita | Despesa | Resultado | Saldo final | Saldo inicial |
|--------|--------:|--------:|----------:|------------:|--------------:|
| 2026 | 1.463.805,71 | 1.317.778,36 | 146.027,35 | 351.239,01 | 0,00 |
| 2025 | 808.315,68 | 784.099,81 | 24.215,87 | 196.693,03 | 0,00 |

## 8. Como usar o sistema (guia do dia a dia)

1. Na pasta do projeto: `npm install`, copiar `.env.example` para `.env`. Preencher `DATABASE_URL` (PostgreSQL), `CONDOMINIO_CODIGO`, `AUTH_SECRET`, `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` (mínimo 10 caracteres). Senhas e secrets **não** vão para o git.
2. Postgres no ar (database `sabia`). `npm run setup` (migrate, importa os Excel de `dados/originais/`, cria o primeiro admin).
3. `npm run dev` e abrir `http://localhost:3789`. Sem cookie o site cai em `/login`. Entre com o e-mail e a senha definidos no seed.
4. A tela inicial é a Visão Geral. A logo oficial aparece no menu lateral (computador) e no topo (celular). Use as pills de período no canto superior. No recorte **Out/25–Set/26**, o card **Saldo gerencial** mostra **R$ 71.204,98** (valor definido na home); o gráfico abaixo continua com o saldo final da planilha mês a mês. Clique no card para ver os dois números no painel de origem. Logo abaixo dos KPIs, o bloco **A cota cobriu as despesas?** mostra se a cota + saldo de entrada (R$ 0,00) cobriu as despesas do recorte e o que sobrou ou faltou. Ao lado (no computador) ou abaixo (no celular), o card **Inadimplência** lista o saldo em atraso informado de Set/25 a Ago/26; o **total acumulado 4,56%** é a média dos percentuais, não a soma dos valores.
5. Clique no **valor** de um KPI da home para ver origem (arquivo, critério, categorias, meses). O botão **PDF** no canto gera só aquele card (diálogo do navegador → Destino: **Salvar como PDF**). `†` = mês reconstruído. No celular o painel de origem ocupa a largura da tela. O mesmo PDF existe nos cards das outras telas (gráficos, rankings, tabelas, Nova taxa). Não abre PDF se o relatório por unidade estiver aberto.
6. Todos os itens do menu lateral abrem tela. Recorte e, no ranking, “Por valor / Por nome” valem para a tela atual.
7. **Detalhamento** (menu Visão): tabela planilha com uma coluna por mês do recorte e **Total** no fim. Clique na categoria (▸/▾) para ver os itens; cada linha mostra receita ou despesa mês a mês. `†` = residual. Em celular, a tabela rola na horizontal; nome e Total ficam fixos.
8. Comparativo 2025 × 2026 e o bloco equivalente da home usam só Jan–Jul. Se a pill estiver em Out/25–Set/26, a tela Comparativo avisa e mesmo assim mostra Jan–Jul. Role até **Contas de consumo** para ver água, gás e energia solar; o gás traz **média por 124 unidades** e, na mesma tela, conferência com o rateio cobrado. Em **Utilidades**, o comparativo Jan–Jul repete água, gás (com média ÷ 124) e solar.
9. Fundo de reserva: **Saldo do fundo** = R$ 191.599,35 (valor informado, igual em todos os recortes); arrecadação e despesa mudam com o recorte. **Taxa condominial**: as pills de recorte continuam no topo. Logo abaixo do título, escolha **Análise** (padrão) ou **Nova taxa condominial**. Em Análise, o **demonstrativo** mostra Resultado 3 (cotas − contratos − impostos − manutenção + acordo); em seguida vêm cobertura da cota (cota vs todas as despesas) e inadimplência, depois o gráfico de cotas e o comparativo Jan–Jul. A visão Nova taxa mostra a taxa ideal (sem Impostos) e o igualitário ÷ 124; abaixo, **Ano simulado** (ajuste % sobre contratos e impostos) e a lista **por fração** (136 unidades; busque o código, ex. 101). **Relatório por unidade** abre o painel; **Imprimir** (Salvar como PDF) lista as 136 unidades em páginas seguidas, na base escolhida (taxa atual ou ano simulado). Taxas extras mostram **diferença gerencial**, não conta bancária. Em Fluxo e no relatório, o **saldo inicial** é R$ 0,00 (não usa o Saldo anterior da planilha).
10. Relatório da Assembleia: setas ou teclado para os slides; Tela cheia; Imprimir (diálogo do navegador). Depois de Cotas, o slide **Nova taxa condominial prevista** mostra o novo custo, a média por unidade (÷ 124) e a tabela mês a mês (igual ao Detalhamento). Os números oficiais são os mesmos da visão Nova taxa; Impostos não entram nesse total.
11. Configurações (só admin) explica fonte, qualidade e login. Menu **Usuários** cadastra leitura/admin. **Minha senha** (só admin) e **Sair** ficam no rodapé do menu. Conta **Leitura** não vê Configurações nem troca senha: o admin usa **Redefinir senha** em Usuários. Para reimportar a planilha: `npm run importar` no terminal.
12. Menu **Operação**: **Manutenções** abre as ordens de serviço (não o ranking da planilha em Análise → Manutenção). No topo, os números do condomínio e quem recebeu cada grupo de ordens; clique filtra. Cada card mostra tipo, status, responsável e data. **Excel** e **PDF** baixam o filtro que está na tela. **Modelos Checklist** cria o modelo do dia (zeladoria ou limpeza, dias da semana, itens, foto e justificativa). **Acompanhar Checklists** escolhe a data e o departamento; o dia é gerado na hora. Conta **Leitura** abre as três telas e não vê Nova, Editar, Iniciar, Dar baixa, Finalizar nem Enviar foto. Carga do histórico, uma vez: `npm run importar:operacao -- caminho/operacao-dados.json`. O arquivo exportado não tinha modelos nem checklists; essas duas telas começam vazias. Responsável da ordem só aparece se o e-mail já estiver em Usuários.

Não há cadastro público. O primeiro usuário é o seed do `.env` local (não documentar a senha aqui).

O layout cabe em celular, tablet e computador: menu em gaveta abaixo de `lg`, conteúdo com largura máxima 1280px, números dos KPIs em tamanho fluido.

## 9. Checklist de validação

- [ ] API `/api/visao-geral?recorte=oficial-2026` devolve `coberturaCota.cobriu` = false e `coberturaCota.saldoEntradaCents` = 0
- [ ] Home e `/taxa-condominial` (visão Análise) mostram bloco **A cota cobriu as despesas?** com selo Cobriu/Não cobriu
- [ ] `/taxa-condominial` tem tablist Análise | Nova taxa condominial; `?visao=nova-taxa` abre a segunda visão
- [ ] Visão Análise: demonstrativo com Impostos antes do Resultado 1 e Resultado 3 extra-grande; **sem** os 4 KPIs cotas/saiu/sobrou/média; cobertura abaixo com subtítulo cota vs todas as despesas
- [ ] Relatório: slide **Nova taxa condominial prevista** após Cotas; Novo custo e média ÷ 124 iguais à visão Nova taxa; tabela com competências + Média + Total
- [ ] Visão Nova taxa: esconde cobertura, inadimplência, gráfico de cotas e comparativo; mostra taxa ideal, igualitário ÷ 124, ano simulado e lista por fração (136)
- [ ] Relatório por unidade: overlay fecha com Esc; impressão lista códigos reais (não 1–124 iguais); PDF pagina 101…V072 sem sobreposição
- [ ] Filtro 101 e V055; lixo → “Nenhuma unidade com esse código”
- [ ] % +10 e −5 alteram só contratos e impostos na simulação; faixa −50 a +100
- [ ] `npm test` inclui `tests/analise-taxa.test.ts`, `tests/nova-taxa-ideal.test.ts` e `tests/fracao-ideal.test.ts`
- [ ] Relatório inclui slide **A cota cobriu as despesas?**
- [ ] Home e `/taxa-condominial` mostram card **Inadimplência** com 12 meses e total acumulado 4,56%
- [ ] API `/api/visao-geral` devolve `inadimplencia.ultimo.valorCents` = 1363663 e `inadimplencia.mediaPercentualBp` = 456
- [ ] Relatório inclui slide **Saldo em atraso informado**
- [ ] `npm run importar` imprime totais conferidos e não aborta
- [ ] `npm test` passa (coluna B e soma residual)
- [ ] API `/api/visao-geral?recorte=oficial-2026` devolve `kpis.saldo.valorCents` = 7120498 (R$ 71.204,98)
- [ ] Gráfico **Evolução do saldo** no recorte 2026 ainda termina em R$ 351.239,01
- [ ] Tela mostra os mesmos valores da planilha, **exceto saldo inicial = R$ 0,00**
- [ ] `/fluxo` e o quadro do relatório mostram saldo inicial R$ 0,00 em qualquer recorte
- [ ] Recorte Jan–Jul não usa o total de 12 meses do arquivo 2026
- [ ] Set/2026 aparece como parcial
- [ ] Sidebar: os 17 itens navegam; nenhum “Em breve”
- [ ] `GET /api/modulo?modulo=receitas` e `modulo=comparativo` respondem 200
- [ ] Comparativo: aviso se recorte `oficial-2026`; números só Jan–Jul; bloco **Contas de consumo** com gás médio ÷ 124
- [ ] Utilidades: comparativo Jan–Jul de água, gás (média 124 un.) e solar
- [ ] Fundo: card **Saldo do fundo** = R$ 191.599,35 em qualquer recorte; Academia: texto “gerencial”, nunca “bancário”
- [ ] Cards de conteúdo na home e nas telas de análise têm botão PDF; a impressão mostra só aquele card + cabeçalho (tela/recorte)
- [ ] PDF no KPI da home não abre o drawer de origem
- [ ] Relatório da Assembleia: Tela cheia e Imprimir de todos os slides, sem PDF por slide
- [ ] Relatório por unidade: PDF/impressão em páginas sequenciais (sem texto por cima); PDF de card recusado enquanto a folha está aberta
- [ ] Sem cookie: `/` redireciona para `/login`; `GET /api/visao-geral` = 401
- [ ] Login válido abre a Visão Geral; cookie HttpOnly
- [ ] ADMIN vê Usuários; cria LEITURA; LEITURA toma 403 em `POST /api/usuarios`
- [ ] LEITURA: menu sem Configurações e sem Minha senha; `/configuracoes` e `/conta` = Sem permissão; `GET /api/modulo?modulo=configuracoes` e `PATCH /api/conta/senha` = 403; `GET /api/modulo?modulo=receitas` = 200
- [ ] ADMIN vê Configurações, Minha senha e Redefinir senha em Usuários
- [ ] Último ADMIN não desativa nem rebaixa a si
- [ ] `npm test` inclui `tests/auth.test.ts`
- [ ] Configurações: atalho `npm run importar`; texto de login atual (só ADMIN)
- [ ] Sidebar: itens financeiros navegam; Configurações, Usuários e Minha senha só ADMIN; Sair funciona
- [ ] Logo oficial visível na sidebar (desktop) e no header (celular); clique volta para `/`
- [ ] Cards com borda verde 1px (não cinza)
- [ ] Sem `prefers-reduced-motion`, há timeline de entrada; com a preferência, duration 0
- [ ] Em ~375px: sem barra de rolagem horizontal da página; pills e gráficos de barras podem rolar por conta própria
- [ ] Em ~1280px+: conteúdo não estica além de 1280px; sidebar 240px visível
- [ ] `/detalhamento`: colunas por competência do recorte + Total; categorias expansíveis; itens na mesma linha; rolagem horizontal no celular
- [ ] Títulos e valores de KPI menores que na 0.2.0 (não ocupam a tela inteira)
- [ ] Sidebar tem o grupo Operação (Manutenções, Modelos Checklist, Acompanhar Checklists) para ADMIN e LEITURA
- [ ] `/manutencao` continua o ranking da planilha
- [ ] ADMIN cria manutenção, inicia, dá baixa e cancela; concluída e cancelada não editam nem excluem
- [ ] LEITURA abre `/operacao/manutencoes` e recebe 403 em `POST /api/operacao/manutencoes`
- [ ] Excel e PDF baixam o filtro da tela, com o nome do responsável; sem login a exportação responde 401
- [ ] Modelo ativo do dia gera checklist ao abrir Acompanhar; segundo acesso no mesmo dia não duplica
- [ ] Finalizar bloqueia item pendente, não feito sem justificativa (quando o modelo exige) e feito sem foto (quando exige)
- [ ] Foto de evidência não fica em `public/`; `GET /api/operacao/evidencias/[id]` sem sessão responde 401
- [ ] `npm run importar:operacao` na segunda vez imprime já importadas e não duplica
- [ ] `npm test` inclui `tests/operacao.test.ts`

## 10. Segurança (só o que existe)

- Autenticação: cookie `sabia_sessao` HttpOnly, SameSite=Lax; flag `Secure` só se `AUTH_COOKIE_SECURE=true`. Na VPS pública o acesso atual é HTTP no IP (`false`); no Êxito LAN HTTP também `false`. Token opaco + HMAC (`AUTH_SECRET`); hash SHA-256 no banco. Sem JWT no `localStorage`.
- Autorização no servidor (`requireAuth` / `requireAdmin` / `podeVerConfig` / `podeTrocarSenha`). Menu esconde Configurações, Usuários e Minha senha para LEITURA; isso não autoriza.
- Login: mensagem genérica; rate limit 5/min por IP; senha `scrypt`.
- Mutações: checagem de `Origin` igual ao `Host`.
- `DATABASE_URL`, `DB_PASSWORD`, `AUTH_SECRET` e senhas de seed só no servidor (não `NEXT_PUBLIC_*`). Sem secrets na documentação.
- Tenant: `CONDOMINIO_CODIGO` ausente → 400; condomínio inexistente → 404; sessão de outro código → recusada.
- Toda query de negócio inclui `condominioId` (Prisma `where`). PATCH de usuário: `findFirst({ id, condominioId })`.
- Recorte, KPI, módulo e ordem validados por allowlist (`lib/format.ts`); não há SQL concatenado.
- Erros da API não devolvem stack nem secrets.
- XSS: React escapa texto; sem `dangerouslySetInnerHTML`.
- RLS Postgres nas tabelas (policy `app.condominio_id`). O user local `postgres` é superuser e **bypassa** RLS; o filtro Prisma continua obrigatório. Produção deve usar role sem superuser.
- Excel só no disco local via CLI. Foto de checklist: jpg, png ou webp, até 10 MB, nome aleatório em `storage/evidencias/{condominioId}/` (fora de `public/`, no `.gitignore`). Leitura só com sessão, no condomínio da evidência.

Não implementado: 2FA, OAuth, e-mail de reset, cadastro público, webhooks, RBAC além de ADMIN e LEITURA.

## 11. Deploy / ambiente (sem secrets)

### Local

Variáveis (`.env.example`, **sem senhas reais**):

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sabia
DB_USER=postgres
DB_PASSWORD=
DATABASE_URL="postgresql://postgres:troque@localhost:5432/sabia"
CONDOMINIO_CODIGO="132"
AUTH_SECRET=
AUTH_COOKIE_SECURE=false
SEED_ADMIN_EMAIL=
SEED_ADMIN_PASSWORD=
```

PostgreSQL local, database `sabia`. Role `postgres` só no ambiente local.  
Planilhas: `dados/originais/`. Referências visuais: `docs/referencias/`.  
Comandos: `npm run setup`, `npm run seed:admin`, `npm run dev`, `npm run build`, `npm start`, `npm test`.

`.env` nunca vai no git. No servidor o arquivo entra por SCP ou é gerado no disco (`chmod 600`), não por `git pull`.

### Servidor Êxito (LAN)

| Item | Valor |
|------|--------|
| Host SSH | `exito` (`192.168.15.8`, usuário `exito`) |
| Pasta | `/home/exito/projetos/paulocond` |
| PM2 | `paulocond` |
| Porta | `3789` |
| URL | `http://192.168.15.8:3789` |
| Cookie | `AUTH_COOKIE_SECURE=false` (HTTP na LAN) |

### VPS pública (produção a manter atualizada)

| Item | Valor |
|------|--------|
| Host SSH | `vps-avadesk` / `root@179.199.149.12` |
| Pasta | `/root/PROJETOS/exito/paulocond` |
| Repositório | `https://github.com/Trindadelucas0/paulocond.git` |
| PM2 | `exito-paulocond` (ecosystem em `/root/PROJETOS/exito/ecosystem.config.cjs`) |
| Porta | `3789` (loopback/túnel; UFW não abre 3789 na internet) |
| URL | `http://179.199.149.12:3789` (UFW 3789/tcp). Hostnames Cloudflare `cond-staging` / `sabia-staging` ainda não resolvem neste ambiente |
| Postgres | container Docker `paulocond-pg` em `127.0.0.1:5437`, database `sabia`, user `sabia` |
| Cookie | `AUTH_COOKIE_SECURE=false` enquanto o acesso for HTTP no IP |

**Atualizar a VPS após `git push`:**

```bash
ssh vps-avadesk
cd /root/PROJETOS/exito/paulocond
git pull origin main
npm ci
npm run build
pm2 restart exito-paulocond --update-env
```

Primeiro Postgres nesta VPS: subir `paulocond-pg`, gravar `.env` (`chmod 600`), `npm run setup` (migrate + importar + seed). `npm run setup` reimporta lançamentos e não apaga usuários.

Reimportar planilhas: `npm run importar` (não apaga o `.env` nem reinicia o PM2 sozinho).

Na LAN Êxito: `git pull`, `npm ci`, `npm run build`, `pm2 restart paulocond --update-env`. `ecosystem.config.cjs` do repo usa `cwd: __dirname`.

## 12. Ao atualizar este documento

Na mesma entrega em que o comportamento mudar: atualizar capa, §2.1, mapa, ficha da tela, regras, guia §8 e “onde olhar no código”. Não registrar tela, endpoint ou proteção que o código ainda não faz.
