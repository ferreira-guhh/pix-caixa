/* =========================================================
   SISTEMA DE CONTROLE DE PIX PARA CAIXA DE LOJA
   Armazenamento: 100% LocalStorage (sem backend)

   Estrutura de dados salva em "pixData":
   {
     "2026-06-12": {
       registros: [
         { id, nome, valor, tipo: "conta"|"venda", hora }
       ]
     },
     ...
   }
   ========================================================= */

const STORAGE_KEY_DADOS = "pixData";
const STORAGE_KEY_TEMA = "pixTheme";

// ---------------------------------------------------------
// Referências dos elementos do DOM
// ---------------------------------------------------------
const dataAtualEl = document.getElementById("dataAtual");
const themeToggleBtn = document.getElementById("themeToggle");

const btnTipoConta = document.getElementById("btnTipoConta");
const btnTipoVenda = document.getElementById("btnTipoVenda");
const formPix = document.getElementById("formPix");
const nomeClienteInput = document.getElementById("nomeCliente");
const valorPixInput = document.getElementById("valorPix");

const totalContasEl = document.getElementById("totalContas");
const totalVendasEl = document.getElementById("totalVendas");
const totalGeralEl = document.getElementById("totalGeral");

const listaHojeEl = document.getElementById("listaHoje");
const listaDiasEl = document.getElementById("listaDias");

const detalheDiaEl = document.getElementById("detalheDia");
const detalheDiaTituloEl = document.getElementById("detalheDiaTitulo");
const detalheListaEl = document.getElementById("detalheLista");
const detalheTotalContasEl = document.getElementById("detalheTotalContas");
const detalheTotalVendasEl = document.getElementById("detalheTotalVendas");
const detalheTotalGeralEl = document.getElementById("detalheTotalGeral");
const fecharDetalheBtn = document.getElementById("fecharDetalhe");

// ---------------------------------------------------------
// Estado em memória
// ---------------------------------------------------------
let tipoSelecionado = "conta"; // "conta" ou "venda"
const hojeKey = obterChaveData(new Date());

// =========================================================
// FUNÇÕES UTILITÁRIAS
// =========================================================

/**
 * Retorna a chave de data no formato "YYYY-MM-DD"
 * usada para agrupar os registros no LocalStorage.
 */
function obterChaveData(date) {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const dia = String(date.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

/**
 * Formata uma chave "YYYY-MM-DD" para exibição
 * (ex: "quinta-feira, 12 de junho de 2026")
 */
function formatarDataExtenso(chaveData) {
  const [ano, mes, dia] = chaveData.split("-").map(Number);
  // mes - 1 porque o construtor Date usa mês 0-indexado
  const data = new Date(ano, mes - 1, dia);
  return data.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/**
 * Formata um número como moeda brasileira (R$ 0,00)
 */
function formatarMoeda(valor) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Retorna a hora atual no formato HH:MM
 */
function obterHoraAtual() {
  const agora = new Date();
  const h = String(agora.getHours()).padStart(2, "0");
  const m = String(agora.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Gera um ID simples e único baseado em timestamp
 */
function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// =========================================================
// FUNÇÕES DE ACESSO AO LOCALSTORAGE
// =========================================================

/**
 * Lê todos os dados salvos no LocalStorage.
 * Retorna um objeto vazio se não houver nada salvo.
 */
function carregarDados() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DADOS);
    return raw ? JSON.parse(raw) : {};
  } catch (erro) {
    console.error("Erro ao ler dados do LocalStorage:", erro);
    return {};
  }
}

/**
 * Salva o objeto de dados completo no LocalStorage.
 */
function salvarDados(dados) {
  try {
    localStorage.setItem(STORAGE_KEY_DADOS, JSON.stringify(dados));
  } catch (erro) {
    console.error("Erro ao salvar dados no LocalStorage:", erro);
    alert("Não foi possível salvar os dados. O armazenamento local pode estar cheio ou bloqueado.");
  }
}

/**
 * Adiciona um novo registro de PIX no dia atual.
 */
function adicionarRegistro(nome, valor, tipo) {
  const dados = carregarDados();

  if (!dados[hojeKey]) {
    dados[hojeKey] = { registros: [] };
  }

  dados[hojeKey].registros.push({
    id: gerarId(),
    nome: nome,
    valor: valor,
    tipo: tipo,
    hora: obterHoraAtual(),
  });

  salvarDados(dados);
}

/**
 * Remove um registro pelo id, dentro de uma data específica.
 */
function removerRegistro(chaveData, idRegistro) {
  const dados = carregarDados();
  if (!dados[chaveData]) return;

  dados[chaveData].registros = dados[chaveData].registros.filter(
    (r) => r.id !== idRegistro
  );

  // Se o dia ficou sem registros, remove a chave do dia
  if (dados[chaveData].registros.length === 0) {
    delete dados[chaveData];
  }

  salvarDados(dados);
}

// =========================================================
// FUNÇÕES DE CÁLCULO DE TOTAIS
// =========================================================

/**
 * Calcula os totais (contas, vendas, geral) de uma lista de registros.
 */
function calcularTotais(registros) {
  let totalContas = 0;
  let totalVendas = 0;

  registros.forEach((r) => {
    if (r.tipo === "conta") {
      totalContas += r.valor;
    } else if (r.tipo === "venda") {
      totalVendas += r.valor;
    }
  });

  return {
    totalContas,
    totalVendas,
    totalGeral: totalContas + totalVendas,
  };
}

// =========================================================
// RENDERIZAÇÃO: RESUMO DO DIA ATUAL
// =========================================================

function atualizarResumoHoje() {
  const dados = carregarDados();
  const registrosHoje = dados[hojeKey]?.registros || [];

  const { totalContas, totalVendas, totalGeral } = calcularTotais(registrosHoje);

  totalContasEl.textContent = formatarMoeda(totalContas);
  totalVendasEl.textContent = formatarMoeda(totalVendas);
  totalGeralEl.textContent = formatarMoeda(totalGeral);
}

// =========================================================
// RENDERIZAÇÃO: LISTA DE LANÇAMENTOS DE HOJE
// =========================================================

function renderizarListaHoje() {
  const dados = carregarDados();
  const registrosHoje = dados[hojeKey]?.registros || [];

  listaHojeEl.innerHTML = "";

  if (registrosHoje.length === 0) {
    listaHojeEl.innerHTML = `<li class="lista-vazia">Nenhum lançamento ainda hoje.</li>`;
    return;
  }

  // Mostra os mais recentes primeiro
  const registrosOrdenados = [...registrosHoje].reverse();

  registrosOrdenados.forEach((registro) => {
    const li = criarItemLista(registro, hojeKey, true);
    listaHojeEl.appendChild(li);
  });
}

/**
 * Cria o elemento <li> de um registro de PIX.
 * @param {object} registro - dados do PIX
 * @param {string} chaveData - data a que pertence (para exclusão)
 * @param {boolean} permitirExcluir - se deve mostrar botão de excluir
 */
function criarItemLista(registro, chaveData, permitirExcluir) {
  const li = document.createElement("li");

  const tipoLabel = registro.tipo === "conta" ? "Conta" : "Venda";
  const tipoClasse = registro.tipo; // "conta" ou "venda"

  li.innerHTML = `
    <div class="item-info">
      <span class="item-nome">${escapeHTML(registro.nome)}</span>
      <span class="item-meta">${registro.hora}</span>
    </div>
    <div class="item-direita">
      <span class="tag-tipo ${tipoClasse}">${tipoLabel}</span>
      <span class="item-valor ${tipoClasse}">${formatarMoeda(registro.valor)}</span>
      ${permitirExcluir ? `<button class="btn-excluir" title="Excluir lançamento" data-id="${registro.id}" data-data="${chaveData}">🗑️</button>` : ""}
    </div>
  `;

  // Listener do botão de excluir (apenas se exibido)
  if (permitirExcluir) {
    const btnExcluir = li.querySelector(".btn-excluir");
    btnExcluir.addEventListener("click", () => {
      const confirmar = confirm(
        `Excluir o lançamento de "${registro.nome}" (${formatarMoeda(registro.valor)})?`
      );
      if (!confirmar) return;

      removerRegistro(chaveData, registro.id);

      // Atualiza tudo após exclusão
      atualizarResumoHoje();
      renderizarListaHoje();
      renderizarListaDias();

      // Se o detalhe do dia estiver aberto e for o mesmo dia, atualiza também
      if (!detalheDiaEl.classList.contains("hidden") && detalheDiaEl.dataset.chaveAtual === chaveData) {
        abrirDetalheDia(chaveData);
      }
    });
  }

  return li;
}

/**
 * Escapa caracteres HTML para evitar problemas de injeção
 * ao inserir o nome do cliente no innerHTML.
 */
function escapeHTML(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

// =========================================================
// RENDERIZAÇÃO: HISTÓRICO DE DIAS ANTERIORES
// =========================================================

function renderizarListaDias() {
  const dados = carregarDados();

  // Pega todas as chaves de data, exceto a de hoje, ordenadas da mais recente para a mais antiga
  const chaves = Object.keys(dados)
    .filter((chave) => chave !== hojeKey && dados[chave].registros.length > 0)
    .sort((a, b) => (a < b ? 1 : -1));

  listaDiasEl.innerHTML = "";

  if (chaves.length === 0) {
    listaDiasEl.innerHTML = `<p class="lista-vazia">Nenhum histórico salvo ainda.</p>`;
    return;
  }

  chaves.forEach((chave) => {
    const registros = dados[chave].registros;
    const { totalGeral } = calcularTotais(registros);

    const item = document.createElement("div");
    item.className = "dia-item";
    item.innerHTML = `
      <span class="dia-data">${formatarDataExtenso(chave)}</span>
      <span class="dia-total">${formatarMoeda(totalGeral)}</span>
    `;

    item.addEventListener("click", () => abrirDetalheDia(chave));

    listaDiasEl.appendChild(item);
  });
}

/**
 * Abre o painel de detalhes de um dia específico do histórico,
 * exibindo a lista completa e os totais daquele dia.
 */
function abrirDetalheDia(chaveData) {
  const dados = carregarDados();
  const registros = dados[chaveData]?.registros || [];
  const { totalContas, totalVendas, totalGeral } = calcularTotais(registros);

  detalheDiaEl.dataset.chaveAtual = chaveData;
  detalheDiaTituloEl.textContent = formatarDataExtenso(chaveData);

  detalheTotalContasEl.textContent = formatarMoeda(totalContas);
  detalheTotalVendasEl.textContent = formatarMoeda(totalVendas);
  detalheTotalGeralEl.textContent = formatarMoeda(totalGeral);

  detalheListaEl.innerHTML = "";

  if (registros.length === 0) {
    detalheListaEl.innerHTML = `<li class="lista-vazia">Nenhum lançamento neste dia.</li>`;
  } else {
    // Mostra os mais recentes primeiro
    const registrosOrdenados = [...registros].reverse();
    registrosOrdenados.forEach((registro) => {
      const li = criarItemLista(registro, chaveData, true);
      detalheListaEl.appendChild(li);
    });
  }

  detalheDiaEl.classList.remove("hidden");

  // Rola a tela suavemente até o detalhe aparecer
  detalheDiaEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function fecharDetalheDia() {
  detalheDiaEl.classList.add("hidden");
  delete detalheDiaEl.dataset.chaveAtual;
}

// =========================================================
// SELEÇÃO DO TIPO DE PIX (Conta / Venda)
// =========================================================

function selecionarTipo(tipo) {
  tipoSelecionado = tipo;

  btnTipoConta.classList.toggle("ativo", tipo === "conta");
  btnTipoVenda.classList.toggle("ativo", tipo === "venda");
}

// =========================================================
// SUBMISSÃO DO FORMULÁRIO
// =========================================================

function tratarSubmitFormulario(evento) {
  evento.preventDefault();

  const nome = nomeClienteInput.value.trim();
  const valorTexto = valorPixInput.value;
  const valor = parseFloat(valorTexto);

  // Validações básicas
  if (!nome) {
    alert("Por favor, informe o nome do cliente.");
    nomeClienteInput.focus();
    return;
  }

  if (isNaN(valor) || valor <= 0) {
    alert("Por favor, informe um valor válido maior que zero.");
    valorPixInput.focus();
    return;
  }

  // Salva o registro
  adicionarRegistro(nome, valor, tipoSelecionado);

  // Atualiza a interface
  atualizarResumoHoje();
  renderizarListaHoje();

  // Limpa o formulário e devolve o foco para o nome (agiliza próximo lançamento)
  formPix.reset();
  nomeClienteInput.focus();
}

// =========================================================
// TEMA (DARK / LIGHT MODE)
// =========================================================

/**
 * Aplica o tema salvo no LocalStorage (ou light por padrão)
 */
function aplicarTemaSalvo() {
  const temaSalvo = localStorage.getItem(STORAGE_KEY_TEMA);

  if (temaSalvo === "dark") {
    document.body.classList.add("dark");
    themeToggleBtn.textContent = "☀️";
  } else {
    document.body.classList.remove("dark");
    themeToggleBtn.textContent = "🌙";
  }
}

/**
 * Alterna entre dark e light mode e salva a preferência.
 */
function alternarTema() {
  const ativarDark = !document.body.classList.contains("dark");

  document.body.classList.toggle("dark", ativarDark);
  themeToggleBtn.textContent = ativarDark ? "☀️" : "🌙";

  localStorage.setItem(STORAGE_KEY_TEMA, ativarDark ? "dark" : "light");
}

// =========================================================
// EXIBIÇÃO DA DATA ATUAL NO CABEÇALHO
// =========================================================

function exibirDataAtual() {
  dataAtualEl.textContent = formatarDataExtenso(hojeKey);
}

// =========================================================
// INICIALIZAÇÃO DA APLICAÇÃO
// =========================================================

function init() {
  // Tema
  aplicarTemaSalvo();
  themeToggleBtn.addEventListener("click", alternarTema);

  // Data no cabeçalho
  exibirDataAtual();

  // Seletor de tipo (Conta / Venda)
  btnTipoConta.addEventListener("click", () => selecionarTipo("conta"));
  btnTipoVenda.addEventListener("click", () => selecionarTipo("venda"));
  selecionarTipo("conta"); // estado inicial

  // Formulário
  formPix.addEventListener("submit", tratarSubmitFormulario);

  // Fechar detalhe do histórico
  fecharDetalheBtn.addEventListener("click", fecharDetalheDia);

  // Renderizações iniciais
  atualizarResumoHoje();
  renderizarListaHoje();
  renderizarListaDias();
}

// Inicia a aplicação quando o DOM estiver pronto
document.addEventListener("DOMContentLoaded", init);
