export default function BrandLogo({ subtitle, tone = 'light' }) {
  return (
    <div className={`brand-mark brand-mark--${tone}`}>
      <div className="brand-mark__badge">
        <img src="/img/logo.PNG" alt="AVO Carbon Group" />
      </div>
      <div className="brand-mark__copy">
        <span className="brand-mark__title">PL Assembly</span>
        {subtitle ? <span className="brand-mark__subtitle">{subtitle}</span> : null}
      </div>
    </div>
  )
}
