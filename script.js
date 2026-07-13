/* =========================================================
   SISTEMA DE CONTROLE DE PIX - BAZAR ANA PAULA (Desde 1988)
   Armazenamento: Firebase Firestore
   ========================================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, getDocs, collection, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCIJBN0Ch4p3LdrLjZ308QVnZFww_mqZjs",
  authDomain: "caixa-pix.firebaseapp.com",
  projectId: "caixa-pix",
  storageBucket: "caixa-pix.firebasestorage.app",
  messagingSenderId: "111399263107",
  appId: "1:111399263107:web:20eec030f6d2f43113f4b6"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const STORAGE_KEY_TEMA = "pixTheme";
const COLECAO = "historico_dias";

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

const detalheDiaEl = document.getElementById("detalheDia");
const detalheDiaTituloEl = document.getElementById("detalheDiaTitulo");
const detalheListaEl = document.getElementById("detalheLista");
const detalheTotalContasEl = document.getElementById("detalheTotalContas");
const detalheTotalVendasEl = document.getElementById("detalheTotalVendas");
const detalheTotalGeralEl = document.getElementById("detalheTotalGeral");
const fecharDetalheBtn = document.getElementById("fecharDetalhe");

const mesAnoAtualEl = document.getElementById("mesAnoAtual");
const calendarioGridEl = document.getElementById("calendarioGrid");
const btnMesAnterior = document.getElementById("btnMesAnterior");
const btnMesProximo = document.getElementById("btnMesProximo");

// ---------------------------------------------------------
// Estado em memória
// ---------------------------------------------------------
let tipoSelecionado = "conta"; 
const hojeKey = obterChaveData(new Date());
let dataCalendario = new Date();

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
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
}

function formatarMoeda(valor) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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

function escapeHTML(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

function calcularTotais(registros) {
  let totalContas = 0, totalVendas = 0;
  registros.forEach((r) => {
    if (r.tipo === "conta") totalContas += r.valor;
    else if (r.tipo === "venda") totalVendas += r.valor;
  });
  return { totalContas, totalVendas, totalGeral: totalContas + totalVendas };
}

// =========================================================
// INTEGRAÇÃO COM O FIREBASE (CRUD)
// =========================================================

// Busca um dia específico
async function obterDia(chaveData) {
  try {
    const docSnap = await getDoc(doc(db, COLECAO, chaveData));
    if (docSnap.exists()) return docSnap.data().registros || [];
    return [];
  } catch (error) {
    console.error("Erro ao buscar o dia:", error);
    return [];
  }
}

// Busca todos os dias (para montar o calendário)
async function carregarTodosOsDados() {
  try {
    const snapshot = await getDocs(collection(db, COLECAO));
    const dados = {};
    snapshot.forEach(documento => {
      dados[documento.id] = documento.data();
    });
    return dados;
  } catch (error) {
    console.error("Erro ao carregar banco:", error);
    return {};
  }
}

async function salvarDia(chaveData, registros) {
  try {
    if (registros.length === 0) {
      await deleteDoc(doc(db, COLECAO, chaveData));
    } else {
      await setDoc(doc(db, COLECAO, chaveData), { registros });
    }
  } catch (error) {
    console.error("Erro ao salvar:", error);
    alert("Erro de conexão ao salvar na nuvem.");
  }
}

async function adicionarRegistro(nome, valor, tipo) {
  const registros = await obterDia(hojeKey);
  registros.push({ id: gerarId(), nome, valor, tipo, hora: obterHoraAtual() });
  await salvarDia(hojeKey, registros);
}

async function atualizarRegistroExistente(chaveData, idRegistro, novoNome, novoValor, novoTipo) {
  const registros = await obterDia(chaveData);
  const index = registros.findIndex((r) => r.id === idRegistro);
  if (index !== -1) {
    registros[index].nome = novoNome;
    registros[index].valor = novoValor;
    registros[index].tipo = novoTipo;
    await salvarDia(chaveData, registros);
  }
}

async function removerRegistro(chaveData, idRegistro) {
  let registros = await obterDia(chaveData);
  registros = registros.filter((r) => r.id !== idRegistro);
  await salvarDia(chaveData, registros);
}

// =========================================================
// RENDERIZAÇÃO E ATUALIZAÇÕES DE TELA
// =========================================================

async function atualizarTelas(chaveDataAlterada) {
  await atualizarResumoHoje();
  await renderizarListaHoje();
  await renderizarCalendario();

  if (!detalheDiaEl.classList.contains("hidden") && detalheDiaEl.dataset.chaveAtual === chaveDataAlterada) {
    const registros = await obterDia(chaveDataAlterada);
    if (registros.length > 0) {
      abrirDetalheDia(chaveDataAlterada, registros);
    } else {
      fecharDetalheDia();
    }
  }
}

async function atualizarResumoHoje() {
  const registrosHoje = await obterDia(hojeKey);
  const { totalContas, totalVendas, totalGeral } = calcularTotais(registrosHoje);

  totalContasEl.textContent = formatarMoeda(totalContas);
  totalVendasEl.textContent = formatarMoeda(totalVendas);
  totalGeralEl.textContent = formatarMoeda(totalGeral);
}

async function renderizarListaHoje() {
  const registrosHoje = await obterDia(hojeKey);
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
    const btnExcluir = li.querySelector(".btn-excluir");
    btnExcluir.addEventListener("click", async () => {
      const confirmar = confirm(`Excluir o lançamento de "${registro.nome}"?`);
      if (!confirmar) return;
      
      // UX: Altera opacidade enquanto apaga no banco
      li.style.opacity = "0.5"; 
      await removerRegistro(chaveData, registro.id);
      await atualizarTelas(chaveData);
    });

    const btnEditar = li.querySelector(".btn-editar");
    btnEditar.addEventListener("click", () => iniciarEdicao(registro, chaveData));
  }

  return li;
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
  btnSubmit.style.backgroundColor = "var(--color-conta)"; 
  window.scrollTo({ top: 0, behavior: "smooth" });
  nomeClienteInput.focus();
}

function cancelarEdicao() {
  idEmEdicao = null;
  dataEmEdicao = null;
  btnSubmit.innerHTML = "✅ Registrar PIX";
  btnSubmit.style.backgroundColor = ""; 
  formPix.reset();
}

function selecionarTipo(tipo) {
  tipoSelecionado = tipo;
  btnTipoConta.classList.toggle("ativo", tipo === "conta");
  btnTipoVenda.classList.toggle("ativo", tipo === "venda");
}

// =========================================================
// RENDERIZAÇÃO DO HISTÓRICO (CALENDÁRIO)
// =========================================================

async function renderizarCalendario() {
  const ano = dataCalendario.getFullYear();
  const mes = dataCalendario.getMonth();
  
  const nomeMes = dataCalendario.toLocaleDateString('pt-BR', { month: 'long' });
  mesAnoAtualEl.textContent = `${nomeMes} ${ano}`;
  
  calendarioGridEl.innerHTML = "";
  
  const primeiroDiaDoMes = new Date(ano, mes, 1).getDay(); 
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  
  // Busca todos os dados da nuvem de uma vez para mapear o calendário
  const dados = await carregarTodosOsDados();
  
  for (let i = 0; i < primeiroDiaDoMes; i++) {
    const divVazia = document.createElement("div");
    divVazia.className = "dia-calendario vazio";
    calendarioGridEl.appendChild(divVazia);
  }
  
  for (let dia = 1; dia <= diasNoMes; dia++) {
    const div = document.createElement("div");
    div.className = "dia-calendario";
    div.textContent = dia;
    
    const mesFormatado = String(mes + 1).padStart(2, "0");
    const diaFormatado = String(dia).padStart(2, "0");
    const chaveData = `${ano}-${mesFormatado}-${diaFormatado}`;
    
    if (chaveData === hojeKey) div.classList.add("hoje");
    
    if (dados[chaveData] && dados[chaveData].registros.length > 0) {
      div.classList.add("tem-dados");
      div.addEventListener("click", () => abrirDetalheDia(chaveData, dados[chaveData].registros));
    } else {
      div.style.color = "var(--text-muted)";
    }
    
    calendarioGridEl.appendChild(div);
  }
}

async function mudarMes(delta) {
  dataCalendario.setMonth(dataCalendario.getMonth() + delta);
  await renderizarCalendario();
  fecharDetalheDia(); 
}

function abrirDetalheDia(chaveData, registros) {
  const { totalContas, totalVendas, totalGeral } = calcularTotais(registros);

  detalheDiaEl.dataset.chaveAtual = chaveData;
  detalheDiaTituloEl.textContent = formatarDataExtenso(chaveData);

  detalheTotalContasEl.textContent = formatarMoeda(totalContas);
  detalheTotalVendasEl.textContent = formatarMoeda(totalVendas);
  detalheTotalGeralEl.textContent = formatarMoeda(totalGeral);

  detalheListaEl.innerHTML = "";

  const registrosOrdenados = [...registros].reverse();
  registrosOrdenados.forEach((registro) => {
    const li = criarItemLista(registro, chaveData, true); 
    detalheListaEl.appendChild(li);
  });

  detalheDiaEl.classList.remove("hidden");
  detalheDiaEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function fecharDetalheDia() {
  detalheDiaEl.classList.add("hidden");
  delete detalheDiaEl.dataset.chaveAtual;
}

// =========================================================
// SUBMISSÃO DO FORMULÁRIO (AGORA ASSÍNCRONO)
// =========================================================

async function tratarSubmitFormulario(evento) {
  evento.preventDefault();

  const nome = nomeClienteInput.value.trim();
  const valor = parseFloat(valorPixInput.value);

  if (!nome || isNaN(valor) || valor <= 0) {
    alert("Por favor, preencha os dados corretamente.");
    return;
  }

  // Trava o botão para evitar cliques duplicados (Network Latency)
  const textoBotaoOriginal = btnSubmit.innerHTML;
  btnSubmit.innerHTML = "⏳ Salvando...";
  btnSubmit.disabled = true;

  try {
    if (idEmEdicao) {
      await atualizarRegistroExistente(dataEmEdicao, idEmEdicao, nome, valor, tipoSelecionado);
      cancelarEdicao();
    } else {
      await adicionarRegistro(nome, valor, tipoSelecionado);
      formPix.reset();
    }
    await atualizarTelas(dataEmEdicao || hojeKey);
    nomeClienteInput.focus();
  } catch (error) {
    console.error(error);
    alert("Erro ao salvar no banco de dados. Tente novamente.");
  } finally {
    // Destrava o botão
    if(!idEmEdicao) btnSubmit.innerHTML = "✅ Registrar PIX";
    btnSubmit.disabled = false;
  }
}

// =========================================================
// MIGRAÇÃO E INICIALIZAÇÃO
// =========================================================

async function migrarDadosAntigos() {
  if (localStorage.getItem("migracao_firebase_concluida") === "true") return;

  const dadosLocais = JSON.parse(localStorage.getItem('pixData'));
  if (!dadosLocais || Object.keys(dadosLocais).length === 0) {
    console.log("Nenhum dado local para migrar.");
    localStorage.setItem("migracao_firebase_concluida", "true");
    return;
  }

  console.log("⏳ Iniciando migração para a nuvem...");
  try {
    for (const [chaveData, conteudo] of Object.entries(dadosLocais)) {
      await setDoc(doc(db, COLECAO, chaveData), conteudo);
    }
    console.log("✅ Migração concluída com sucesso!");
    localStorage.setItem("migracao_firebase_concluida", "true");
  } catch (erro) {
    console.error("❌ Erro na migração:", erro);
  }
}

function aplicarTemaSalvo() {
  const temaSalvo = localStorage.getItem(STORAGE_KEY_TEMA);
  const ativarDark = temaSalvo === "dark";
  document.body.classList.toggle("dark", ativarDark);
  themeToggleBtn.textContent = ativarDark ? "☀️" : "🌙";
}

function alternarTema() {
  const ativarDark = !document.body.classList.contains("dark");
  document.body.classList.toggle("dark", ativarDark);
  themeToggleBtn.textContent = ativarDark ? "☀️" : "🌙";
  localStorage.setItem(STORAGE_KEY_TEMA, ativarDark ? "dark" : "light");
}

async function init() {
  await migrarDadosAntigos(); // Gatilho principal

  aplicarTemaSalvo();
  themeToggleBtn.addEventListener("click", alternarTema);
  dataAtualEl.textContent = formatarDataExtenso(hojeKey);

  btnTipoConta.addEventListener("click", () => selecionarTipo("conta"));
  btnTipoVenda.addEventListener("click", () => selecionarTipo("venda"));
  selecionarTipo("conta"); 

  const btnImprimir = document.getElementById("btnImprimirHoje");
  if(btnImprimir) btnImprimir.addEventListener("click", imprimirRelatorioDia);

  formPix.addEventListener("submit", tratarSubmitFormulario);
  fecharDetalheBtn.addEventListener("click", fecharDetalheDia);
  btnMesAnterior.addEventListener("click", () => mudarMes(-1));
  btnMesProximo.addEventListener("click", () => mudarMes(1));

  // Inicializa as telas (agora via Firebase)
  await atualizarResumoHoje();
  await renderizarListaHoje();
  await renderizarCalendario();
}

document.addEventListener("DOMContentLoaded", init);

// =========================================================
// IMPRESSÃO DE RELATÓRIO (AGORA ASSÍNCRONO)
// =========================================================

async function imprimirRelatorioDia() {
  const registros = await obterDia(hojeKey);

  if (registros.length === 0) {
    alert("Não há registros de PIX para imprimir hoje.");
    return;
  }

  const { totalContas, totalVendas, totalGeral } = calcularTotais(registros);
  const areaImpressao = document.getElementById("areaImpressao");

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

  registros.forEach(r => {
    const sigla = r.tipo === 'conta' ? '(C)' : '(V)';
    html += `
      <div class="cupom-linha">
        <span>${escapeHTML(r.nome)} ${sigla}</span>
        <span>${formatarMoeda(r.valor)}</span>
      </div>
    `;
  });

  html += `
    <div class="cupom-divisor"></div>
    <div class="cupom-linha"><span>Total de Vendas:</span><span>${formatarMoeda(totalVendas)}</span></div>
    <div class="cupom-linha"><span>Total de Contas:</span><span>${formatarMoeda(totalContas)}</span></div>
    <div class="cupom-divisor"></div>
    <div class="cupom-linha" style="font-weight: bold; font-size: 16px;">
      <span>TOTAL GERAL:</span><span>${formatarMoeda(totalGeral)}</span>
    </div>
    <div class="cupom-divisor"></div>
    <div style="text-align: center; margin-top: 15px;">Fechamento de Caixa</div>
    <div style="text-align: center; font-size: 12px; margin-top: 5px;">---</div>
  `;

  areaImpressao.innerHTML = html;
  window.print();
}