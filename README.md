# IZZI — Central de POPs

Projeto de páginas HTML para consulta interativa de Procedimentos Operacionais Padrão (POPs) e fluxos de trabalho da IZZI.

## Estrutura do projeto

- `index.html` — central interativa de procedimentos (página principal).
- `fluxogramas/` — fluxogramas individuais dos procedimentos de procuração:
  - `3.1-fluxograma-ecac-procuracao-rfb.html`
  - `3.2-fluxograma-spe-procuracao-det-fgts.html`
  - `3.3-fluxograma-agencia-net-sefaz-df.html`
  - `3.4-fluxograma-conectividade-social-icp-v2.html`
- `assets/css/styles.css` — estilos da aplicação.
- `assets/js/dados.js` — base de dados das etapas, fontes documentais, pendências e fluxogramas.
- `assets/js/app.js` — lógica de renderização, filtros, busca e ações da interface.
- `assets/img/` — logotipo (`izzi-logo.png`) e ícone (`izzi-guia.svg`).
- `documentos/pops/` — os 16 PDFs dos POPs, com nomes sincronizados com a biblioteca documental.

Abra o `index.html` diretamente no navegador. O projeto é estático e não requer instalação.

Na Biblioteca documental, cada POP possui texto integral pesquisável por página e acesso ao PDF original, para visualizar ou baixar. Mantenha as pastas `assets/`, `fluxogramas/` e `documentos/` junto ao `index.html` ao copiar a central. O rascunho complementar permanece identificado separadamente.
