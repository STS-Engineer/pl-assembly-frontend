export default function CostingBoardState({
  title,
  description,
  actionLabel,
  onAction,
  role = 'status',
}) {
  return (
    <div className="costing-simple__state" role={role}>
      <div className="costing-simple__state-copy">
        <strong>{title}</strong>
        <p>{description}</p>
      </div>

      {actionLabel && onAction ? (
        <div className="costing-simple__state-actions">
          <button type="button" className="button button-ghost" onClick={onAction}>
            {actionLabel}
          </button>
        </div>
      ) : null}
    </div>
  )
}
