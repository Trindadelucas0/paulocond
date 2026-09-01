# Canto do Sabiá — Documentação do Sistema

| Item | Valor |
|------|--------|
| Versão do sistema | 0.2.1 — Telas do menu |
| Última atualização | 01/09/2026 (deploy Êxito PM2 :3789; layout com escala reduzida) |
| Fonte oficial | Este arquivo |

## 1. Como usar este documento

Fonte única de comportamento do dashboard financeiro do condomínio Canto do Sabiá (código 132).  
Antes de alterar código: localizar a tela/fluxo aqui, depois o path em “onde olhar no código”.  
Não inventar tela, regra ou proteção que o código não implementa.

## 2. Tecnologias utilizadas

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4
- SQLite via Prisma (servidor)
- ExcelJS no importador CLI
- GSAP + `@gsap/react` (cliente)
- Testes de conciliação: `node:test` via `tsx`

Frontend não acessa banco nem Excel. Regras e totais saem da API.

### 2.1 Histórico de versões

| Versão | Data | O que mudou |
|--------|------|-------------|
| 0.2.1 — Telas do menu | 01/09/2026 | Escala visual menor (fonte fluida 13–15px); conteúdo limitado a 1280px; gráficos e pills com rolagem no celular; viewport `device-width` |
| 0.2.0 — Telas do menu | 01/09/2026 | Todas as 17 rotas da sidebar ativas; GET `/api/modulo`; Relatório da Assembleia (slides, tela cheia, imprimir) |
| 0.1.2 — Visão Geral | 01/09/2026 | Cards da home com borda verde fina (`border-card-line`, 1px, verde da marca a 28%) |
| 0.1.1 — Visão Geral | 01/09/2026 | Logo oficial (`public/marca/logo-canto-do-sabia.png`) na sidebar, no header mobile e no ícone da aba |
| 0.1.0 — Visão Geral | 01/09/2026 | Importador CLI, SQLite, GET `/api/visao-geral` e `/api/origem`, tela Visão Geral, motion GSAP, sidebar com 17 itens do PRD |

## 3. Mapa de telas / conexões

```
Excel 2025/2026 (dados/originais)
        ↓ npm run importar
     SQLite (Prisma)
        ↓
  GET /api/visao-geral
  GET /api/origem
  GET /api/modulo?modulo=&recorte=&ordem=
        ↓
  / Visão Geral
  /receitas … /configuracoes (16 telas)
```

Todos os 17 itens da sidebar navegam. Não há “Em breve”.

## 4. Papéis e acesso

Não implementado. Não há login, sessão nem papéis (síndico, conselho, assembleia).  
A API filtra pelo condomínio do ambiente (`CONDOMINIO_CODIGO=132`). Sem esse código a API responde 400.

## 5. Índice de rotas e “onde olhar no código”

| Rota / script | O que faz | Onde olhar |
|---------------|-----------|------------|
| `/` | Visão Geral | `app/page.tsx`, `components/visao-geral/` |
| `/receitas` | Ordinárias, extra, eventuais, composição, ranking | `app/receitas/page.tsx` |
| `/despesas` | Natureza, top 10, impostos | `app/despesas/page.tsx` |
| `/fluxo` | Waterfall saldo inicial + receitas − despesas | `app/fluxo/page.tsx` |
| `/taxa-condominial` | Cotas, média, maior/menor, vs 2025 | `app/taxa-condominial/page.tsx` |
| `/fundo-reserva` | Arrecadação, despesa, saldo gerencial | `app/fundo-reserva/page.tsx` |
| `/taxas-extras` | Academia arrecadado vs utilizado | `app/taxas-extras/page.tsx` |
| `/contratos` | Ranking + Empresa Terceirizada | `app/contratos/page.tsx` |
| `/utilidades` | Água, gás, energia, solar, telefone | `app/utilidades/page.tsx` |
| `/manutencao` | Ranking e evolução | `app/manutencao/page.tsx` |
| `/patrimonio` | Bens patrimoniais | `app/patrimonio/page.tsx` |
| `/comparativo` | Só Jan–Jul vs Jan–Jul | `app/comparativo/page.tsx` |
| `/analise-mensal` | Receita/despesa/resultado/saldo por mês | `app/analise-mensal/page.tsx` |
| `/detalhamento` | Drill-down categoria → item → meses | `app/detalhamento/page.tsx` |
| `/alertas` | Motor objetivo | `app/alertas/page.tsx` |
| `/relatorio` | Slides da assembleia, tela cheia, imprimir | `app/relatorio/page.tsx` |
| `/configuracoes` | Condomínio, fonte, qualidade, sem login | `app/configuracoes/page.tsx` |
| Shell | Menu + marca; item ativo por pathname; escala fluida | `components/shell/`, `app/globals.css` |
| `GET /api/visao-geral?recorte=` | KPIs da home | `app/api/visao-geral/route.ts`, `lib/kpis.ts` |
| `GET /api/origem?kpi=&recorte=` | Drill-down do KPI da home | `app/api/origem/route.ts` |
| `GET /api/modulo?modulo=&recorte=&ordem=` | Payload das 16 telas | `app/api/modulo/route.ts`, `lib/modulos.ts` |
| Chrome compartilhado | Recorte, loading, GSAP | `components/paginas/PaginaAnalise.tsx` |
| `npm run importar` | Lê Excel, valida totais, grava SQLite | `scripts/importar-demonstrativo.ts` |
| `npm test` | Conciliação coluna B | `tests/conciliacao.test.ts` |
| Schema | Tabelas de negócio com `condominioId` | `prisma/schema.prisma` |

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
| KPI | Saldo gerencial | Saldo final do recorte | Sim | Cálculo servidor | Coluna B (oficial) ou saldo do mês (Jan–Jul) | Origem | Clique abre drawer; card com borda verde 1px | Não é saldo bancário de fundo/taxa extra | `lib/kpis.ts`, `app/globals.css` (`--color-card-line`) |
| KPI | Receitas | Total de receitas | Sim | Cálculo servidor | Coluna B no recorte oficial | Origem | Count-up GSAP | KPI oficial nunca é soma dos meses na tela | `lib/kpis.ts` |
| KPI | Despesas registradas | Total de despesas | Sim | Cálculo servidor | Coluna B | Origem | Rótulo “Despesa registrada” | Sem status Pago | `lib/kpis.ts` |
| KPI | Resultado | Receitas − despesas | Sim | Cálculo servidor | Mov. líquido oficial | Origem | — | — | `lib/kpis.ts` |
| KPI saldo | Margem / cobertura | Resultado/receita e saldo/média de despesa dos meses COMPLETO | Não | Cálculo servidor | Série mensal | — | Set/2026 fora da média | — | `lib/kpis.ts` |
| Gráfico | Evolução do saldo | Área verde | Sim | API `serieSaldo` | `Periodo.saldoFinalCents` | Clique no ponto foca o mês | pathLength GSAP | — | `components/visao-geral/AreaChartSaldo.tsx` |
| Composição | Despesas / receitas | Barra segmentada + lista | Sim | API | Soma de lançamentos por grupo (inclui residual) | — | — | — | `components/visao-geral/Composicao.tsx` |
| Barras | Receita × despesa mês | Hachura; mês foco sólido | Sim | API `serieMensal` | Lançamentos | Foco do mês | `*` parcial `†` residual | — | `components/visao-geral/BarrasMensais.tsx` |
| Comparativo | Jan–Jul 2025 vs 2026 | Único comparativo da home | Sim | Soma de competências | Lançamentos | — | Nunca 7 meses contra 12 | `lib/kpis.ts` |
| Alertas | Pontos de atenção | Regras objetivas | Não | Servidor | Lançamentos | ScrollTrigger uma vez | Sem texto subjetivo | `lib/alertas.ts` |
| Qualidade | Lista | Conciliado / avisos | Sim | Servidor | Totais + regras | — | — | `lib/kpis.ts` |
| Drawer | Ver origem | Categorias, meses, arquivo | Não | API origem | Lançamentos + total oficial | Fecha no overlay | — | `components/visao-geral/OrigemDrawer.tsx` |
| Sidebar | 17 itens PRD | Navegação | Sim | `lib/nav.ts` | PRD §5 | `next/link` + pathname | Sem “Em breve” | `components/shell/Sidebar.tsx` |

Estados: loading (skeleton), erro com retry, vazio se ninguém rodou o importador.

### 6.2 Telas de análise (chrome compartilhado)

Todas abaixo usam `PaginaAnalise` + `GET /api/modulo`. Recorte nas pills (3 valores). Ranking, quando existir, ordena por valor ou nome (`ordem=`). Cards com `border-card-line`. GSAP entrada/stagger em `.js-block`; `prefers-reduced-motion` zera duração.

| Tela | Rota | O que mostra | Regra / bloqueio | Onde olhar |
|------|------|----------------|------------------|------------|
| Receitas | `/receitas` | KPIs ordinárias / extra / eventuais, composição, evolução, ranking | Total oficial = coluna B no recorte oficial | `lib/modulos.ts` receitas |
| Despesas | `/despesas` | Total, contratos, manutenção, card Impostos, top 10, evolução | Rótulo Despesa registrada | `lib/modulos.ts` despesas |
| Fluxo | `/fluxo` | Waterfall: saldo inicial + receitas − despesas = saldo gerencial final; série mensal | Não é saldo bancário | `lib/modulos.ts` fluxo |
| Taxa condominial | `/taxa-condominial` | Cotas, média, maior/menor, participação, vs Jan–Jul/2025 | Não inventa número de unidades | `lib/modulos.ts` taxa-condominial |
| Fundo de reserva | `/fundo-reserva` | Arrecadação, despesa, **saldo gerencial** | Nunca “saldo bancário” | `lib/modulos.ts` fundo-reserva |
| Taxas extras | `/taxas-extras` | Academia arrecadado vs Aquisição Equipamentos vs diferença gerencial | Não é saldo bancário da taxa extra | `lib/modulos.ts` taxas-extras |
| Contratos | `/contratos` | Ranking do grupo Contratos fixos; destaque Empresa Terceirizada e % da despesa | — | `lib/modulos.ts` contratos |
| Utilidades | `/utilidades` | Água e Esgoto, Gás, Energia Elétrica, Energia Solar, Telefone - Internet | Só linhas do demonstrativo | `lib/modulos.ts` utilidades |
| Manutenção | `/manutencao` | Ranking + evolução + Jan–Jul vs 2025 | Comparativo só equivalentes | `lib/modulos.ts` manutencao |
| Patrimônio | `/patrimonio` | Bens do grupo Patrimônio | Sem inventário físico | `lib/modulos.ts` patrimonio |
| Comparativo | `/comparativo` | Jan–Jul/2025 × Jan–Jul/2026 | Aviso se o recorte da barra for o período cheio Out/25–Set/26 | `lib/modulos.ts` comparativo |
| Análise mensal | `/analise-mensal` | Tabela receita/despesa/resultado/saldo gerencial por competência | * parcial † residual | `lib/modulos.ts` analise-mensal |
| Detalhamento | `/detalhamento` | Categoria → item → meses (tabela) | Soma dos meses ≠ coluna B se houver residual | `lib/modulos.ts` detalhamento |
| Alertas | `/alertas` | Motor objetivo | Sem texto subjetivo | `lib/alertas.ts` |

### 6.3 Relatório da Assembleia (`/relatorio`)

| Aba / seção | Campo | O que é | Obrigatório | Quem preenche | De onde vem | Para onde conecta | Como funciona | Regra / bloqueio | Onde olhar no código |
|-------------|-------|---------|-------------|---------------|-------------|-------------------|---------------|------------------|----------------------|
| Header | Recorte | Mesmas pills | Sim | Usuário | Allowlist | Recarrega API | Slides recálculo | — | `PaginaAnalise.tsx` |
| Ações | Tela cheia | `requestFullscreen` no palco | Não | Usuário | Browser | — | Alterna fullscreen | — | `RelatorioAssembleia.tsx` |
| Ações | Imprimir | `window.print()` | Não | Usuário | Browser | CSS print | Todos os slides | Sem PDF gerado no servidor | `RelatorioAssembleia.tsx` |
| Palco | Slides | Quadro-resumo, receitas, despesas, cotas, fundo, academia, terceirizada, Jan–Jul, alertas, fonte | Sim | Servidor | `montarModulo` | Setas / teclado | Sem opinião | Só números do demonstrativo | `lib/modulos.ts` relatorio |

### 6.4 Configurações (`/configuracoes`)

| Aba / seção | Campo | O que é | Obrigatório | Quem preenche | De onde vem | Para onde conecta | Como funciona | Regra / bloqueio | Onde olhar no código |
|-------------|-------|---------|-------------|---------------|-------------|-------------------|---------------|------------------|----------------------|
| Condomínio | Nome / código | Canto do Sabiá / 132 | Sim | Importador | SQLite | — | Leitura | Sem login | `lib/modulos.ts` configuracoes |
| Fonte | Arquivos | Nomes dos Excel | Sim | Importador | `TotalOficial.arquivo` | — | — | — | — |
| Qualidade | Lista | Coluna B, residual, Set parcial | Sim | Fixo + totais | Servidor | — | — | — | — |
| Pagamento | Aviso | Status de pagamento não disponível | Sim | Sistema | Fixo | — | — | Não finge “Pago” | — |
| Importar | Atalho | Texto `npm run importar` | Sim | Operador no terminal | — | CLI | Sem upload na UI | — | — |
| Login | Texto | Não há login neste ciclo | Sim | Sistema | Fixo | — | — | Não finge papéis | — |

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
10. Fundo de reserva e taxa extra Academia: **saldo/diferença gerencial** = arrecadação − despesa lançada no recorte. Nunca rotulado como saldo bancário.
11. Toda tabela de negócio tem `condominioId`. Queries da API filtram por ele.
12. Importação só via CLI. Sem upload na UI. Sem login.
13. `GET /api/modulo` só aceita `modulo`, `recorte` e `ordem` da allowlist. Não concatena SQL.
14. Ranking configurável: período = pills de recorte; ordem = valor ou nome.

Totais que o importador exige:

| Origem | Receita | Despesa | Resultado | Saldo final | Saldo inicial |
|--------|--------:|--------:|----------:|------------:|--------------:|
| 2026 | 1.463.805,71 | 1.317.778,36 | 146.027,35 | 351.239,01 | 205.211,66 |
| 2025 | 808.315,68 | 784.099,81 | 24.215,87 | 196.693,03 | 172.477,16 |

## 8. Como usar o sistema (guia do dia a dia)

1. Na pasta do projeto: `npm install`, copiar `.env.example` para `.env` se ainda não existir.
2. `npm run setup` (gera Prisma, cria SQLite, importa os dois Excel de `dados/originais/`).
3. `npm run dev` e abrir `http://localhost:3789` (porta dedicada, fora das demais apps locais).
4. A tela inicial é a Visão Geral. A logo oficial aparece no menu lateral (computador) e no topo (celular). Use as pills de período no canto superior. Em tela estreita, as pills e os gráficos de barras rolam na horizontal.
5. Clique em um KPI da home para ver origem (arquivo, critério, categorias, meses). `†` = mês reconstruído. No celular o painel de origem ocupa a largura da tela.
6. Todos os itens do menu lateral abrem tela. Recorte e, no ranking, “Por valor / Por nome” valem para a tela atual.
7. Comparativo 2025 × 2026 e o bloco equivalente da home usam só Jan–Jul. Se a pill estiver em Out/25–Set/26, a tela Comparativo avisa e mesmo assim mostra Jan–Jul.
8. Fundo de reserva e Taxas extras mostram **saldo/diferença gerencial**, não conta bancária.
9. Relatório da Assembleia: setas ou teclado para os slides; Tela cheia; Imprimir (diálogo do navegador).
10. Configurações explica fonte, qualidade e que não há login. Para reimportar: `npm run importar` no terminal.

Não há usuário de demo: não há login.

O layout cabe em celular, tablet e computador: menu em gaveta abaixo de `lg`, conteúdo com largura máxima 1280px, números dos KPIs em tamanho fluido.

## 9. Checklist de validação

- [ ] `npm run importar` imprime totais conferidos e não aborta
- [ ] `npm test` passa (coluna B e soma residual)
- [ ] API `/api/visao-geral` devolve receita 146380571 centavos no recorte `oficial-2026`
- [ ] Tela mostra os mesmos valores da planilha
- [ ] Recorte Jan–Jul não usa o total de 12 meses do arquivo 2026
- [ ] Set/2026 aparece como parcial
- [ ] Sidebar: os 17 itens navegam; nenhum “Em breve”
- [ ] `GET /api/modulo?modulo=receitas` e `modulo=comparativo` respondem 200
- [ ] Comparativo: aviso se recorte `oficial-2026`; números só Jan–Jul
- [ ] Fundo e Academia: texto “gerencial”, nunca “bancário”
- [ ] Relatório: slides factuais; botões Tela cheia e Imprimir
- [ ] Configurações: sem login; atalho `npm run importar`
- [ ] Logo oficial visível na sidebar (desktop) e no header (celular); clique volta para `/`
- [ ] Cards com borda verde 1px (não cinza)
- [ ] Sem `prefers-reduced-motion`, há timeline de entrada; com a preferência, duration 0
- [ ] Em ~375px: sem barra de rolagem horizontal da página; pills e gráficos de barras podem rolar por conta própria
- [ ] Em ~1280px+: conteúdo não estica além de 1280px; sidebar 240px visível
- [ ] Títulos e valores de KPI menores que na 0.2.0 (não ocupam a tela inteira)

## 10. Segurança (só o que existe)

- Sem autenticação (documentado).
- Sem upload público; Excel só no disco local via CLI.
- `DATABASE_URL` e `CONDOMINIO_CODIGO` só no servidor (não `NEXT_PUBLIC_*`).
- Tenant: ausência de `CONDOMINIO_CODIGO` → 400; condomínio inexistente → 404.
- Toda query de negócio inclui `condominioId` (Prisma `where`).
- Recorte, KPI, módulo e ordem validados por allowlist (`lib/format.ts`); não há SQL concatenado.
- Erros da API não devolvem stack nem secrets.
- XSS: React escapa texto; sem `dangerouslySetInnerHTML`.
- RLS Postgres: não se aplica (SQLite local de um condomínio). Isolamento = coluna `condominioId` + filtro obrigatório.

Não implementado: CSRF de mutação (não há POST), RBAC, cookies de sessão, webhooks, uploads.

## 11. Deploy / ambiente (sem secrets)

### Local

Variáveis (`.env.example`):

```
DATABASE_URL="file:./dev.db"
CONDOMINIO_CODIGO="132"
```

O arquivo SQLite fica em `prisma/dev.db` após `prisma db push`.  
Planilhas: `dados/originais/`. Referências visuais: `docs/referencias/`.  
Comandos: `npm run setup`, `npm run dev`, `npm run build`, `npm start`, `npm test`.

### Servidor Êxito (produção)

| Item | Valor |
|------|--------|
| Host SSH | `exito` (`192.168.15.8`, usuário `exito`) |
| Pasta | `/home/exito/projetos/paulocond` |
| Repositório | `https://github.com/Trindadelucas0/paulocond.git` |
| PM2 | `paulocond` |
| Porta | `3789` |
| URL LAN | `http://192.168.15.8:3789` |
| Config PM2 | `ecosystem.config.cjs` (`npm start -- -H 0.0.0.0 -p 3789`) |

**Primeiro deploy (no servidor):**

```bash
cd /home/exito/projetos
git clone https://github.com/Trindadelucas0/paulocond.git
cd paulocond
cp .env.example .env   # ou criar .env com DATABASE_URL e CONDOMINIO_CODIGO
npm ci
npm run setup
npm run build
pm2 start ecosystem.config.cjs
pm2 save
```

**Atualizar após `git push`:**

```bash
cd /home/exito/projetos/paulocond
git pull origin main
npm ci
npm run build
pm2 restart paulocond --update-env
```

Reimportar planilhas no servidor (se os Excel em `dados/originais/` mudarem): `npm run importar` (não apaga o `.env` nem reinicia o PM2 sozinho).

## 12. Ao atualizar este documento

Na mesma entrega em que o comportamento mudar: atualizar capa, §2.1, mapa, ficha da tela, regras, guia §8 e “onde olhar no código”. Não registrar tela, endpoint ou proteção que o código ainda não faz.
