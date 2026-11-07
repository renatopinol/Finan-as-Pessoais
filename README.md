# Finanças Pessoais

Aplicação web simples de controle financeiro pessoal (HTML, CSS e JavaScript).  
Funciona 100% no navegador, sem backend, com dados salvos em `localStorage`.

## Como usar localmente

1. Abra a pasta do projeto.
2. Abra o arquivo `index.html` no navegador  
   (duplo clique ou arraste para o Chrome/Edge/Firefox).

Ou, se preferir um servidor estático simples:

```bash
npx serve .
```

## Publicar no GitHub Pages

1. Crie um repositório no GitHub e envie estes arquivos:
   - `index.html`
   - `style.css`
   - `app.js`
   - `README.md`
2. No GitHub, vá em **Settings → Pages**.
3. Em **Source**, escolha a branch `main` (ou `master`) e a pasta `/ (root)`.
4. Salve e aguarde alguns minutos.
5. Acesse a URL gerada, por exemplo:  
   `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`

A aplicação usa apenas caminhos relativos, então funciona tanto na raiz quanto em subdiretório do GitHub Pages.

## Privacidade

- Nenhum dado financeiro fica no código-fonte.
- Tudo permanece apenas no navegador do usuário (`localStorage`).
- Use **Exportar backup** nas Configurações periodicamente.
- Não envie arquivos de backup JSON com dados reais para o repositório público.

## Recursos

- Dashboard do mês (renda, gastos, dívidas, valor livre e sugestão de investimento)
- Cadastro rápido de despesas (fixas e variáveis, com recorrência)
- Controle simples de dívidas e pagamentos
- Gráficos com Chart.js
- Exportar / importar backup JSON
