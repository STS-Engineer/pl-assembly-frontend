export const routes = {
  signIn: '/',
  signUp: '/signup',
  workspace: '/workspace',
  workspaceSection: '/workspace/:sectionId',
  workspaceDashboard: '/workspace/dashboard',
  workspaceCosting: '/workspace/costing',
  workspaceProductDevelopment: '/workspace/product-development',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password/:token',
  approveSubElement: '/approve-sub-element/:token',
  getWorkspaceSection(sectionId) {
    return `/workspace/${encodeURIComponent(sectionId)}`
  },
  getResetPassword(token) {
    return `/reset-password/${encodeURIComponent(token)}`
  },
  getApproveSubElement(token) {
    return `/approve-sub-element/${encodeURIComponent(token)}`
  },
}
