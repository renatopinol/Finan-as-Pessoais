(() => {
  "use strict";

  const STORAGE_KEY = "financas_pessoais_v1";

  const DEFAULT_CATEGORIES = [
    { id: "moradia", name: "Moradia", color: "#2F6FED" },
    { id: "alimentacao", name: "Alimentação", color: "#1F8A5B" },
    { id: "transporte", name: "Transporte", color: "#0EA5A4" },
    { id: "lazer", name: "Lazer", color: "#C79212" },
    { id: "saude", name: "Saúde", color: "#D64545" },
    { id: "educacao", name: "Educação", color: "#7C5CFC" },
    { id: "roupas", name: "Roupas", color: "#DB2777" },
    { id: "casa", name: "Casa", color: "#EA580C" },
    { id: "assinaturas", name: "Assinaturas", color: "#475569" },
    { id: "viagem", name: "Viagem", color: "#0284C7" },
    { id: "dividas", name: "Dívidas", color: "#B45309" },
    { id: "outros", name: "Outros", color: "#64748B" },
  ];

  const MONTH_NAMES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  /** @type {{settings: object, expenses: array, debts: array, payments: array, isDemo: boolean}} */
  let state = createEmptyState();
  let selectedMonth = currentMonthKey();
  let categoryChart = null;
  let historyChart = null;

  // ---------- Utils ----------

  function uid() {
    return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
  }

  function currentMonthKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }

  function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function monthFromDate(isoDate) {
    return String(isoDate || "").slice(0, 7);
  }

  function parseMoney(input) {
    if (input == null || input === "") return 0;
    if (typeof input === "number") return Number.isFinite(input) ? input : 0;
    let s = String(input).trim();
    if (!s) return 0;
    s = s.replace(/R\$\s?/gi, "").replace(/\s/g, "");
    if (s.includes(",") && s.includes(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else if (s.includes(",")) {
      s = s.replace(",", ".");
    }
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }

  function formatMoney(value) {
    const n = Number(value) || 0;
    return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  function formatDate(isoDate) {
    if (!isoDate) return "—";
    const [y, m, d] = isoDate.split("-");
    if (!y || !m || !d) return isoDate;
    return `${d}/${m}/${y}`;
  }

  function monthLabel(monthKey) {
    const [y, m] = monthKey.split("-").map(Number);
    return `${MONTH_NAMES[m - 1]} ${y}`;
  }

  function shiftMonth(monthKey, delta) {
    const [y, m] = monthKey.split("-").map(Number);
    const date = new Date(y, m - 1 + delta, 1);
    return currentMonthKey(date);
  }

  function safeDiv(a, b) {
    if (!b || !Number.isFinite(b) || b === 0) return 0;
    return a / b;
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function toast(message) {
    const el = document.getElementById("toast");
    el.textContent = message;
    el.classList.remove("hidden");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.add("hidden"), 2600);
  }

  // ---------- State / Storage ----------

  function createEmptyState() {
    return {
      settings: {
        salary: 0,
        otherIncome: 0,
        investPercent: 50,
        categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
      },
      expenses: [],
      debts: [],
      payments: [],
      isDemo: false,
    };
  }

  function createDemoState() {
    const month = currentMonthKey();
    const prev = shiftMonth(month, -1);
    const prev2 = shiftMonth(month, -2);
    const day = (mk, d) => `${mk}-${String(d).padStart(2, "0")}`;

    return {
      settings: {
        salary: 5000,
        otherIncome: 0,
        investPercent: 50,
        categories: DEFAULT_CATEGORIES.map((c) => ({ ...c })),
      },
      expenses: [
        { id: uid(), description: "Aluguel", value: 1500, categoryId: "moradia", type: "fixo", date: day(month, 5), recurring: true, demo: true },
        { id: uid(), description: "Internet", value: 120, categoryId: "assinaturas", type: "fixo", date: day(month, 8), recurring: true, demo: true },
        { id: uid(), description: "Supermercado", value: 850, categoryId: "alimentacao", type: "variavel", date: day(month, 10), recurring: false, demo: true },
        { id: uid(), description: "Cinema", value: 80, categoryId: "lazer", type: "variavel", date: day(month, 12), recurring: false, demo: true },
        { id: uid(), description: "Uber", value: 160, categoryId: "transporte", type: "variavel", date: day(month, 14), recurring: false, demo: true },
        { id: uid(), description: "Farmácia", value: 95, categoryId: "saude", type: "variavel", date: day(month, 16), recurring: false, demo: true },
        { id: uid(), description: "Aluguel", value: 1500, categoryId: "moradia", type: "fixo", date: day(prev, 5), recurring: true, demo: true },
        { id: uid(), description: "Internet", value: 120, categoryId: "assinaturas", type: "fixo", date: day(prev, 8), recurring: true, demo: true },
        { id: uid(), description: "Supermercado", value: 780, categoryId: "alimentacao", type: "variavel", date: day(prev, 11), recurring: false, demo: true },
        { id: uid(), description: "Restaurante", value: 300, categoryId: "lazer", type: "variavel", date: day(prev, 18), recurring: false, demo: true },
        { id: uid(), description: "Aluguel", value: 1500, categoryId: "moradia", type: "fixo", date: day(prev2, 5), recurring: true, demo: true },
        { id: uid(), description: "Internet", value: 120, categoryId: "assinaturas", type: "fixo", date: day(prev2, 8), recurring: true, demo: true },
        { id: uid(), description: "Mercado", value: 700, categoryId: "alimentacao", type: "variavel", date: day(prev2, 9), recurring: false, demo: true },
      ],
      debts: [
        {
          id: "demo_debt_joao",
          creditor: "João",
          description: "Empréstimo pessoal",
          total: 2000,
          paid: 500,
          plannedThisMonth: 300,
          demo: true,
        },
        {
          id: "demo_debt_maria",
          creditor: "Maria",
          description: "",
          total: 800,
          paid: 200,
          plannedThisMonth: 200,
          demo: true,
        },
      ],
      payments: [
        { id: uid(), debtId: "demo_debt_joao", value: 500, date: day(prev, 20), demo: true },
        { id: uid(), debtId: "demo_debt_maria", value: 200, date: day(prev, 22), demo: true },
      ],
      isDemo: true,
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        state = createDemoState();
        saveState();
        return;
      }
      const parsed = JSON.parse(raw);
      state = normalizeState(parsed);
    } catch {
      state = createDemoState();
      saveState();
    }
  }

  function normalizeState(data) {
    const base = createEmptyState();
    if (!data || typeof data !== "object") return createDemoState();

    const settings = data.settings || {};
    base.settings.salary = Number(settings.salary) || 0;
    base.settings.otherIncome = Number(settings.otherIncome) || 0;
    base.settings.investPercent = clamp(Number(settings.investPercent) || 50, 0, 100);
    base.settings.categories =
      Array.isArray(settings.categories) && settings.categories.length
        ? settings.categories.map((c) => ({
            id: String(c.id || uid()),
            name: String(c.name || "Categoria"),
            color: String(c.color || "#64748B"),
          }))
        : DEFAULT_CATEGORIES.map((c) => ({ ...c }));

    base.expenses = Array.isArray(data.expenses)
      ? data.expenses.map((e) => ({
          id: String(e.id || uid()),
          description: String(e.description || ""),
          value: Math.max(0, Number(e.value) || 0),
          categoryId: String(e.categoryId || "outros"),
          type: e.type === "fixo" ? "fixo" : "variavel",
          date: String(e.date || todayISO()),
          recurring: Boolean(e.recurring),
          recurringGroupId: e.recurringGroupId ? String(e.recurringGroupId) : null,
          demo: Boolean(e.demo),
        }))
      : [];

    base.debts = Array.isArray(data.debts)
      ? data.debts.map((d) => ({
          id: String(d.id || uid()),
          creditor: String(d.creditor || ""),
          description: String(d.description || ""),
          total: Math.max(0, Number(d.total) || 0),
          paid: Math.max(0, Number(d.paid) || 0),
          plannedThisMonth: Math.max(0, Number(d.plannedThisMonth) || 0),
          demo: Boolean(d.demo),
        }))
      : [];

    base.payments = Array.isArray(data.payments)
      ? data.payments.map((p) => ({
          id: String(p.id || uid()),
          debtId: String(p.debtId || ""),
          value: Math.max(0, Number(p.value) || 0),
          date: String(p.date || todayISO()),
          demo: Boolean(p.demo),
        }))
      : [];

    // Keep paid in sync with payments sum (never exceed total)
    base.debts.forEach((debt) => {
      const paidSum = base.payments
        .filter((p) => p.debtId === debt.id)
        .reduce((s, p) => s + p.value, 0);
      debt.paid = Math.min(debt.total, Math.max(debt.paid, paidSum));
      if (debt.paid >= debt.total) debt.plannedThisMonth = 0;
    });

    base.isDemo = Boolean(data.isDemo);
    return base;
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  // ---------- Recurring expenses ----------

  function ensureRecurringForMonth(monthKey) {
    const templates = state.expenses.filter(
      (e) => e.recurring && e.type === "fixo" && monthFromDate(e.date) <= monthKey
    );

    // Group by recurringGroupId or by description+category+value for older records
    const groups = new Map();
    templates.forEach((e) => {
      const key = e.recurringGroupId || `legacy_${e.description}_${e.categoryId}_${e.value}`;
      const existing = groups.get(key);
      if (!existing || e.date < existing.date) groups.set(key, e);
    });

    let changed = false;
    groups.forEach((template, key) => {
      const start = monthFromDate(template.date);
      if (start > monthKey) return;

      const already = state.expenses.some((e) => {
        if (monthFromDate(e.date) !== monthKey) return false;
        if (template.recurringGroupId) {
          return e.recurringGroupId === template.recurringGroupId || e.id === template.id;
        }
        return (
          e.description === template.description &&
          e.categoryId === template.categoryId &&
          e.value === template.value &&
          e.type === "fixo"
        );
      });

      if (already) return;

      // Only auto-create for months after the template's own month
      if (start === monthKey) return;

      const day = template.date.slice(8, 10) || "01";
      const [y, m] = monthKey.split("-");
      const lastDay = new Date(Number(y), Number(m), 0).getDate();
      const safeDay = String(Math.min(Number(day), lastDay)).padStart(2, "0");

      state.expenses.push({
        id: uid(),
        description: template.description,
        value: template.value,
        categoryId: template.categoryId,
        type: "fixo",
        date: `${monthKey}-${safeDay}`,
        recurring: true,
        recurringGroupId: template.recurringGroupId || key,
        demo: Boolean(template.demo),
      });
      changed = true;
    });

    if (changed) saveState();
  }

  // ---------- Calculations ----------

  function getIncome() {
    return Math.max(0, (Number(state.settings.salary) || 0) + (Number(state.settings.otherIncome) || 0));
  }

  function getExpensesForMonth(monthKey) {
    ensureRecurringForMonth(monthKey);
    return state.expenses.filter((e) => monthFromDate(e.date) === monthKey);
  }

  function sumExpenses(list) {
    return list.reduce((s, e) => s + (Number(e.value) || 0), 0);
  }

  /**
   * Debt impact for a month WITHOUT double-counting.
   * - Payments are NEVER added as expenses.
   * - For the current calendar month: use plannedThisMonth for active debts
   *   (planning), but if payments already made this month exceed the plan,
   *   use the actual payments (money already spent).
   * - For other months: use only actual payments registered in that month.
   */
  function getDebtImpactForMonth(monthKey) {
    const current = currentMonthKey();
    const paymentsInMonth = state.payments.filter((p) => monthFromDate(p.date) === monthKey);

    if (monthKey === current) {
      let total = 0;
      state.debts.forEach((debt) => {
        const balance = Math.max(0, debt.total - debt.paid);
        if (balance <= 0 && !paymentsInMonth.some((p) => p.debtId === debt.id)) return;

        const paidThisMonth = paymentsInMonth
          .filter((p) => p.debtId === debt.id)
          .reduce((s, p) => s + p.value, 0);

        const planned = Math.max(0, Number(debt.plannedThisMonth) || 0);
        // Use the greater of planned vs already paid this month, capped by remaining+paidThisMonth
        const remainingBeforeMonthPayments = balance + paidThisMonth;
        const impact = Math.min(
          remainingBeforeMonthPayments,
          Math.max(planned, paidThisMonth)
        );
        total += impact;
      });
      return total;
    }

    return paymentsInMonth.reduce((s, p) => s + p.value, 0);
  }

  function getMonthSummary(monthKey) {
    const expenses = getExpensesForMonth(monthKey);
    const totalGastos = sumExpenses(expenses);
    const totalFixos = sumExpenses(expenses.filter((e) => e.type === "fixo"));
    const totalVariaveis = sumExpenses(expenses.filter((e) => e.type === "variavel"));
    const renda = getIncome();
    const dividasPlanejadas = getDebtImpactForMonth(monthKey);
    const valorLivre = renda - totalGastos - dividasPlanejadas;
    const investPct = clamp(Number(state.settings.investPercent) || 0, 0, 100) / 100;
    const sugestaoInvestimento = valorLivre > 0 ? valorLivre * investPct : 0;
    const disponivelDepois = Math.max(0, valorLivre - sugestaoInvestimento);

    return {
      monthKey,
      renda,
      totalGastos,
      totalFixos,
      totalVariaveis,
      dividasPlanejadas,
      valorLivre,
      sugestaoInvestimento,
      disponivelDepois,
      percentualRendaGasta: safeDiv(totalGastos + dividasPlanejadas, renda),
      percentualCustosFixos: safeDiv(totalFixos, renda),
      expenses,
    };
  }

  function getCategoryTotals(expenses) {
    const map = new Map();
    expenses.forEach((e) => {
      map.set(e.categoryId, (map.get(e.categoryId) || 0) + e.value);
    });
    return [...map.entries()]
      .map(([categoryId, total]) => {
        const cat = state.settings.categories.find((c) => c.id === categoryId);
        return {
          categoryId,
          name: cat ? cat.name : "Outros",
          color: cat ? cat.color : "#64748B",
          total,
        };
      })
      .sort((a, b) => b.total - a.total);
  }

  function debtBalance(debt) {
    return Math.max(0, (Number(debt.total) || 0) - (Number(debt.paid) || 0));
  }

  function debtPaidPercent(debt) {
    if (!debt.total) return 0;
    return clamp(safeDiv(debt.paid, debt.total) * 100, 0, 100);
  }

  // ---------- Insights ----------

  function buildInsights(summary) {
    const insights = [];
    const cats = getCategoryTotals(summary.expenses);
    const investPct = state.settings.investPercent;

    if (!summary.expenses.length && summary.dividasPlanejadas === 0) {
      insights.push("Ainda não há movimentações neste mês. Que tal registrar a primeira despesa?");
      return insights;
    }

    if (cats.length) {
      insights.push(`Seu maior gasto este mês é ${cats[0].name}.`);
    }

    if (summary.renda > 0) {
      const fixPct = Math.round(summary.percentualCustosFixos * 100);
      insights.push(`Seus custos fixos representam ${fixPct}% da sua renda.`);
    }

    const prev = getMonthSummary(shiftMonth(summary.monthKey, -1));
    const prevCats = getCategoryTotals(prev.expenses);
    if (cats.length && prevCats.length) {
      const top = cats[0];
      const prevSame = prevCats.find((c) => c.categoryId === top.categoryId);
      if (prevSame) {
        const diff = top.total - prevSame.total;
        if (Math.abs(diff) >= 1) {
          insights.push(
            diff > 0
              ? `Você gastou ${formatMoney(diff)} a mais com ${top.name} comparado ao mês passado.`
              : `Você economizou ${formatMoney(Math.abs(diff))} em ${top.name} comparado ao mês passado.`
          );
        }
      }
    }

    if (summary.totalGastos > 0 && prev.totalGastos > 0) {
      const diff = summary.totalGastos - prev.totalGastos;
      if (Math.abs(diff) >= 1) {
        insights.push(
          diff > 0
            ? `Você está gastando ${formatMoney(diff)} a mais que no mês anterior.`
            : `Você está gastando ${formatMoney(Math.abs(diff))} a menos que no mês anterior.`
        );
      }
    }

    if (summary.valorLivre > 0) {
      insights.push(`Depois de pagar suas despesas e dívidas, sobrariam ${formatMoney(summary.valorLivre)}.`);
      if (investPct > 0) {
        insights.push(
          `Se você investir ${investPct}% da sua sobra, poderá investir ${formatMoney(summary.sugestaoInvestimento)} este mês.`
        );
      }
    } else if (summary.valorLivre < 0) {
      insights.push(`Atenção: seus gastos e dívidas ultrapassam a renda em ${formatMoney(Math.abs(summary.valorLivre))}.`);
    }

    return insights.slice(0, 5);
  }

  // ---------- Rendering ----------

  function setActivePage(page) {
    document.querySelectorAll(".page").forEach((el) => el.classList.toggle("active", el.id === `page-${page}`));
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.page === page);
    });
    const fab = document.getElementById("fab-add-expense");
    fab.style.display = "";
    if (page === "despesas") fab.classList.remove("hidden");
    else fab.classList.add("hidden");
    renderPage(page);
  }

  function renderPage(page) {
    if (page === "inicio") renderDashboard();
    if (page === "despesas") renderExpenses();
    if (page === "dividas") renderDebts();
    if (page === "config") renderSettings();
  }

  function renderDashboard() {
    ensureRecurringForMonth(selectedMonth);
    const summary = getMonthSummary(selectedMonth);

    document.getElementById("month-select").value = selectedMonth;

    const banner = document.getElementById("demo-banner");
    banner.classList.toggle("hidden", !state.isDemo);

    const cards = document.getElementById("summary-cards");
    const livreClass = summary.valorLivre >= 0 ? "positive" : "danger";
    cards.innerHTML = `
      <article class="stat-card info">
        <span class="label">Salário / Renda</span>
        <div class="value">${formatMoney(summary.renda)}</div>
      </article>
      <article class="stat-card danger">
        <span class="label">Gastos do mês</span>
        <div class="value">${formatMoney(summary.totalGastos)}</div>
      </article>
      <article class="stat-card warn">
        <span class="label">Dívidas a pagar no mês</span>
        <div class="value">${formatMoney(summary.dividasPlanejadas)}</div>
      </article>
      <article class="stat-card ${livreClass}">
        <span class="label">Valor livre</span>
        <div class="value">${formatMoney(summary.valorLivre)}</div>
      </article>
      <article class="stat-card positive">
        <span class="label">Valor sugerido para investir</span>
        <div class="value">${formatMoney(summary.sugestaoInvestimento)}</div>
      </article>
    `;

    renderCategoryChart(summary);
    renderTopCategories(summary);
    renderFixedVariable(summary);
    renderHealth(summary);
    renderInsights(summary);
    renderHistory();
  }

  function renderCategoryChart(summary) {
    const cats = getCategoryTotals(summary.expenses);
    const canvas = document.getElementById("chart-categories");
    const empty = document.getElementById("chart-empty");

    if (!cats.length) {
      empty.classList.remove("hidden");
      if (categoryChart) {
        categoryChart.destroy();
        categoryChart = null;
      }
      return;
    }

    empty.classList.add("hidden");
    const data = {
      labels: cats.map((c) => c.name),
      datasets: [
        {
          data: cats.map((c) => c.total),
          backgroundColor: cats.map((c) => c.color),
          borderWidth: 0,
          hoverOffset: 6,
        },
      ],
    };

    if (categoryChart) {
      categoryChart.data = data;
      categoryChart.update();
      return;
    }

    categoryChart = new Chart(canvas, {
      type: "doughnut",
      data,
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: "62%",
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${formatMoney(ctx.raw)}`,
            },
          },
        },
      },
    });
  }

  function renderTopCategories(summary) {
    const cats = getCategoryTotals(summary.expenses).slice(0, 3);
    const list = document.getElementById("top-categories");
    if (!cats.length) {
      list.innerHTML = `<li class="empty-state" style="border:none;display:block">Nenhum gasto para mostrar.</li>`;
      return;
    }
    list.innerHTML = cats
      .map(
        (c) => `
      <li>
        <span class="cat"><span class="dot" style="background:${c.color}"></span>${escapeHtml(c.name)}</span>
        <strong>${formatMoney(c.total)}</strong>
      </li>`
      )
      .join("");
  }

  function renderFixedVariable(summary) {
    document.getElementById("fixed-variable").innerHTML = `
      <div class="split-card">
        <span>Custos fixos</span>
        <strong>${formatMoney(summary.totalFixos)}</strong>
      </div>
      <div class="split-card">
        <span>Gastos variáveis</span>
        <strong>${formatMoney(summary.totalVariaveis)}</strong>
      </div>
    `;

    const pct = Math.round(summary.percentualCustosFixos * 100);
    const msg = document.getElementById("fixed-ratio-msg");
    const alert = document.getElementById("fixed-alert");

    if (summary.renda <= 0) {
      msg.textContent = "Configure sua renda nas Configurações para ver o percentual comprometido.";
      alert.classList.add("hidden");
      return;
    }

    msg.textContent = `${pct}% da sua renda já está comprometida com custos fixos.`;
    alert.classList.toggle("hidden", summary.percentualCustosFixos <= 0.6);
  }

  function renderHealth(summary) {
    const committed = summary.totalGastos + summary.dividasPlanejadas;
    const pct = summary.renda > 0 ? committed / summary.renda : committed > 0 ? 1.5 : 0;
    const pctShow = Math.round(pct * 100);
    const fill = document.getElementById("health-fill");
    const width = clamp(pctShow, 0, 100);

    fill.style.width = `${width}%`;
    fill.classList.remove("yellow", "orange", "red");
    if (pct > 1) fill.classList.add("red");
    else if (pct >= 0.8) fill.classList.add("orange");
    else if (pct >= 0.6) fill.classList.add("yellow");

    document.getElementById("health-msg").textContent =
      summary.renda > 0
        ? `Você já comprometeu ${pctShow}% da sua renda este mês.`
        : "Informe sua renda para acompanhar a saúde do mês.";

    document.getElementById("health-label").textContent =
      pctShow <= 60
        ? "Tudo sob controle."
        : pctShow <= 80
          ? "Atenção: a maior parte da renda já está comprometida."
          : pctShow <= 100
            ? "Cuidado: sobra pouco espaço no orçamento."
            : "Você já ultrapassou a renda do mês.";
  }

  function renderInsights(summary) {
    const list = document.getElementById("insights-list");
    const items = buildInsights(summary);
    list.innerHTML = items.map((t) => `<li>${escapeHtml(t)}</li>`).join("");
  }

  function renderHistory() {
    const months = [2, 1, 0].map((i) => shiftMonth(selectedMonth, -i));
    const summaries = months.map(getMonthSummary);

    const labels = summaries.map((s) => {
      const [, m] = s.monthKey.split("-");
      return MONTH_NAMES[Number(m) - 1].slice(0, 3);
    });

    const data = {
      labels,
      datasets: [
        {
          label: "Receita",
          data: summaries.map((s) => s.renda),
          backgroundColor: "#2F6FED",
          borderRadius: 8,
        },
        {
          label: "Gastos",
          data: summaries.map((s) => s.totalGastos),
          backgroundColor: "#D64545",
          borderRadius: 8,
        },
        {
          label: "Valor livre",
          data: summaries.map((s) => s.valorLivre),
          backgroundColor: "#1F8A5B",
          borderRadius: 8,
        },
      ],
    };

    if (historyChart) {
      historyChart.data = data;
      historyChart.update();
    } else {
      historyChart = new Chart(document.getElementById("chart-history"), {
        type: "bar",
        data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: "bottom", labels: { boxWidth: 12, font: { family: "DM Sans" } } },
            tooltip: {
              callbacks: { label: (ctx) => ` ${ctx.dataset.label}: ${formatMoney(ctx.raw)}` },
            },
          },
          scales: {
            x: { grid: { display: false } },
            y: {
              grid: { color: "#e6eee9" },
              ticks: {
                callback: (v) => {
                  if (Math.abs(v) >= 1000) return `R$ ${v / 1000}k`;
                  return `R$ ${v}`;
                },
              },
            },
          },
        },
      });
    }

    document.getElementById("history-cards").innerHTML = summaries
      .map(
        (s) => `
      <div class="history-card">
        <strong>${escapeHtml(monthLabel(s.monthKey))}</strong>
        <p>Receita: ${formatMoney(s.renda)}</p>
        <p>Gastos: ${formatMoney(s.totalGastos)}</p>
        <p>Livre: ${formatMoney(s.valorLivre)}</p>
      </div>`
      )
      .join("");
  }

  function renderExpenses() {
    const monthFilter = document.getElementById("expense-month-filter");
    if (!monthFilter.value) monthFilter.value = selectedMonth;
    const month = monthFilter.value;
    ensureRecurringForMonth(month);

    fillCategorySelect(document.getElementById("expense-category-filter"), true);

    const category = document.getElementById("expense-category-filter").value;
    const type = document.getElementById("expense-type-filter").value;
    const search = document.getElementById("expense-search").value.trim().toLowerCase();

    let list = getExpensesForMonth(month);
    if (category !== "all") list = list.filter((e) => e.categoryId === category);
    if (type !== "all") list = list.filter((e) => e.type === type);
    if (search) list = list.filter((e) => e.description.toLowerCase().includes(search));

    list.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

    document.getElementById("expense-month-total").textContent = formatMoney(sumExpenses(list));

    const container = document.getElementById("expense-list");
    if (!list.length) {
      container.innerHTML = `<div class="empty-state">Nenhuma despesa encontrada neste filtro.</div>`;
      return;
    }

    container.innerHTML = list
      .map((e) => {
        const cat = state.settings.categories.find((c) => c.id === e.categoryId);
        return `
        <article class="item-card" data-id="${e.id}">
          <div>
            <strong>${escapeHtml(e.description)}</strong>
            <div class="meta">
              <span>${formatDate(e.date)}</span>
              <span class="badge" style="background:${cat ? cat.color + "22" : "#eee"};color:${cat ? cat.color : "#555"}">${escapeHtml(cat ? cat.name : "Outros")}</span>
              <span class="badge ${e.type}">${e.type === "fixo" ? "Fixo" : "Variável"}</span>
              ${e.recurring ? '<span class="badge">Recorrente</span>' : ""}
            </div>
          </div>
          <div>
            <div class="amount">${formatMoney(e.value)}</div>
            <div class="actions">
              <button type="button" class="link-btn" data-edit-expense="${e.id}">Editar</button>
              <button type="button" class="link-btn danger" data-del-expense="${e.id}">Excluir</button>
            </div>
          </div>
        </article>`;
      })
      .join("");
  }

  function renderDebts() {
    const planned = getDebtImpactForMonth(selectedMonth);
    document.getElementById("debts-planned-total").textContent = formatMoney(planned);

    const list = document.getElementById("debt-list");
    if (!state.debts.length) {
      list.innerHTML = `<div class="panel empty-state">Nenhuma dívida cadastrada. Que bom!</div>`;
      return;
    }

    const sorted = [...state.debts].sort((a, b) => debtBalance(b) - debtBalance(a));

    list.innerHTML = sorted
      .map((d) => {
        const balance = debtBalance(d);
        const pct = debtPaidPercent(d);
        const settled = balance <= 0;
        const afterPlan = Math.max(0, balance - (Number(d.plannedThisMonth) || 0));

        return `
        <article class="debt-card ${settled ? "settled" : ""}">
          ${settled ? '<div class="settled-tag">✅ Dívida quitada</div>' : ""}
          <div class="debt-top">
            <div>
              <h3>${escapeHtml(d.creditor)}</h3>
              ${d.description ? `<p class="desc">${escapeHtml(d.description)}</p>` : ""}
            </div>
            <strong>${pct.toFixed(0)}% pago</strong>
          </div>
          <div class="progress" aria-hidden="true"><span style="width:${pct}%"></span></div>
          <div class="debt-stats">
            <div><span>Total</span><strong>${formatMoney(d.total)}</strong></div>
            <div><span>Já pago</span><strong>${formatMoney(d.paid)}</strong></div>
            <div><span>Saldo</span><strong>${formatMoney(balance)}</strong></div>
            <div><span>Planejado este mês</span><strong>${formatMoney(d.plannedThisMonth)}</strong></div>
            ${!settled ? `<div><span>Depois do pagamento planejado</span><strong>${formatMoney(afterPlan)}</strong></div>` : ""}
          </div>
          <div class="debt-actions">
            ${!settled ? `<button type="button" class="btn btn-primary btn-sm" data-pay-debt="${d.id}">Registrar pagamento</button>` : ""}
            <button type="button" class="btn btn-secondary btn-sm" data-edit-debt="${d.id}">Editar</button>
            <button type="button" class="btn btn-danger btn-sm" data-del-debt="${d.id}">Excluir</button>
          </div>
        </article>`;
      })
      .join("");
  }

  function renderSettings() {
    document.getElementById("cfg-salary").value = moneyInputValue(state.settings.salary);
    document.getElementById("cfg-other-income").value = moneyInputValue(state.settings.otherIncome);
    document.getElementById("cfg-invest-pct").value = state.settings.investPercent;
    document.getElementById("cfg-invest-label").textContent = `${state.settings.investPercent}%`;
    renderCategoryList();
  }

  function renderCategoryList() {
    const list = document.getElementById("category-list");
    list.innerHTML = state.settings.categories
      .map(
        (c) => `
      <li data-cat-id="${c.id}">
        <span class="dot" style="background:${c.color}"></span>
        <span class="name">${escapeHtml(c.name)}</span>
        <button type="button" class="link-btn" data-edit-cat="${c.id}">Editar</button>
        <button type="button" class="link-btn danger" data-del-cat="${c.id}">Excluir</button>
      </li>`
      )
      .join("");
  }

  function fillCategorySelect(select, withAll) {
    const current = select.value;
    const options = state.settings.categories
      .map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`)
      .join("");
    select.innerHTML = (withAll ? `<option value="all">Todas</option>` : "") + options;
    if ([...select.options].some((o) => o.value === current)) select.value = current;
  }

  function moneyInputValue(n) {
    if (!n) return "";
    return Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ---------- Modals ----------

  function openModal(id) {
    document.getElementById(id).classList.remove("hidden");
  }

  function closeModal(id) {
    document.getElementById(id).classList.add("hidden");
  }

  function openExpenseModal(expense = null) {
    fillCategorySelect(document.getElementById("expense-category"), false);
    const form = document.getElementById("form-expense");
    form.reset();
    document.getElementById("expense-id").value = expense ? expense.id : "";
    document.getElementById("expense-modal-title").textContent = expense ? "Editar despesa" : "Adicionar despesa";
    document.querySelector("#form-expense button[type=submit]").textContent = expense
      ? "Salvar alterações"
      : "Adicionar despesa";

    if (expense) {
      document.getElementById("expense-desc").value = expense.description;
      document.getElementById("expense-value").value = moneyInputValue(expense.value);
      document.getElementById("expense-category").value = expense.categoryId;
      document.getElementById("expense-date").value = expense.date;
      document.querySelector(`input[name="expense-type"][value="${expense.type}"]`).checked = true;
      document.getElementById("expense-recurring").checked = Boolean(expense.recurring);
    } else {
      document.getElementById("expense-date").value = todayISO();
      document.querySelector('input[name="expense-type"][value="variavel"]').checked = true;
      document.getElementById("expense-recurring").checked = false;
    }

    toggleRecurringOption();
    openModal("modal-expense");
    document.getElementById("expense-desc").focus();
  }

  function toggleRecurringOption() {
    const isFixed = document.querySelector('input[name="expense-type"]:checked')?.value === "fixo";
    document.getElementById("recurring-wrap").classList.toggle("hidden", !isFixed);
    if (!isFixed) document.getElementById("expense-recurring").checked = false;
  }

  function openDebtModal(debt = null) {
    const form = document.getElementById("form-debt");
    form.reset();
    document.getElementById("debt-id").value = debt ? debt.id : "";
    document.getElementById("debt-modal-title").textContent = debt ? "Editar dívida" : "Adicionar dívida";

    if (debt) {
      document.getElementById("debt-creditor").value = debt.creditor;
      document.getElementById("debt-total").value = moneyInputValue(debt.total);
      document.getElementById("debt-paid").value = moneyInputValue(debt.paid);
      document.getElementById("debt-planned").value = moneyInputValue(debt.plannedThisMonth);
      document.getElementById("debt-desc").value = debt.description || "";
    }

    openModal("modal-debt");
    document.getElementById("debt-creditor").focus();
  }

  function openPaymentModal(debtId) {
    const debt = state.debts.find((d) => d.id === debtId);
    if (!debt) return;
    const balance = debtBalance(debt);
    document.getElementById("payment-debt-id").value = debt.id;
    document.getElementById("payment-debt-info").textContent =
      `${debt.creditor} — saldo atual: ${formatMoney(balance)}`;
    document.getElementById("payment-value").value = moneyInputValue(
      Math.min(debt.plannedThisMonth || balance, balance)
    );
    openModal("modal-payment");
    document.getElementById("payment-value").focus();
  }

  // ---------- CRUD ----------

  function upsertExpense(data) {
    if (state.isDemo) {
      leaveDemoMode();
      data = { ...data, id: "" }; // new expense on clean slate
    }

    const existing = data.id ? state.expenses.find((e) => e.id === data.id) : null;
    const recurringGroupId =
      data.recurring
        ? existing?.recurringGroupId || existing?.id || uid()
        : null;

    const payload = {
      id: existing ? existing.id : uid(),
      description: data.description,
      value: data.value,
      categoryId: data.categoryId,
      type: data.type,
      date: data.date,
      recurring: data.type === "fixo" && data.recurring,
      recurringGroupId,
      demo: false,
    };

    if (existing) {
      Object.assign(existing, payload);
      // Sync future recurring copies in the same group when editing a recurring fixed expense
      if (payload.recurring && payload.recurringGroupId) {
        state.expenses.forEach((e) => {
          if (
            e.id !== existing.id &&
            e.recurringGroupId === payload.recurringGroupId &&
            monthFromDate(e.date) > monthFromDate(payload.date)
          ) {
            e.description = payload.description;
            e.value = payload.value;
            e.categoryId = payload.categoryId;
            e.type = "fixo";
            e.recurring = true;
          }
        });
      }
    } else {
      state.expenses.push(payload);
    }

    saveState();
  }

  function deleteExpense(id) {
    const expense = state.expenses.find((e) => e.id === id);
    if (!expense) return;

    if (expense.recurring && expense.recurringGroupId) {
      const alsoFuture = confirm(
        "Esta é uma despesa recorrente. Deseja excluir também as repetições nos próximos meses?"
      );
      if (alsoFuture) {
        const month = monthFromDate(expense.date);
        state.expenses = state.expenses.filter((e) => {
          if (e.id === id) return false;
          if (e.recurringGroupId === expense.recurringGroupId && monthFromDate(e.date) >= month) {
            return false;
          }
          return true;
        });
      } else {
        state.expenses = state.expenses.filter((e) => e.id !== id);
      }
    } else {
      state.expenses = state.expenses.filter((e) => e.id !== id);
    }

    saveState();
    toast("Despesa excluída");
  }

  function upsertDebt(data) {
    if (state.isDemo) {
      leaveDemoMode();
      data = { ...data, id: "" };
    }

    let paid = Math.max(0, data.paid);
    const total = Math.max(0, data.total);
    paid = Math.min(paid, total);

    const existing = data.id ? state.debts.find((d) => d.id === data.id) : null;
    const payload = {
      id: existing ? existing.id : uid(),
      creditor: data.creditor,
      description: data.description,
      total,
      paid,
      plannedThisMonth: paid >= total ? 0 : Math.max(0, data.plannedThisMonth),
      demo: false,
    };

    if (existing) Object.assign(existing, payload);
    else state.debts.push(payload);

    saveState();
  }

  function deleteDebt(id) {
    if (!confirm("Excluir esta dívida e o histórico de pagamentos relacionados?")) return;
    state.debts = state.debts.filter((d) => d.id !== id);
    state.payments = state.payments.filter((p) => p.debtId !== id);
    saveState();
    toast("Dívida excluída");
  }

  function registerPayment(debtId, value) {
    if (state.isDemo) {
      toast("Use “Começar com meus dados” ou cadastre sua própria dívida primeiro.");
      return;
    }

    const debt = state.debts.find((d) => d.id === debtId);
    if (!debt) return;

    const balance = debtBalance(debt);
    let amount = Math.max(0, value);
    if (amount <= 0) {
      toast("Informe um valor válido");
      return;
    }
    if (amount > balance) amount = balance;

    state.payments.push({
      id: uid(),
      debtId,
      value: amount,
      date: todayISO(),
      demo: false,
    });

    debt.paid = Math.min(debt.total, debt.paid + amount);
    // Reduce remaining planned for the month by what was paid (never below 0)
    debt.plannedThisMonth = Math.max(0, (Number(debt.plannedThisMonth) || 0) - amount);
    if (debt.paid >= debt.total) {
      debt.paid = debt.total;
      debt.plannedThisMonth = 0;
    }

    saveState();
    toast(debtBalance(debt) <= 0 ? "Dívida quitada! ✅" : "Pagamento registrado");
  }

  function leaveDemoMode(preserveAction) {
    if (!state.isDemo) return;
    // Never mix demo data with real user data
    const next = createEmptyState();
    if (typeof preserveAction === "function") {
      state = next;
      preserveAction();
    } else {
      state = next;
    }
    state.isDemo = false;
    saveState();
  }

  function startWithRealData() {
    if (!confirm("Isso apaga os dados de demonstração. Continuar?")) return;
    state = createEmptyState();
    saveState();
    selectedMonth = currentMonthKey();
    toast("Pronto! Comece cadastrando sua renda e despesas.");
    setActivePage("config");
  }

  // ---------- Export / Import ----------

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = todayISO().replace(/-/g, "");
    a.href = url;
    a.download = `financas-backup-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast("Backup exportado");
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed || typeof parsed !== "object") throw new Error("Arquivo inválido");
        if (!parsed.settings && !parsed.expenses && !parsed.debts) {
          throw new Error("Formato de backup não reconhecido");
        }
        if (!confirm("Importar este backup? Os dados atuais serão substituídos.")) return;
        state = normalizeState(parsed);
        state.isDemo = false;
        saveState();
        selectedMonth = currentMonthKey();
        toast("Dados importados com sucesso");
        setActivePage("inicio");
      } catch {
        toast("Não foi possível importar este arquivo");
      }
    };
    reader.readAsText(file);
  }

  function clearAllData() {
    if (!confirm("Apagar TODOS os dados deste navegador? Esta ação não pode ser desfeita.")) return;
    if (!confirm("Confirma definitivamente a exclusão?")) return;
    state = createEmptyState();
    saveState();
    selectedMonth = currentMonthKey();
    toast("Todos os dados foram apagados");
    setActivePage("inicio");
  }

  // ---------- Events ----------

  function bindEvents() {
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.addEventListener("click", () => setActivePage(btn.dataset.page));
    });

    document.getElementById("month-select").addEventListener("change", (e) => {
      selectedMonth = e.target.value || currentMonthKey();
      document.getElementById("expense-month-filter").value = selectedMonth;
      renderDashboard();
    });

    document.getElementById("btn-start-real").addEventListener("click", startWithRealData);

    document.getElementById("btn-add-expense").addEventListener("click", () => openExpenseModal());
    document.getElementById("fab-add-expense").addEventListener("click", () => openExpenseModal());
    document.getElementById("btn-add-debt").addEventListener("click", () => openDebtModal());

    document.querySelectorAll("[data-close]").forEach((btn) => {
      btn.addEventListener("click", () => closeModal(btn.dataset.close));
    });

    document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
      backdrop.addEventListener("click", (e) => {
        if (e.target === backdrop) closeModal(backdrop.id);
      });
    });

    document.querySelectorAll('input[name="expense-type"]').forEach((radio) => {
      radio.addEventListener("change", toggleRecurringOption);
    });

    document.getElementById("form-expense").addEventListener("submit", (e) => {
      e.preventDefault();
      const id = document.getElementById("expense-id").value;
      const description = document.getElementById("expense-desc").value.trim();
      const value = parseMoney(document.getElementById("expense-value").value);
      const categoryId = document.getElementById("expense-category").value;
      const type = document.querySelector('input[name="expense-type"]:checked').value;
      const date = document.getElementById("expense-date").value;
      const recurring = document.getElementById("expense-recurring").checked;

      if (!description || value <= 0 || !date) {
        toast("Preencha descrição, valor e data");
        return;
      }

      upsertExpense({ id, description, value, categoryId, type, date, recurring });
      closeModal("modal-expense");
      toast(id ? "Despesa atualizada" : "Despesa adicionada");
      selectedMonth = monthFromDate(date);
      document.getElementById("expense-month-filter").value = selectedMonth;
      const active = document.querySelector(".page.active")?.id?.replace("page-", "") || "despesas";
      renderPage(active === "inicio" ? "inicio" : "despesas");
    });

    document.getElementById("expense-list").addEventListener("click", (e) => {
      const editId = e.target.dataset.editExpense;
      const delId = e.target.dataset.delExpense;
      if (editId) {
        const expense = state.expenses.find((x) => x.id === editId);
        if (expense) openExpenseModal(expense);
      }
      if (delId) {
        if (confirm("Excluir esta despesa?")) {
          deleteExpense(delId);
          renderExpenses();
        }
      }
    });

    ["expense-month-filter", "expense-category-filter", "expense-type-filter"].forEach((id) => {
      document.getElementById(id).addEventListener("change", renderExpenses);
    });
    document.getElementById("expense-search").addEventListener("input", renderExpenses);

    document.getElementById("form-debt").addEventListener("submit", (e) => {
      e.preventDefault();
      const id = document.getElementById("debt-id").value;
      const creditor = document.getElementById("debt-creditor").value.trim();
      const total = parseMoney(document.getElementById("debt-total").value);
      const paid = parseMoney(document.getElementById("debt-paid").value);
      const plannedThisMonth = parseMoney(document.getElementById("debt-planned").value);
      const description = document.getElementById("debt-desc").value.trim();

      if (!creditor || total <= 0) {
        toast("Informe para quem deve e o valor total");
        return;
      }

      upsertDebt({ id, creditor, total, paid, plannedThisMonth, description });
      closeModal("modal-debt");
      toast(id ? "Dívida atualizada" : "Dívida adicionada");
      renderDebts();
    });

    document.getElementById("debt-list").addEventListener("click", (e) => {
      const payId = e.target.dataset.payDebt;
      const editId = e.target.dataset.editDebt;
      const delId = e.target.dataset.delDebt;
      if (payId) openPaymentModal(payId);
      if (editId) {
        const debt = state.debts.find((d) => d.id === editId);
        if (debt) openDebtModal(debt);
      }
      if (delId) {
        deleteDebt(delId);
        renderDebts();
      }
    });

    document.getElementById("form-payment").addEventListener("submit", (e) => {
      e.preventDefault();
      const debtId = document.getElementById("payment-debt-id").value;
      const value = parseMoney(document.getElementById("payment-value").value);
      registerPayment(debtId, value);
      closeModal("modal-payment");
      renderDebts();
    });

    document.getElementById("btn-save-income").addEventListener("click", () => {
      const salary = parseMoney(document.getElementById("cfg-salary").value);
      const otherIncome = parseMoney(document.getElementById("cfg-other-income").value);
      if (state.isDemo) leaveDemoMode();
      state.settings.salary = salary;
      state.settings.otherIncome = otherIncome;
      saveState();
      toast("Renda salva");
      renderSettings();
    });

    document.getElementById("cfg-invest-pct").addEventListener("input", (e) => {
      const pct = Number(e.target.value) || 0;
      state.settings.investPercent = pct;
      document.getElementById("cfg-invest-label").textContent = `${pct}%`;
      saveState();
    });

    document.getElementById("btn-add-category").addEventListener("click", () => {
      const name = document.getElementById("new-category-name").value.trim();
      const color = document.getElementById("new-category-color").value;
      if (!name) {
        toast("Digite o nome da categoria");
        return;
      }
      if (state.isDemo) leaveDemoMode();
      state.settings.categories.push({ id: uid(), name, color });
      document.getElementById("new-category-name").value = "";
      saveState();
      renderCategoryList();
      toast("Categoria adicionada");
    });

    document.getElementById("category-list").addEventListener("click", (e) => {
      const editId = e.target.dataset.editCat;
      const delId = e.target.dataset.delCat;

      if (editId) {
        const cat = state.settings.categories.find((c) => c.id === editId);
        if (!cat) return;
        const name = prompt("Novo nome da categoria:", cat.name);
        if (name == null) return;
        const trimmed = name.trim();
        if (!trimmed) return;
        cat.name = trimmed;
        const color = prompt("Cor (hex):", cat.color);
        if (color && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color.trim())) {
          cat.color = color.trim();
        }
        saveState();
        renderCategoryList();
      }

      if (delId) {
        if (state.settings.categories.length <= 1) {
          toast("Mantenha ao menos uma categoria");
          return;
        }
        if (!confirm("Excluir esta categoria? Despesas existentes ficarão em Outros.")) return;
        const fallback = state.settings.categories.find((c) => c.id === "outros")?.id
          || state.settings.categories.find((c) => c.id !== delId)?.id;
        state.settings.categories = state.settings.categories.filter((c) => c.id !== delId);
        state.expenses.forEach((exp) => {
          if (exp.categoryId === delId) exp.categoryId = fallback;
        });
        saveState();
        renderCategoryList();
        toast("Categoria excluída");
      }
    });

    document.getElementById("btn-export").addEventListener("click", exportData);
    document.getElementById("btn-import").addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (file) importData(file);
      e.target.value = "";
    });
    document.getElementById("btn-clear-data").addEventListener("click", clearAllData);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        ["modal-expense", "modal-debt", "modal-payment"].forEach(closeModal);
      }
    });
  }

  // ---------- Self-checks (console) ----------

  function runSelfChecks() {
    const income = 5000;
    const gastos = 3000;
    const dividas = 500;
    const livre = income - gastos - dividas;
    const invest = Math.max(0, livre * 0.5);
    console.assert(livre === 1500, "Valor livre esperado 1500");
    console.assert(invest === 750, "Sugestão investimento esperada 750");
    console.assert(Math.max(0, -100 * 0.5) === 0, "Não sugerir investimento com livre negativo");

    // Double-count guard: payments must not appear as expenses
    const sample = createEmptyState();
    sample.settings.salary = 5000;
    sample.debts = [{ id: "d1", creditor: "X", description: "", total: 1000, paid: 0, plannedThisMonth: 200, demo: false }];
    sample.payments = [];
    sample.expenses = [];
    const prevState = state;
    state = sample;
    const s1 = getMonthSummary(currentMonthKey());
    console.assert(s1.dividasPlanejadas === 200, "Planejado deve impactar");
    console.assert(s1.totalGastos === 0, "Pagamento de dívida não deve virar despesa");
    state = prevState;
  }

  // ---------- Init ----------

  function init() {
    loadState();
    selectedMonth = currentMonthKey();
    document.getElementById("month-select").value = selectedMonth;
    document.getElementById("expense-month-filter").value = selectedMonth;
    bindEvents();
    document.getElementById("fab-add-expense").classList.add("hidden");
    setActivePage("inicio");
    runSelfChecks();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
