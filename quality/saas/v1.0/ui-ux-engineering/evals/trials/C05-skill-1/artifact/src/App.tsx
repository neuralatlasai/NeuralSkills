import { useState } from "react";

const invoices = [
  {
    id: "INV-2041", client: "Northline Studio", total: "$1,200", due: "18 June 2026",
    status: "Scheduled",
    payments: [
      { date: "18 June 2026", amount: "$400" },
      { date: "18 July 2026", amount: "$400" },
      { date: "18 August 2026", amount: "$400" }
    ]
  },
  {
    id: "INV-2042", client: "Pebble Workshop", total: "$900", due: "22 June 2026",
    status: "Scheduled",
    payments: [
      { date: "22 June 2026", amount: "$300" },
      { date: "22 July 2026", amount: "$300" },
      { date: "22 August 2026", amount: "$300" }
    ]
  },
  {
    id: "INV-2043", client: "Stillwater Press", total: "$1,500", due: "28 June 2026",
    status: "Scheduled",
    payments: [
      { date: "28 June 2026", amount: "$500" },
      { date: "28 July 2026", amount: "$500" },
      { date: "28 August 2026", amount: "$500" }
    ]
  }
];
export default function App() {
  const [expandedSchedules, setExpandedSchedules] = useState<Record<string, boolean>>({});

  return (
    <div className="shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <a className="brand" href="#main">lilac<span>●</span></a>
        <nav><a href="#overview">Overview</a><a className="active" href="#main" aria-current="page">Billing</a><a href="#settings">Settings</a></nav>
        <p className="sidebar-note">Small business.<br />A little more breathing room.</p>
      </aside>
      <main id="main">
        <header className="page-heading">
          <div><p className="eyebrow">YOUR BUSINESS, IN BALANCE</p><h1>Billing</h1><p className="muted">A clear view of what is coming in.</p></div>
          <span className="period">June 2026</span>
        </header>
        <section className="summary" aria-label="Billing summary">
          <div><p className="muted">Scheduled this month</p><strong>$3,600</strong><span className="summary-note">Across 3 invoices</span></div>
          <div className="summary-accent"><p>Keep plans moving.</p><span>Your next payment arrives on 18 June.</span></div>
        </section>
        <section className="invoice-panel" aria-labelledby="invoices-title">
          <div className="panel-heading"><h2 id="invoices-title">Upcoming invoices</h2><span className="count">3 invoices</span></div>
          <div className="invoice-list">
            {invoices.map(invoice => (
              <article className="invoice-row" key={invoice.id} aria-label={invoice.id}>
                <div className="invoice-identity">
                  <span className="invoice-id">{invoice.id}</span><h3>{invoice.client}</h3><p className="muted">Due {invoice.due}</p>
                  <button
                    type="button"
                    className="schedule-toggle"
                    id={`schedule-toggle-${invoice.id}`}
                    aria-label={`Payment schedule for invoice ${invoice.id}`}
                    aria-expanded={!!expandedSchedules[invoice.id]}
                    aria-controls={`schedule-${invoice.id}`}
                    onClick={() => setExpandedSchedules(current => ({
                      ...current,
                      [invoice.id]: !current[invoice.id]
                    }))}
                  >
                    Payment schedule <span aria-hidden="true">{expandedSchedules[invoice.id] ? "−" : "+"}</span>
                  </button>
                </div>
                <div className="invoice-meta"><strong>{invoice.total}</strong><span className="status">{invoice.status}</span></div>
                <div
                  className="payment-schedule"
                  role="region"
                  id={`schedule-${invoice.id}`}
                  aria-labelledby={`schedule-toggle-${invoice.id}`}
                  hidden={!expandedSchedules[invoice.id]}
                >
                  <p className="schedule-due">Invoice due <strong>{invoice.due}</strong></p>
                  <ol className="schedule-payments">
                    {invoice.payments.map(payment => (
                      <li key={payment.date}><span>{payment.date}</span><strong>{payment.amount}</strong></li>
                    ))}
                  </ol>
                </div>
              </article>
            ))}
          </div>
        </section>
        <p className="footer-note">All amounts shown in USD.</p>
      </main>
    </div>
  );
}

