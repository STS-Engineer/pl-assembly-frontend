import { routes } from '../router/routes'

export const signInConfig = {
  mode: 'signin',
  brandSubtitle: 'Sign in to your workspace',
  eyebrow: 'Secure access',
  title: 'Welcome back',
  description: 'Sign in to access your PL Assembly workspace.',
  submitLabel: 'Sign in',
  successRoute: routes.workspaceDashboard,
  submitMessage:
    'The Sign In design is ready to be connected to your login API.',
  forgotPasswordRoute: routes.forgotPassword,
  switchText: "Don't have an account yet?",
  switchLabel: 'Create an account',
  switchRoute: routes.signUp,
  fields: [
    {
      id: 'signin-email',
      label: 'Email',
      type: 'email',
      placeholder: 'name@avocarbon.com',
      autoComplete: 'email',
      required: true,
      width: 'full',
    },
    {
      id: 'signin-password',
      label: 'Password',
      type: 'password',
      placeholder: 'Your password',
      autoComplete: 'current-password',
      required: true,
      width: 'full',
    },
  ],
}

export const signUpConfig = {
  mode: 'signup',
  brandSubtitle: 'Create a new workspace access',
  eyebrow: 'Account creation',
  title: 'Create your account',
  description: 'Set up a simple access for a new team member.',
  submitLabel: 'Create my account',
  formHint: 'Your request will be reviewed by an administrator after submission.',
  successMessage:
    'Your account request has been submitted successfully. It will be reviewed and approved by an admin, and you will receive an email once your account is approved.',
  submitMessage:
    'The Sign Up design is ready to be connected to your registration API.',
  switchText: 'Already have an account?',
  switchLabel: 'Sign in',
  switchRoute: routes.signIn,
  fields: [
    {
      id: 'signup-fullname',
      label: 'Full name',
      type: 'text',
      placeholder: 'Your full name',
      autoComplete: 'name',
      required: true,
      width: 'full',
    },
    {
      id: 'signup-email',
      label: 'Email',
      type: 'email',
      placeholder: 'name@avocarbon.com',
      autoComplete: 'email',
      required: true,
      width: 'full',
    },
    {
      id: 'signup-password',
      label: 'Password',
      type: 'password',
      placeholder: 'At least 8 characters',
      autoComplete: 'new-password',
      required: true,
      minLength: 8,
      width: 'full',
    },
  ],
}
