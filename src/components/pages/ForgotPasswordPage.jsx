import { useEffect, useState } from 'react'
import AuthPageLayout from '../auth/AuthPageLayout'
import AuthToast from '../auth/AuthToast'
import BrandLogo from '../common/BrandLogo'
import { RouterLink } from '../router/AppRouter'
import { routes } from '../router/routes'
import { forgotPassword } from '../../services/api'

export default function ForgotPasswordPage() {
  const [feedback, setFeedback] = useState('')
  const [feedbackType, setFeedbackType] = useState('success')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resetToken, setResetToken] = useState('')

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
    setResetToken('')

    try {
      setIsSubmitting(true)

      const form = event.currentTarget
      const formData = new FormData(form)
      const email = String(formData.get('forgot-email') || '').trim()
      const response = await forgotPassword({ email })

      form.reset()
      setFeedbackType('success')
      setFeedback(
        response.message ||
          'If an account exists for this email, a password reset link has been generated.',
      )

      if (response.resetToken && window.location.hostname === 'localhost') {
        setResetToken(response.resetToken)
      }
    } catch (error) {
      setFeedbackType('error')
      setFeedback(error.message || 'Something went wrong.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthPageLayout config={{ mode: 'forgot-password' }}>
      <AuthToast
        feedback={feedback}
        feedbackType={feedbackType}
        onClose={() => setFeedback('')}
      />

      <article className="auth-card">
        <div className="auth-card__header">
          <BrandLogo tone="dark" subtitle="Password recovery" />
          <span className="eyebrow">Access recovery</span>
          <h1>Forgot your password?</h1>
          <p>
            Enter your email address and we will generate a password reset
            link for your account.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-form__grid">
            <label className="auth-field auth-field--full" htmlFor="forgot-email">
              <span>Email</span>
              <input
                id="forgot-email"
                name="forgot-email"
                type="email"
                placeholder="name@avocarbon.com"
                autoComplete="email"
                required
              />
            </label>
          </div>

          <p className="auth-form__hint">
            If the email exists in the platform, a reset workflow will be
            prepared for this account.
          </p>

          <button
            type="submit"
            className="button button-primary auth-form__submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Generating reset link...' : 'Send reset instructions'}
          </button>
        </form>

        {resetToken ? (
          <div className="auth-support-panel">
            <p>
              A reset token was returned by the API in this local environment.
              You can continue directly to the reset form.
            </p>
            <RouterLink
              to={routes.getResetPassword(resetToken)}
              className="button button-ghost auth-support-panel__action"
            >
              Open reset password form
            </RouterLink>
          </div>
        ) : null}

        <div className="auth-card__footer">
          <span>Remembered your password?</span>
          <RouterLink to={routes.signIn} className="text-link auth-footer-link">
            Back to sign in
          </RouterLink>
        </div>
      </article>
    </AuthPageLayout>
  )
}
