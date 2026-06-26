/* =========================================================
   SISTEMA DE CONTROLE DE PIX PARA CAIXA DE LOJA
   Armazenamento: 100% LocalStorage (sem backend)
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
const btnSubmit = formPix.querySelector("button[type='submit']");

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
let tipoSelecionado = "conta"; 
const hojeKey = obterChaveData(new Date());

// Controles de Edição
let idEmEdicao = null;
let dataEmEdicao = null;

// =========================================================
// FUNÇÕES UTILITÁRIAS
// =========================================================

function obterChaveData(date) {
  const ano = date.getFullYear();
  const mes = String(date.getMonth() + 1).padStart(2, "0");
  const dia = String(date.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function formatarDataExtenso(chaveData) {
  const [ano, mes, dia] = chaveData.split("-").map(Number);
  const data = new Date(ano, mes - 1, dia);
  return data.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatarMoeda(valor) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function obterHoraAtual() {
  const agora = new Date();
  const h = String(agora.getHours()).padStart(2, "0");
  const m = String(agora.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

function gerarId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// =========================================================
// FUNÇÕES DE ACESSO AO LOCALSTORAGE
// =========================================================

function carregarDados() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DADOS);
    return raw ? JSON.parse(raw) : {};
  } catch (erro) {
    console.error("Erro ao ler dados do LocalStorage:", erro);
    return {};
  }
}

function salvarDados(dados) {
  try {
    localStorage.setItem(STORAGE_KEY_DADOS, JSON.stringify(dados));
  } catch (erro) {
    console.error("Erro ao salvar dados no LocalStorage:", erro);
    alert("Não foi possível salvar os dados. O armazenamento local pode estar cheio ou bloqueado.");
  }
}

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

function atualizarRegistroExistente(chaveData, idRegistro, novoNome, novoValor, novoTipo) {
  const dados = carregarDados();
  if (!dados[chaveData]) return;

  const index = dados[chaveData].registros.findIndex((r) => r.id === idRegistro);
  if (index !== -1) {
    dados[chaveData].registros[index].nome = novoNome;
    dados[chaveData].registros[index].valor = novoValor;
    dados[chaveData].registros[index].tipo = novoTipo;
    salvarDados(dados);
  }
}

function removerRegistro(chaveData, idRegistro) {
  const dados = carregarDados();
  if (!dados[chaveData]) return;

  dados[chaveData].registros = dados[chaveData].registros.filter(
    (r) => r.id !== idRegistro
  );

  if (dados[chaveData].registros.length === 0) {
    delete dados[chaveData];
  }

  salvarDados(dados);
}

// =========================================================
// FUNÇÕES DE CÁLCULO DE TOTAIS
// =========================================================

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
// RENDERIZAÇÃO E ATUALIZAÇÕES DE TELA
// =========================================================

function atualizarResumoHoje() {
  const dados = carregarDados();
  const registrosHoje = dados[hojeKey]?.registros || [];
  const { totalContas, totalVendas, totalGeral } = calcularTotais(registrosHoje);

  totalContasEl.textContent = formatarMoeda(totalContas);
  totalVendasEl.textContent = formatarMoeda(totalVendas);
  totalGeralEl.textContent = formatarMoeda(totalGeral);
}

function renderizarListaHoje() {
  const dados = carregarDados();
  const registrosHoje = dados[hojeKey]?.registros || [];

  listaHojeEl.innerHTML = "";

  if (registrosHoje.length === 0) {
    listaHojeEl.innerHTML = `<li class="lista-vazia">Nenhum lançamento ainda hoje.</li>`;
    return;
  }

  const registrosOrdenados = [...registrosHoje].reverse();

  registrosOrdenados.forEach((registro) => {
    const li = criarItemLista(registro, hojeKey, true);
    listaHojeEl.appendChild(li);
  });
}

function criarItemLista(registro, chaveData, permitirAcoes) {
  const li = document.createElement("li");

  const tipoLabel = registro.tipo === "conta" ? "Conta" : "Venda";
  const tipoClasse = registro.tipo; 

  li.innerHTML = `
    <div class="item-info">
      <span class="item-nome">${escapeHTML(registro.nome)}</span>
      <span class="item-meta">${registro.hora}</span>
    </div>
    <div class="item-direita">
      <span class="tag-tipo ${tipoClasse}">${tipoLabel}</span>
      <span class="item-valor ${tipoClasse}">${formatarMoeda(registro.valor)}</span>
      ${permitirAcoes ? `
        <button class="btn-editar" title="Editar lançamento" data-id="${registro.id}" data-data="${chaveData}">✏️</button>
        <button class="btn-excluir" title="Excluir lançamento" data-id="${registro.id}" data-data="${chaveData}">🗑️</button>
      ` : ""}
    </div>
  `;

  if (permitirAcoes) {
    // Ação de Excluir
    const btnExcluir = li.querySelector(".btn-excluir");
    btnExcluir.addEventListener("click", () => {
      const confirmar = confirm(`Excluir o lançamento de "${registro.nome}" (${formatarMoeda(registro.valor)})?`);
      if (!confirmar) return;

      removerRegistro(chaveData, registro.id);
      atualizarTelas(chaveData);
    });

    // Ação de Editar
    const btnEditar = li.querySelector(".btn-editar");
    btnEditar.addEventListener("click", () => {
      iniciarEdicao(registro, chaveData);
    });
  }

  return li;
}

function escapeHTML(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

function atualizarTelas(chaveDataAlterada) {
  atualizarResumoHoje();
  renderizarListaHoje();
  renderizarListaDias();

  if (!detalheDiaEl.classList.contains("hidden") && detalheDiaEl.dataset.chaveAtual === chaveDataAlterada) {
    const dados = carregarDados();
    if (dados[chaveDataAlterada]) {
        abrirDetalheDia(chaveDataAlterada);
    } else {
        fecharDetalheDia(); // Fecha o painel se o dia ficou vazio
    }
  }
}

// =========================================================
// EDIÇÃO E SELEÇÃO DE TIPO
// =========================================================

function iniciarEdicao(registro, chaveData) {
  nomeClienteInput.value = registro.nome;
  valorPixInput.value = registro.valor;
  selecionarTipo(registro.tipo);

  idEmEdicao = registro.id;
  dataEmEdicao = chaveData;

  btnSubmit.innerHTML = "🔄 Atualizar PIX";
  btnSubmit.style.backgroundColor = "var(--color-conta)"; // Cor laranja pra chamar atenção

  // Rola suavemente para o topo e foca no input
  window.scrollTo({ top: 0, behavior: "smooth" });
  nomeClienteInput.focus();
}

function cancelarEdicao() {
  idEmEdicao = null;
  dataEmEdicao = null;
  btnSubmit.innerHTML = "✅ Registrar PIX";
  btnSubmit.style.backgroundColor = ""; // Volta pro azul original
  formPix.reset();
}

function selecionarTipo(tipo) {
  tipoSelecionado = tipo;
  btnTipoConta.classList.toggle("ativo", tipo === "conta");
  btnTipoVenda.classList.toggle("ativo", tipo === "venda");
}

// =========================================================
// RENDERIZAÇÃO DO HISTÓRICO
// =========================================================

function renderizarListaDias() {
  const dados = carregarDados();
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
    const registrosOrdenados = [...registros].reverse();
    registrosOrdenados.forEach((registro) => {
      const li = criarItemLista(registro, chaveData, true); // True = permite editar/excluir o histórico
      detalheListaEl.appendChild(li);
    });
  }

  detalheDiaEl.classList.remove("hidden");
  detalheDiaEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function fecharDetalheDia() {
  detalheDiaEl.classList.add("hidden");
  delete detalheDiaEl.dataset.chaveAtual;
}

// =========================================================
// SUBMISSÃO DO FORMULÁRIO
// =========================================================

function tratarSubmitFormulario(evento) {
  evento.preventDefault();

  const nome = nomeClienteInput.value.trim();
  const valorTexto = valorPixInput.value;
  const valor = parseFloat(valorTexto);

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

  if (idEmEdicao) {
    // Fluxo de Atualização
    atualizarRegistroExistente(dataEmEdicao, idEmEdicao, nome, valor, tipoSelecionado);
    cancelarEdicao(); // Limpa e volta o botão pro normal
  } else {
    // Fluxo de Novo Registro
    adicionarRegistro(nome, valor, tipoSelecionado);
    formPix.reset();
  }

  atualizarTelas(dataEmEdicao || hojeKey);
  nomeClienteInput.focus();
}

// =========================================================
// TEMA E INICIALIZAÇÃO
// =========================================================

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

function alternarTema() {
  const ativarDark = !document.body.classList.contains("dark");
  document.body.classList.toggle("dark", ativarDark);
  themeToggleBtn.textContent = ativarDark ? "☀️" : "🌙";
  localStorage.setItem(STORAGE_KEY_TEMA, ativarDark ? "dark" : "light");
}

function init() {
  aplicarTemaSalvo();
  themeToggleBtn.addEventListener("click", alternarTema);
  dataAtualEl.textContent = formatarDataExtenso(hojeKey);

  btnTipoConta.addEventListener("click", () => selecionarTipo("conta"));
  btnTipoVenda.addEventListener("click", () => selecionarTipo("venda"));
  selecionarTipo("conta"); 

const btnImprimir = document.getElementById("btnImprimirHoje");
  if(btnImprimir) {
    btnImprimir.addEventListener("click", imprimirRelatorioDia);
  }

  formPix.addEventListener("submit", tratarSubmitFormulario);
  fecharDetalheBtn.addEventListener("click", fecharDetalheDia);

  atualizarResumoHoje();
  renderizarListaHoje();
  renderizarListaDias();
}

document.addEventListener("DOMContentLoaded", init);
// =========================================================
// IMPRESSÃO DE RELATÓRIO
// =========================================================

function imprimirRelatorioDia() {
  const dados = carregarDados();
  const registros = dados[hojeKey]?.registros || [];

  if (registros.length === 0) {
    alert("Não há registros de PIX para imprimir hoje.");
    return;
  }

  const { totalContas, totalVendas, totalGeral } = calcularTotais(registros);
  const areaImpressao = document.getElementById("areaImpressao");

  // Monta o layout do cupomzinho
  let html = `
    <div class="cupom-header">
      <div class="cupom-titulo">BAZAR ANA PAULA</div>
      <div>Tradição desde 1988</div>
      <div class="cupom-divisor"></div>
      <div>RELATÓRIO PIX DO CAIXA</div>
      <div>Data: ${formatarDataExtenso(hojeKey)}</div>
    </div>
    <div class="cupom-divisor"></div>
  `;

  // Lista os nomes e valores (colocando um (C) ou (V) para identificar)
  registros.forEach(r => {
    const sigla = r.tipo === 'conta' ? '(C)' : '(V)';
    html += `
      <div class="cupom-linha">
        <span>${escapeHTML(r.nome)} ${sigla}</span>
        <span>${formatarMoeda(r.valor)}</span>
      </div>
    `;
  });

  // Totais no final
  html += `
    <div class="cupom-divisor"></div>
    <div class="cupom-linha">
      <span>Total de Vendas:</span>
      <span>${formatarMoeda(totalVendas)}</span>
    </div>
    <div class="cupom-linha">
      <span>Total de Contas:</span>
      <span>${formatarMoeda(totalContas)}</span>
    </div>
    <div class="cupom-divisor"></div>
    <div class="cupom-linha" style="font-weight: bold; font-size: 16px;">
      <span>TOTAL GERAL:</span>
      <span>${formatarMoeda(totalGeral)}</span>
    </div>
    <div class="cupom-divisor"></div>
    <div style="text-align: center; margin-top: 15px;">Fechamento de Caixa</div>
    <div style="text-align: center; font-size: 12px; margin-top: 5px;">---</div>
  `;

  // Injeta no HTML e chama a impressão nativa do navegador
  areaImpressao.innerHTML = html;
  window.print();
}
