import AuthFormCard from './AuthFormCard'
import './auth.css'

export default function AuthPageLayout({ children, config, submitAction }) {
  return (
    <main className={`auth-page auth-page--${config.mode}`}>
      <div className="auth-page__accent auth-page__accent--blue" aria-hidden="true" />
      <div className="auth-page__accent auth-page__accent--orange" aria-hidden="true" />

      <div className="page-container auth-page__layout">
        <div className="auth-page__shell">
          {children || <AuthFormCard config={config} submitAction={submitAction} />}
        </div>
      </div>
    </main>
  )
}
