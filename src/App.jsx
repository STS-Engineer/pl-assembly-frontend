import { AppRouter, Route, RouteSwitch } from './components/router/AppRouter'
import { routes } from './components/router/routes'
import ForgotPasswordPage from './components/pages/ForgotPasswordPage'
import ResetPasswordPage from './components/pages/ResetPasswordPage'
import SignInPage from './components/pages/SignInPage'
import SignUpPage from './components/pages/SignUpPage'
import WorkspacePage from './components/pages/WorkspacePage'

function App() {
  return (
    <AppRouter>
      <RouteSwitch>
        <Route path={routes.signIn} element={<SignInPage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path={routes.signUp} element={<SignUpPage />} />
        <Route path={routes.workspaceSection} element={<WorkspacePage />} />
        <Route path={routes.workspace} element={<WorkspacePage />} />
        <Route path={routes.forgotPassword} element={<ForgotPasswordPage />} />
        <Route path={routes.resetPassword} element={<ResetPasswordPage />} />
        <Route path="*" element={<SignInPage />} />
      </RouteSwitch>
    </AppRouter>
  )
}

export default App
