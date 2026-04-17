import { useEffect, useState } from 'react'
import AuthPageLayout from '../auth/AuthPageLayout'
import AuthToast from '../auth/AuthToast'
import BrandLogo from '../common/BrandLogo'
import { RouterLink } from '../router/AppRouter'
import { routes } from '../router/routes'
import {
  resetPassword,
  verifyResetPasswordToken,
} from '../../services/api'

export default function ResetPasswordPage({ routeParams = {} }) {
  const [feedback, setFeedback] = useState('')
  const [feedbackType, setFeedbackType] = useState('success')
  const [tokenState, setTokenState] = useState('loading')
  const [tokenMessage, setTokenMessage] = useState('Checking your reset link...')
  const [userEmail, setUserEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const token = routeParams.token || ''

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

  useEffect(() => {
    let isMounted = true

    async function validateToken() {
      if (!token) {
        setTokenState('invalid')
        setTokenMessage('This reset link is missing or invalid.')
        return
      }

      try {
        setTokenState('loading')
        setTokenMessage('Checking your reset link...')

        const response = await verifyResetPasswordToken(token)

        if (!isMounted) {
          return
        }

        setTokenState('valid')
        setTokenMessage(response.message || 'This reset link is valid.')
        setUserEmail(response.user?.email || '')
      } catch (error) {
        if (!isMounted) {
          return
        }

        setTokenState('invalid')
        setTokenMessage(error.message || 'This reset link is invalid or expired.')
      }
    }

    validateToken()

    return () => {
      isMounted = false
    }
  }, [token])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFeedback('')

    const form = event.currentTarget
    const formData = new FormData(form)
    const password = String(formData.get('reset-password') || '')
    const confirmPassword = String(formData.get('reset-password-confirm') || '')

    if (password !== confirmPassword) {
      setFeedbackType('error')
      setFeedback('The password confirmation does not match.')
      return
    }

    try {
      setIsSubmitting(true)

      const response = await resetPassword(token, {
        newPassword: password,
      })

      form.reset()
      setFeedbackType('success')
      setFeedback(
        response.message ||
          'Your password has been reset successfully. You can now sign in.',
      )
      setTokenState('used')
      setTokenMessage('Your password has been updated. This reset link can no longer be used.')
    } catch (error) {
      setFeedbackType('error')
      setFeedback(error.message || 'Something went wrong.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit = tokenState === 'valid'

  return (
    <AuthPageLayout config={{ mode: 'reset-password' }}>
      <AuthToast
        feedback={feedback}
        feedbackType={feedbackType}
        onClose={() => setFeedback('')}
      />

      <article className="auth-card">
        <div className="auth-card__header">
          <BrandLogo tone="dark" subtitle="Password recovery" />
          <span className="eyebrow">Reset access</span>
          <h1>Reset your password</h1>
          <p>
            Create a new password for your account and return to the sign-in
            page once the update is complete.
          </p>
        </div>

        <div
          className={`auth-status-panel auth-status-panel--${
            tokenState === 'invalid' ? 'error' : 'info'
          }`}
        >
          <p>{tokenMessage}</p>
          {userEmail ? <span>{userEmail}</span> : null}
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-form__grid">
            <label className="auth-field auth-field--full" htmlFor="reset-password">
              <span>New password</span>
              <input
                id="reset-password"
                name="reset-password"
                type="password"
                placeholder="At least 6 characters"
                autoComplete="new-password"
                minLength={6}
                required
                disabled={!canSubmit || isSubmitting}
              />
            </label>

            <label
              className="auth-field auth-field--full"
              htmlFor="reset-password-confirm"
            >
              <span>Confirm new password</span>
              <input
                id="reset-password-confirm"
                name="reset-password-confirm"
                type="password"
                placeholder="Repeat your new password"
                autoComplete="new-password"
                minLength={6}
                required
                disabled={!canSubmit || isSubmitting}
              />
            </label>
          </div>

          <p className="auth-form__hint">
            Your new password must contain at least 6 characters.
          </p>

          <button
            type="submit"
            className="button button-primary auth-form__submit"
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? 'Updating password...' : 'Update password'}
          </button>
        </form>

        <div className="auth-card__footer">
          <span>Need another recovery link?</span>
          <RouterLink
            to={routes.forgotPassword}
            className="text-link auth-footer-link"
          >
            Request a new one
          </RouterLink>
        </div>
      </article>
    </AuthPageLayout>
  )
}
