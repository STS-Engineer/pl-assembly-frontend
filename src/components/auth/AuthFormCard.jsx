import { useEffect, useState } from 'react'
import BrandLogo from '../common/BrandLogo'
import { RouterLink, useRouter } from '../router/AppRouter'
import AuthToast from './AuthToast'
import { saveSession } from '../../services/session'

function renderField(field) {
  return (
    <label
      key={field.id}
      className={`auth-field ${field.width === 'half' ? 'auth-field--half' : 'auth-field--full'}`}
      htmlFor={field.id}
    >
      <span>{field.label}</span>
      <input
        id={field.id}
        name={field.id}
        type={field.type}
        placeholder={field.placeholder}
        autoComplete={field.autoComplete}
        minLength={field.minLength}
        required={field.required ?? true}
      />
    </label>
  )
}

export default function AuthFormCard({ config, submitAction }) {
  const [feedback, setFeedback] = useState('')
  const [feedbackType, setFeedbackType] = useState('success')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const { navigate } = useRouter()

  useEffect(() => {
    if (!feedback) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setFeedback('')
    }, 6000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [feedback])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFeedback('')

    try {
      setIsSubmitting(true)

      const form = event.currentTarget
      const formData = new FormData(form)
      const payload =
        config.mode === 'signup'
          ? {
              full_name: String(formData.get('signup-fullname') || '').trim(),
              fullName: String(formData.get('signup-fullname') || '').trim(),
              email: String(formData.get('signup-email') || '').trim(),
              password: String(formData.get('signup-password') || ''),
            }
          : {
              email: String(formData.get('signin-email') || '').trim(),
              password: String(formData.get('signin-password') || ''),
              rememberMe: rememberMe,
            }

      const response = await submitAction(payload)

      if (config.mode === 'signin') {
        if (response.accessToken) {
          saveSession({
            token: response.accessToken,
            user: response.user,
            expiresIn: response.expiresIn,
          })
        }

        if (response.accessToken && config.successRoute) {
          navigate(config.successRoute)
          return
        }
      } else {
        form.reset()
      }

      setFeedbackType('success')
      setFeedback(config.successMessage || response.message || config.submitMessage)
    } catch (error) {
      setFeedbackType('error')
      setFeedback(error.message || 'Something went wrong.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {feedback ? (
        <AuthToast
          feedback={feedback}
          feedbackType={feedbackType}
          onClose={() => setFeedback('')}
        />
      ) : null}

      <article className="auth-card">
        <div className="auth-card__header">
          <BrandLogo tone="dark" subtitle={config.brandSubtitle} />
          <span className="eyebrow">{config.eyebrow}</span>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-form__grid">
            {config.fields.map((field) => renderField(field))}
          </div>

          <div className="auth-form__meta">
            {config.mode === 'signin' ? (
              <>
                <label className="auth-check" htmlFor="remember-session">
                  <input 
                    id="remember-session" 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Keep me signed in</span>
                </label>
                <RouterLink
                  to={config.forgotPasswordRoute}
                  className="text-link auth-inline-button auth-inline-link"
                >
                  Forgot password?
                </RouterLink>
              </>
            ) : (
              <p className="auth-form__hint">
                {config.formHint || 'This structure is ready to receive your real sign-up logic.'}
              </p>
            )}
          </div>

          <button
            type="submit"
            className="button button-primary auth-form__submit"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? config.mode === 'signup'
                ? 'Creating account...'
                : 'Signing in...'
              : config.submitLabel}
          </button>

        </form>

        <div className="auth-card__footer">
          <span>{config.switchText} </span>
          <RouterLink to={config.switchRoute} className="text-link auth-footer-link">
            {config.switchLabel}
          </RouterLink>
        </div>
      </article>
    </>
  )
}
