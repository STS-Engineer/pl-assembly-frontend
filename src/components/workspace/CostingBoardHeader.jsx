export default function CostingBoardHeader({ totalProjects, boardStats, pluralize }) {
  return (
    <header className="costing-simple__hero">
      <div className="costing-simple__hero-main">
        <div className="costing-simple__copy">
          <span className="costing-simple__kicker">Costing workspace</span>
          <h2>PL Assembly : Costing</h2>
          <p>
            A dedicated workspace to set and manage assembly costs, ensuring accurate pricing
            across every production configuration.
          </p>
        </div>
      </div>

      <div className="costing-simple__stats">
        {boardStats.map((stat) => (
          <article key={stat.label} className="costing-simple__stat">
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </div>
    </header>
  )
}
