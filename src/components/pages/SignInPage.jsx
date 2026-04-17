import { useEffect } from 'react'
import AuthPageLayout from '../auth/AuthPageLayout'
import { signInConfig } from '../auth/authContent'
import { useRouter } from '../router/AppRouter'
import { routes } from '../router/routes'
import { signIn } from '../../services/api'
import { getSession } from '../../services/session'

export default function SignInPage() {
  const { navigate } = useRouter()

  useEffect(() => {
    if (getSession()?.token) {
      navigate(routes.workspaceDashboard)
    }
  }, [navigate])

  return <AuthPageLayout config={signInConfig} submitAction={signIn} />
}
