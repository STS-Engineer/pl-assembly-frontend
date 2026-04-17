import AuthPageLayout from '../auth/AuthPageLayout'
import { signUpConfig } from '../auth/authContent'
import { signUp } from '../../services/api'

export default function SignUpPage() {
  return <AuthPageLayout config={signUpConfig} submitAction={signUp} />
}
