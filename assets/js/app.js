// ==========================================================================
// IZZI | Lógica da Central de Procedimentos Operacionais
// ==========================================================================

// Abre o modal de capa automaticamente e impede que ele seja fechado com a tecla ESC
const capa = document.getElementById('capa');
capa.showModal();
capa.addEventListener('cancel', event => event.preventDefault());
  

'use strict';
// Central de consulta inteiramente local. Nenhuma informação é transmitida ou salva.

// Carrega e interpreta o JSON embutido na página
const dados_operacionais = window.DADOS_OPERACIONAIS;
const etapas = dados_operacionais.etapas;
const fontes = dados_operacionais.fontes;

// Armazena o termo de busca digitado em cada aba de fase
const filtros = Object.create(null);

// Mapeamento dos identificadores internos de grupo para seus nomes legíveis
const nomes_grupos = {
  cadastro: 'Cadastro',
  acessos: 'Certificados e gov.br',
  procuracoes: 'Procurações',
  empregador: 'Empregador Web',
  conferencia: 'Conferência'
};
const grupos = Object.keys(nomes_grupos);

// Mapas de acesso rápido por ID para etapas e fontes documentais
const mapa_etapas = new Map(etapas.map(etapa => [etapa.id, etapa]));
const mapa_fontes = new Map(fontes.map(fonte => [fonte.id, fonte]));

/**
 * Remove acentos e converte o texto para minúsculas para facilitar buscas e comparações.
 */
function normalizar_texto(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Escapa caracteres especiais de HTML para evitar quebra de marcação ou XSS ao montar templates.
 */
function escapar_html(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, caractere => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[caractere]));
}

/**
 * Retorna o rótulo formatado "número · título" de uma etapa a partir do seu ID.
 */
function nome_etapa(id) {
  const etapa = mapa_etapas.get(id);
  return etapa ? `${etapa.numero} · ${etapa.titulo}` : id;
}

/**
 * Converte um array de textos em uma lista HTML <ul>.
 */
function lista_linhas(linhas, classe = '') {
  return linhas?.length
    ? `<ul class="${classe}">${linhas.map(texto => `<li>${escapar_html(texto)}</li>`).join('')}</ul>`
    : '';
}

/**
 * Renderiza um bloco de campo da ficha (ex.: "Pré-requisitos").
 * Quando o campo é "Pré-requisitos", injeta botões de cópia rápida ao lado do CNPJ e do e-mail do DP da IZZI.
 */
function renderizar_campo(titulo, itens) {
  if (!itens?.length) return '';

  const conteudo = titulo === 'Pré-requisitos'
    ? `<ul>${itens.map(texto => `<li>${escapar_html(texto)
        .replace(
          /30\.182\.037\/0001-49\.?/,
          '30.182.037/0001-49. <button class="copiar_cnpj" type="button" data-copiar-cnpj aria-label="Copiar CNPJ da IZZI" title="Copiar CNPJ da IZZI"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg></button>'
        )
        .replace(
          /dp@izzicontabil\.com\.br\.?/,
          'dp@izzicontabil.com.br. <button class="copiar_cnpj" type="button" data-copiar-cnpj data-copiar-email aria-label="Copiar e-mail do DP" title="Copiar e-mail do DP"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg></button>'
        )
      }</li>`).join('')}</ul>`
    : lista_linhas(itens);

  return `<div class="campo"><span class="rotulo">${escapar_html(titulo)}</span>${conteudo}</div>`;
}

/**
 * Gera o nome de classe CSS correspondente a uma etiqueta (ex.: "Cliente / terceiro" -> "cliente-terceiro").
 */
function classe_etiqueta(texto) {
  return normalizar_texto(texto).replace(/[^a-z0-9]+/g, '-');
}

/**
 * Monta o quadro "Dados da IZZI" (usado na etapa 3.3 - SEFAZ-DF) com botão de cópia para cada dado.
 */
function quadro_procuradora() {
  const campos = mapa_fontes.get('sefaz').dados_izzi;
  const titulos = {
    'CRC – Certificado de Registro': 'CRC',
    'Nome/Razão Social': 'Razão social'
  };

  const linhas = campos.map(([nome, valor]) => {
    const titulo = escapar_html(titulos[nome] || nome);
    return `<div><dt>${titulo}</dt><dd><span>${escapar_html(valor)}</span> <button type="button" class="copiar_cnpj" data-copiar-procuradora aria-label="Copiar ${titulo}" title="Copiar ${titulo}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg></button></dd></div>`;
  }).join('');

  return `<section class="campo quadro_procuradora"><span class="rotulo">Dados da IZZI</span><dl>${linhas}</dl><span role="status"></span></section>`;
}

/**
 * Copia um dado do quadro da procuradora para a área de transferência (com fallback para execCommand).
 */
async function copiar_procuradora(botao) {
  const quadro = botao.closest('.quadro_procuradora');
  const texto = botao.previousElementSibling.textContent;
  let copiado = false;

  try {
    await navigator.clipboard.writeText(texto);
    copiado = true;
  } catch {
    const area = document.createElement('textarea');
    area.value = texto;
    quadro.append(area);
    area.select();
    try {
      copiado = document.execCommand('copy');
    } catch { }
    area.remove();
    botao.focus();
  }

  quadro.querySelector('[role=status]').textContent = copiado
    ? botao.getAttribute('aria-label').slice(6) + ' na área de transferência.'
    : 'Selecione os dados e copie manualmente.';
}

/**
 * Renderiza o HTML completo de um procedimento (<details class="procedimento">),
 * incluindo cabeçalho, objetivo, pré-requisitos, atalho para fluxograma, passo a passo,
 * alertas, decisões, critério de conclusão, dependências, paralelismo e fontes.
 */
function renderizar_etapa(etapa) {
  const fontes_referencias = etapa.fontes.map(id => {
    const f = mapa_fontes.get(id);
    return `<a class="fonte_link" href="#fonte_${escapar_html(id)}" data-fonte="${escapar_html(id)}" title="Consultar o POP e seu PDF original">${escapar_html(f.titulo)}</a>`;
  }).join('');

  const dependencias = etapa.dependencias?.map(id =>
    `<a href="#${escapar_html(id)}" data-etapa="${escapar_html(id)}">${escapar_html(nome_etapa(id))}</a>`
  ).join('') || 'Início do processo / conforme gatilho descrito.';

  const paralelo = etapa.paralelo?.map(id =>
    `<a href="#${escapar_html(id)}" data-etapa="${escapar_html(id)}">${escapar_html(nome_etapa(id))}</a>`
  ).join('') || 'Sem paralelismo específico indicado.';

  const alertas = (etapa.alertas || []).map(texto =>
    `<div class="box_aviso"><strong>⚠ Atenção:</strong> ${escapar_html(texto)}</div>`
  ).join('');

  const decisoes = (etapa.decisoes || []).map(texto =>
    `<div class="box_decisao"><strong>◇ Decisão ou exceção:</strong> ${escapar_html(texto)}</div>`
  ).join('');

  const tags = etapa.etiquetas.map(texto =>
    `<span class="chip ${classe_etiqueta(texto)}">${escapar_html(texto)}</span>`
  ).join('');

  const passos = `<h4 class="subtitulo">Passo a passo</h4><ol class="passos">${etapa.passos.map(passo => `<li>${escapar_html(passo)}</li>`).join('')}</ol>`;

  return `<details class="procedimento" id="${escapar_html(etapa.id)}" data_grupo="${escapar_html(etapa.grupo)}">`
    + `<summary>`
    + `<span class="numero">${escapar_html(etapa.numero)}</span>`
    + `<span class="cabecalho_etapa">`
    + `<h3>${escapar_html(etapa.titulo)}</h3>`
    + `<p>${escapar_html(etapa.resumo)}</p>`
    + `<span class="chips"><span class="chip">${escapar_html(etapa.sistema)}</span>${tags}</span>`
    + `</span>`
    + `<span class="seta" aria-hidden="true">⌄</span>`
    + `</summary>`
    + `<div class="corpo_etapa">`
    + `<div class="ficha">`
    + `<div>`
    + `<div class="campo"><span class="rotulo">Objetivo / resultado esperado</span><p>${escapar_html(etapa.objetivo || etapa.resumo)}</p></div>`
    + `${renderizar_campo('Pré-requisitos', etapa.pre)}`
    + `${({
      procuracao_rfb: 'fluxogramas/3.1-fluxograma-ecac-procuracao-rfb.html',
      procuracao_det: 'fluxogramas/3.2-fluxograma-spe-procuracao-det-fgts.html',
      procuracao_sefaz: 'fluxogramas/3.3-fluxograma-agencia-net-sefaz-df.html',
      procuracao_conectividade: 'fluxogramas/3.4-fluxograma-conectividade-social-icp-v2.html'
    })[etapa.id]
      ? `<a class="atalho_fluxograma" href="${({
        procuracao_rfb: 'fluxogramas/3.1-fluxograma-ecac-procuracao-rfb.html',
        procuracao_det: 'fluxogramas/3.2-fluxograma-spe-procuracao-det-fgts.html',
        procuracao_sefaz: 'fluxogramas/3.3-fluxograma-agencia-net-sefaz-df.html',
        procuracao_conectividade: 'fluxogramas/3.4-fluxograma-conectividade-social-icp-v2.html'
      })[etapa.id]}" target="_blank" rel="noopener noreferrer" aria-label="Abrir fluxograma em nova aba"><span class="icone" aria-hidden="true">▧</span><strong>Ver fluxograma ↗</strong><small>Consulte o fluxo completo deste procedimento.</small></a>`
      : ''}`
    + `${etapa.id === "procuracao_sefaz" ? passos : ""}`
    + `</div>`
    + `<div>`
    + `<div class="campo"><span class="rotulo">Sistema ou ferramenta</span><p>${escapar_html(etapa.sistema)}</p>${etapa.url_documentada
      ? `<p style="margin-top:8px"><a href="${escapar_html(etapa.url_documentada)}" target="_blank" rel="noopener noreferrer">Abrir endereço citado no PDF ↗</a><br><small style="color:var(--muted)">Link do documento, não verificado externamente</small></p>`
      : ''
    }</div>`
    + `<div class="campo"><span class="rotulo">Identificação operacional</span><p>${escapar_html(etapa.numero)} · ${escapar_html(nomes_grupos[etapa.grupo])}</p></div>`
    + `${etapa.id === "procuracao_sefaz" ? quadro_procuradora() : ""}`
    + `</div>`
    + `</div>`
    + `${etapa.id === "procuracao_sefaz" ? "" : passos}`
    + `${alertas}`
    + `${decisoes}`
    + `<div class="box_ok"><strong>✓ Critério de conclusão:</strong> ${escapar_html(etapa.conclusao || 'Confirmar conclusão e atualizar os controles aplicáveis.')}</div>`
    + `${etapa.registros ? `<div class="campo"><span class="rotulo">Registros e evidências</span><p>${escapar_html(etapa.registros)}</p></div>` : ''}`
    + `<div class="fichas_rodape">`
    + `<div class="vinculo"><span class="rotulo">Dependências</span>${dependencias}</div>`
    + `<div class="vinculo"><span class="rotulo">Pode avançar em paralelo</span>${paralelo}</div>`
    + `</div>`
    + `<div class="fontes_linha"><span class="rotulo" style="margin:0">Fontes documentais</span>${fontes_referencias}</div>`
    + `</div>`
    + `</details>`;
}

/**
 * Cria a barra de busca local e os botões "Expandir tudo" / "Recolher" de cada aba
 * e move-a para o contêiner #ferramentas no cabeçalho superior.
 */
function criar_filtros(grupo) {
  const local = document.querySelector(`[data-filtros="${grupo}"]`);
  local.innerHTML = `<label class="busca"><span aria-hidden="true">⌕</span><input type="search" data-busca="${grupo}" placeholder="Buscar nesta aba" aria-label="Buscar em ${escapar_html(nomes_grupos[grupo])}"></label><div class="acao_grupo"><button class="botao" type="button" data-expandir="${grupo}">Expandir tudo</button><button class="botao" type="button" data-recolher="${grupo}">Recolher</button></div>`;
  local.classList.add('compacto');
  local.hidden = true;
  document.getElementById('ferramentas').append(local);
  filtros[grupo] = '';
}

/**
 * Preenche todas as abas de fases com suas respectivas etapas renderizadas.
 */
function preencher_etapas() {
  grupos.forEach(grupo => {
    criar_filtros(grupo);
    const itens = etapas.filter(etapa => etapa.grupo === grupo);
    document.getElementById(`etapas_${grupo}`).innerHTML = itens.map(renderizar_etapa).join('');
    atualizar_resultados(grupo);
  });
}

// Conteúdo textual dos 4 fluxogramas externos para indexação na Pesquisa Global
const fluxosPesquisa = window.FLUXOS_PESQUISA;

// Índice geral da pesquisa e cache por etapa
const indice = [];
const porEtapa = new Map();

/**
 * Quebra um texto normalizado em uma lista de palavras alfanuméricas.
 */
function palavras(texto) {
  return normalizar_texto(texto).match(/[a-z0-9]+/g) || [];
}

/**
 * Extrai todo o texto visível dentro de um elemento DOM usando TreeWalker.
 */
function textoPesquisavel(elemento) {
  const leitor = document.createTreeWalker(elemento, NodeFilter.SHOW_TEXT);
  const partes = [];
  while (leitor.nextNode()) partes.push(leitor.currentNode.nodeValue);
  return partes.join(' ');
}

/**
 * Cria um registro padronizado para o índice de busca.
 */
function entrada(titulo, secao, texto, destino) {
  return {
    titulo,
    secao,
    destino,
    cabecalho: palavras(titulo),
    termos: [...new Set(palavras(secao + ' ' + texto))]
  };
}

/**
 * Comparação aproximada (fuzzy) entre duas palavras:
 * aceita uma inserção, remoção, substituição ou inversão de letras vizinhas.
 */
function proxima(a, b) {
  if (a.length < 4 || Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  if (a.length > b.length) return a.slice(i + 1) === b.slice(i);
  if (b.length > a.length) return a.slice(i) === b.slice(i + 1);
  return a.slice(i + 1) === b.slice(i + 1) ||
    (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
}

/**
 * Calcula a pontuação de afinidade de um termo contra uma lista de palavras:
 * 4 = correspondência exata; 3 = substring; 1 = palavra aproximada; 0 = sem relação.
 */
function afinidade(termo, lista) {
  if (lista.includes(termo)) return 4;
  if (termo.length >= 2 && lista.some(p => p.includes(termo))) return 3;
  return lista.some(p => proxima(termo, p)) ? 1 : 0;
}

/**
 * Calcula a relevância total de um item para os termos pesquisados (priorizando ocorrências no título).
 * Retorna -1 se algum termo da consulta não for encontrado.
 */
function relevancia(item, consulta) {
  let total = 0;
  for (const termo of consulta) {
    const titulo = afinidade(termo, item.cabecalho);
    const pontos = titulo ? 5 + titulo : afinidade(termo, item.termos);
    if (!pontos) return -1;
    total += pontos;
  }
  return total;
}

/**
 * Filtra, ordena por relevância e atualiza o contador de procedimentos exibidos em uma aba.
 */
function atualizar_resultados(grupo) {
  const consulta = palavras(filtros[grupo]);
  const lista = document.getElementById('etapas_' + grupo);
  const itens = etapas
    .filter(e => e.grupo === grupo)
    .map(e => {
      const el = document.getElementById(e.id);
      if (!porEtapa.has(e.id)) {
        const item = entrada(
          e.numero + ' · ' + e.titulo,
          '',
          [...(e.pre || []), ...(e.passos || [])].join(' '),
          { etapa: e.id }
        );
        item.secao = nomes_grupos[grupo];
        porEtapa.set(e.id, item);
      }
      return { el, pontos: relevancia(porEtapa.get(e.id), consulta) };
    })
    .sort((a, b) => b.pontos - a.pontos);

  for (const { el, pontos } of itens) {
    el.hidden = pontos < 0;
    lista.append(el);
  }

  const qtd = itens.filter(item => item.pontos >= 0).length;
  document.getElementById('resultado_' + grupo).textContent = qtd
    ? qtd + ' de ' + itens.length + ' procedimentos exibidos'
    : 'Nenhum procedimento encontrado nesta aba.';
}

/**
 * Indexa procedimentos, biblioteca documental, seções de visão geral/regras e fluxogramas
 * para alimentar a aba de Pesquisa Global.
 */
function indexarCentral() {
  indice.push(...porEtapa.values());

  for (const f of fontes) {
    indice.push(
      entrada(
        f.titulo,
        'Biblioteca documental',
        [f.arquivo, f.categoria, ...(f.dados_izzi || []).flat(), ...f.paginas.map(p => p.texto)].join(' '),
        { fonte: f.id }
      )
    );
  }

  for (const [painel, secao] of [['visao', 'Visão geral'], ['regras', 'Regras e pendências']]) {
    const bloco = document.getElementById('painel_' + painel);
    for (const [i, el] of Array.from(bloco.querySelectorAll('.fase,.cartao,.painel_texto,.pendencia')).entries()) {
      el.id = 'busca_' + painel + '_' + i;
      const titulo = el.querySelector('h2,h3,strong')?.textContent
        || el.previousElementSibling?.querySelector('h2')?.textContent
        || secao;
      indice.push(entrada(titulo, secao, textoPesquisavel(el), { painel, id: el.id }));
    }
  }

  for (const f of fluxosPesquisa) {
    indice.push(entrada(f.titulo, 'Fluxogramas', f.texto, { url: f.url }));
  }
}

/**
 * Executa a busca na aba "Pesquisa" e renderiza os cartões de resultados clicáveis.
 */
function pesquisarCentral() {
  const termos = palavras(document.getElementById('consulta_geral').value);
  const lista = document.getElementById('achados');
  lista.replaceChildren();

  const incluirBiblioteca = document.getElementById('incluir_biblioteca').checked;
  const candidatos = indice.filter(item => incluirBiblioteca || item.destino.etapa);
  const resultados = candidatos
    .map(item => ({ item, pontos: termos.length ? relevancia(item, termos) : 0 }))
    .filter(r => r.pontos >= 0);

  if (termos.length) resultados.sort((a, b) => b.pontos - a.pontos);

  document.getElementById('total_geral').textContent = resultados.length + ' resultado(s)';

  for (const { item } of resultados) {
    const d = item.destino;
    const a = document.createElement('a');
    a.href = d.url || '#' + (d.etapa || (d.fonte && 'fonte_' + d.fonte) || d.id);
    a.className = 'cartao achado';

    const origem = document.createElement('small');
    origem.textContent = item.secao;

    const titulo = document.createElement('strong');
    titulo.textContent = item.titulo;

    a.append(origem, titulo);
    if (d.etapa) a.dataset.etapa = d.etapa;
    if (d.fonte) a.dataset.fonte = d.fonte;
    if (d.painel) {
      a.onclick = ev => {
        ev.preventDefault();
        mostrar_painel(d.painel);
        document.getElementById(d.id).scrollIntoView({ block: 'center' });
      };
    }
    lista.append(a);
  }
}

/**
 * Alterna o painel visível, atualiza a barra de ferramentas do topo, marca o item ativo no menu
 * e opcionalmente atualiza o hash (#) da URL.
 */
function mostrar_painel(nome, atualizar_hash = true) {
  document.querySelectorAll('.compacto').forEach(el => el.hidden = el.dataset.filtros !== nome);
  document.querySelectorAll('.painel').forEach(el => el.classList.toggle('ativo', el.id === `painel_${nome}`));
  document.querySelectorAll('[data-painel]').forEach(el => {
    if (el.dataset.painel === nome) el.setAttribute('aria-current', 'page');
    else el.removeAttribute('aria-current');
  });
  window.scrollTo({ top: 0, behavior: 'instant' });
  if (atualizar_hash && history.replaceState) history.replaceState(null, '', `#${nome}`);
}

/**
 * Navega diretamente para uma etapa específica, limpa o filtro da aba, abre o acordeão e rola até ele.
 */
function ir_para_etapa(id) {
  const etapa = mapa_etapas.get(id);
  if (!etapa) return;
  mostrar_painel(etapa.grupo);
  filtros[etapa.grupo] = '';
  const campo = document.querySelector(`[data-busca="${etapa.grupo}"]`);
  campo.value = '';
  atualizar_resultados(etapa.grupo);
  const alvo = document.getElementById(id);
  alvo.open = true;
  requestAnimationFrame(() => alvo.scrollIntoView({ behavior: 'smooth', block: 'start' }));
}

/**
 * Navega diretamente para um documento específico na Biblioteca Documental, abre-o e rola até ele.
 */
function ir_para_fonte(id) {
  mostrar_painel('fontes');
  const campo = document.getElementById('busca_fontes');
  campo.value = '';
  filtrar_fontes('');
  const alvo = document.getElementById(`fonte_${id}`);
  if (alvo) {
    alvo.open = true;
    requestAnimationFrame(() => alvo.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
}

/**
 * Renderiza todos os POPs e o rascunho na Biblioteca Documental, configurando carregamento
 * sob demanda (lazy) do visualizador <iframe> de PDF ao expandir cada documento.
 */
function preencher_fontes() {
  document.getElementById('lista_fontes').innerHTML = fontes.map(fonte => {
    const url = fonte.pdf_original ? escapar_html(fonte.pdf_original) : '';
    const original = url
      ? `<div class="acoes_documento"><a class="botao" href="${url}" target="_blank" rel="noopener noreferrer">Abrir PDF original ↗</a><a class="botao" href="${url}" download="${escapar_html(fonte.arquivo)}">Baixar PDF original</a></div><details class="original_documento"><summary>Visualizar PDF original nesta página</summary><div class="visualizador_original" data-pdf="${url}" data-titulo="${escapar_html(fonte.titulo)}"></div><p class="nota_documento">Se o navegador não exibir o documento, use “Abrir PDF original” ou “Baixar PDF original”.</p></details>`
      : '';
    const dados = fonte.dados_izzi
      ? `<div class="dados_izzi"><h3>Dados da IZZI no POP</h3><p>Conforme as páginas 2 e 3 do PDF Agência Net / SEFAZ-DF.</p><dl>${fonte.dados_izzi.map(([campo, valor]) => `<div><dt>${escapar_html(campo)}</dt><dd>${escapar_html(valor)}</dd></div>`).join('')}</dl></div>`
      : '';

    return `<details id="fonte_${escapar_html(fonte.id)}" class="fonte_doc" data-texto-fonte="${escapar_html(normalizar_texto(fonte.titulo + ' ' + fonte.arquivo + ' ' + fonte.paginas.map(p => p.texto).join(' ')))}"><summary>${escapar_html(fonte.titulo)} · ${fonte.quantidade_paginas} página(s) · ${escapar_html(fonte.categoria)}</summary><div class="documento_conteudo"><div class="rotulo">Arquivo recebido: ${escapar_html(fonte.arquivo)}</div>${original}${dados}<h3 class="titulo_transcricao">${url ? 'Texto integral do POP' : 'Texto complementar'}</h3>${fonte.paginas.map(p => `<div class="pagina_fonte">PÁGINA ${p.numero}</div><pre>${escapar_html(p.texto)}</pre>`).join('')}</div></details>`;
  }).join('');

  // Cria o iframe do PDF apenas na primeira vez que o usuário abre o visualizador
  document.querySelectorAll('.original_documento').forEach(detalhe => detalhe.addEventListener('toggle', () => {
    const local = detalhe.querySelector('[data-pdf]');
    if (detalhe.open && !local.firstElementChild) {
      const visor = document.createElement('iframe');
      visor.src = local.dataset.pdf;
      visor.title = `PDF original — ${local.dataset.titulo}`;
      visor.className = 'pdf_original';
      local.appendChild(visor);
    }
  }));
}

/**
 * Filtra os documentos exibidos na Biblioteca Documental conforme o termo digitado.
 */
function filtrar_fontes(termo) {
  const busca = normalizar_texto(termo);
  document.querySelectorAll('.fonte_doc').forEach(el => {
    el.hidden = !!busca && !el.dataset.textoFonte.includes(busca);
  });
}

/**
 * Copia o CNPJ da IZZI ou o e-mail do DP para a área de transferência e dá feedback visual por 2 segundos.
 */
async function copiar_cnpj(botao) {
  const email = botao.hasAttribute('data-copiar-email');
  const cnpj = email ? 'dp@izzicontabil.com.br' : '30.182.037/0001-49';
  const rotulo = email ? 'Copiar e-mail do DP' : 'Copiar CNPJ da IZZI';
  const sucesso = email ? 'E-mail copiado' : 'CNPJ copiado';
  let copiado = false;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(cnpj);
      copiado = true;
    }
  } catch (e) { }

  if (!copiado) {
    const campo = document.createElement('textarea');
    campo.value = cnpj;
    campo.style.position = 'fixed';
    campo.style.opacity = '0';
    document.body.appendChild(campo);
    campo.select();
    try {
      copiado = document.execCommand('copy');
    } catch (e) { }
    campo.remove();
  }

  if (copiado) {
    botao.dataset.copiado = 'true';
    botao.setAttribute('aria-label', sucesso);
    botao.title = sucesso;
    setTimeout(() => {
      delete botao.dataset.copiado;
      botao.setAttribute('aria-label', rotulo);
      botao.title = rotulo;
    }, 2000);
  } else {
    botao.title = 'Não foi possível copiar';
  }
}

/**
 * Inicializa a aplicação: renderiza etapas, fontes e pendências,
 * configura delegação de eventos de clique/digitação e trata navegação inicial via hash (#).
 */
function iniciar() {
  preencher_etapas();
  preencher_fontes();

  document.getElementById('qtd_pendencias').textContent = dados_operacionais.pendencias.length;
  document.getElementById('lista_pendencias').innerHTML = dados_operacionais.pendencias
    .map((p, indice) => `<div class="pendencia"><h3>${String(indice + 1).padStart(2, '0')} · ${escapar_html(p.titulo)}</h3><p>${escapar_html(p.detalhe)}</p></div>`)
    .join('');

  // Delegação global de cliques para botões de cópia, menu, fases, links internos e expandir/recolher
  document.addEventListener('click', ev => {
    const procuradora = ev.target.closest('[data-copiar-procuradora]');
    if (procuradora) {
      copiar_procuradora(procuradora);
      return;
    }

    const copiar = ev.target.closest('[data-copiar-cnpj]');
    if (copiar) {
      copiar_cnpj(copiar);
      return;
    }

    const menu = ev.target.closest('[data-painel]');
    if (menu) {
      mostrar_painel(menu.dataset.painel);
      return;
    }

    const destino = ev.target.closest('[data-destino]');
    if (destino) {
      mostrar_painel(destino.dataset.destino);
      return;
    }

    const etapa_link = ev.target.closest('[data-etapa]');
    if (etapa_link) {
      ev.preventDefault();
      ir_para_etapa(etapa_link.dataset.etapa);
      return;
    }

    const fonte_link = ev.target.closest('[data-fonte]');
    if (fonte_link) {
      ev.preventDefault();
      ir_para_fonte(fonte_link.dataset.fonte);
      return;
    }

    const expandir = ev.target.closest('[data-expandir]');
    if (expandir) {
      document.querySelectorAll(`#etapas_${expandir.dataset.expandir} details.procedimento:not([hidden])`).forEach(el => el.open = true);
      return;
    }

    const recolher = ev.target.closest('[data-recolher]');
    if (recolher) {
      document.querySelectorAll(`#etapas_${recolher.dataset.recolher} details.procedimento:not([hidden])`).forEach(el => el.open = false);
      return;
    }
  });

  // Delegação global de digitação para filtros por aba e busca na Biblioteca Documental
  document.addEventListener('input', ev => {
    if (ev.target.matches('[data-busca]')) {
      const grupo = ev.target.dataset.busca;
      filtros[grupo] = ev.target.value;
      atualizar_resultados(grupo);
    }
    if (ev.target.id === 'busca_fontes') {
      filtrar_fontes(ev.target.value);
    }
  });

  // Abre automaticamente o painel ou etapa indicado no hash da URL (ex.: #procuracoes ou #entrada_slack)
  const atalho = decodeURIComponent(location.hash.replace('#', ''));
  if (nomes_grupos[atalho] || ['visao', 'regras', 'fontes', 'pesquisa'].includes(atalho)) {
    mostrar_painel(atalho, false);
  } else if (mapa_etapas.has(atalho)) {
    ir_para_etapa(atalho);
  }
}

// Executa a inicialização, indexação e configura os ouvintes da Pesquisa Global
iniciar();
indexarCentral();
pesquisarCentral();
document.getElementById('incluir_biblioteca').addEventListener('change', pesquisarCentral);
document.getElementById('consulta_geral').addEventListener('input', pesquisarCentral);
  
