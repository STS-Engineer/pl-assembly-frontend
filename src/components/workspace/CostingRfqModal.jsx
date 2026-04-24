import { memo, useEffect } from 'react'

const RFQ_CURRENCY_OPTIONS = ['EUR', 'USD', 'CNY']

export function createEmptyRfqForm(values = {}) {
  return {
    reference: '',
    customerName: '',
    projectName: '',
    productName: '',
    deliveryPlant: '',
    quotationDate: '',
    annualVolume: '',
    targetPrice: '',
    currency: 'EUR',
    // Additional RFQ fields
    scope: '',
    country: '',
    poDate: '',
    ppapDate: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    contactRole: '',
    customerPn: '',
    application: '',
    businessTrigger: '',
    finalRecommendation: '',
    expectedPaymentTerms: '',
    ...values,
  }
}

const CostingRfqModal = memo(function CostingRfqModal({
  modal,
  form,
  errorMessage,
  isSubmitting,
  onRequestClose,
  onSubmit,
  onFieldChange,
}) {
  useEffect(() => {
    if (!modal) {
      return undefined
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onRequestClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [modal, onRequestClose])

  if (!modal) {
    return null
  }

  return (
    <div className="workspace-modal-backdrop" role="presentation" onClick={onRequestClose}>
      <div
        className="workspace-modal costing-simple__modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="costing-rfq-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="workspace-modal__header">
          <span className="eyebrow">Manual RFQ</span>
          <button
            type="button"
            className="workspace-modal__close"
            aria-label="Close manual RFQ dialog"
            onClick={onRequestClose}
            disabled={isSubmitting}
          >
            x
          </button>
        </div>

        <div className="workspace-modal__copy">
          <h2 id="costing-rfq-modal-title">Add RFQ manually</h2>
          <p>Create an RFQ directly from the costing workspace.</p>
        </div>

        <form className="workspace-modal__form" onSubmit={onSubmit}>
          <div className="workspace-modal__grid">
            <label className="workspace-modal__field" htmlFor="manual-rfq-reference">
              <span>RFQ reference</span>
              <input
                id="manual-rfq-reference"
                type="text"
                value={form.reference}
                onChange={(event) => onFieldChange('reference', event.target.value)}
                placeholder="Enter the RFQ reference"
                required
                disabled={isSubmitting}
              />
            </label>

            <label className="workspace-modal__field" htmlFor="manual-rfq-customer">
              <span>Customer</span>
              <input
                id="manual-rfq-customer"
                type="text"
                value={form.customerName}
                onChange={(event) => onFieldChange('customerName', event.target.value)}
                placeholder="Customer name"
                disabled={isSubmitting}
              />
            </label>

            <label className="workspace-modal__field" htmlFor="manual-rfq-project">
              <span>Project name</span>
              <input
                id="manual-rfq-project"
                type="text"
                value={form.projectName}
                onChange={(event) => onFieldChange('projectName', event.target.value)}
                placeholder="Project name"
                disabled={isSubmitting}
              />
            </label>

            <label className="workspace-modal__field" htmlFor="manual-rfq-product">
              <span>Product name</span>
              <input
                id="manual-rfq-product"
                type="text"
                value={form.productName}
                onChange={(event) => onFieldChange('productName', event.target.value)}
                placeholder="Product name"
                required
                disabled={isSubmitting}
              />
            </label>

            <label className="workspace-modal__field" htmlFor="manual-rfq-plant">
              <span>Delivery plant</span>
              <input
                id="manual-rfq-plant"
                type="text"
                value={form.deliveryPlant}
                onChange={(event) => onFieldChange('deliveryPlant', event.target.value)}
                placeholder="Delivery plant"
                disabled={isSubmitting}
              />
            </label>

            <label className="workspace-modal__field" htmlFor="manual-rfq-quotation-date">
              <span>Quotation date</span>
              <input
                id="manual-rfq-quotation-date"
                type="date"
                value={form.quotationDate}
                onChange={(event) => onFieldChange('quotationDate', event.target.value)}
                disabled={isSubmitting}
              />
            </label>

            <label className="workspace-modal__field" htmlFor="manual-rfq-annual-volume">
              <span>Annual volume</span>
              <input
                id="manual-rfq-annual-volume"
                type="number"
                min="0"
                step="1"
                value={form.annualVolume}
                onChange={(event) => onFieldChange('annualVolume', event.target.value)}
                placeholder="Annual volume"
                disabled={isSubmitting}
              />
            </label>

            <label className="workspace-modal__field" htmlFor="manual-rfq-currency">
              <span>Currency</span>
              <select
                id="manual-rfq-currency"
                value={form.currency}
                onChange={(event) => onFieldChange('currency', event.target.value)}
                disabled={isSubmitting}
              >
                {RFQ_CURRENCY_OPTIONS.map((currencyOption) => (
                  <option key={currencyOption} value={currencyOption}>
                    {currencyOption}
                  </option>
                ))}
              </select>
            </label>

            <label className="workspace-modal__field" htmlFor="manual-rfq-target-price">
              <span>Target price</span>
              <input
                id="manual-rfq-target-price"
                type="number"
                min="0"
                step="0.01"
                value={form.targetPrice}
                onChange={(event) => onFieldChange('targetPrice', event.target.value)}
                placeholder="Target price"
                disabled={isSubmitting}
              />
            </label>

            <label className="workspace-modal__field" htmlFor="manual-rfq-scope">
              <span>Scope</span>
              <input
                id="manual-rfq-scope"
                type="text"
                value={form.scope}
                onChange={(event) => onFieldChange('scope', event.target.value)}
                placeholder="Scope (e.g., Yes)"
                disabled={isSubmitting}
              />
            </label>

            <label className="workspace-modal__field" htmlFor="manual-rfq-country">
              <span>Country</span>
              <input
                id="manual-rfq-country"
                type="text"
                value={form.country}
                onChange={(event) => onFieldChange('country', event.target.value)}
                placeholder="Country of delivery"
                disabled={isSubmitting}
              />
            </label>

            <label className="workspace-modal__field" htmlFor="manual-rfq-po-date">
              <span>PO Date</span>
              <input
                id="manual-rfq-po-date"
                type="date"
                value={form.poDate}
                onChange={(event) => onFieldChange('poDate', event.target.value)}
                disabled={isSubmitting}
              />
            </label>

            <label className="workspace-modal__field" htmlFor="manual-rfq-ppap-date">
              <span>PPAP Date</span>
              <input
                id="manual-rfq-ppap-date"
                type="date"
                value={form.ppapDate}
                onChange={(event) => onFieldChange('ppapDate', event.target.value)}
                disabled={isSubmitting}
              />
            </label>

            <label className="workspace-modal__field" htmlFor="manual-rfq-contact-name">
              <span>Contact name</span>
              <input
                id="manual-rfq-contact-name"
                type="text"
                value={form.contactName}
                onChange={(event) => onFieldChange('contactName', event.target.value)}
                placeholder="Contact person name"
                disabled={isSubmitting}
              />
            </label>

            <label className="workspace-modal__field" htmlFor="manual-rfq-contact-email">
              <span>Contact email</span>
              <input
                id="manual-rfq-contact-email"
                type="email"
                value={form.contactEmail}
                onChange={(event) => onFieldChange('contactEmail', event.target.value)}
                placeholder="Contact email address"
                disabled={isSubmitting}
              />
            </label>

            <label className="workspace-modal__field" htmlFor="manual-rfq-contact-phone">
              <span>Contact phone</span>
              <input
                id="manual-rfq-contact-phone"
                type="tel"
                value={form.contactPhone}
                onChange={(event) => onFieldChange('contactPhone', event.target.value)}
                placeholder="Contact phone number"
                disabled={isSubmitting}
              />
            </label>

            <label className="workspace-modal__field" htmlFor="manual-rfq-contact-role">
              <span>Contact role</span>
              <input
                id="manual-rfq-contact-role"
                type="text"
                value={form.contactRole}
                onChange={(event) => onFieldChange('contactRole', event.target.value)}
                placeholder="Contact role (e.g., VP)"
                disabled={isSubmitting}
              />
            </label>

            <label className="workspace-modal__field" htmlFor="manual-rfq-customer-pn">
              <span>Customer part number</span>
              <input
                id="manual-rfq-customer-pn"
                type="text"
                value={form.customerPn}
                onChange={(event) => onFieldChange('customerPn', event.target.value)}
                placeholder="Customer part number"
                disabled={isSubmitting}
              />
            </label>

            <label className="workspace-modal__field" htmlFor="manual-rfq-application">
              <span>Application</span>
              <input
                id="manual-rfq-application"
                type="text"
                value={form.application}
                onChange={(event) => onFieldChange('application', event.target.value)}
                placeholder="Application type"
                disabled={isSubmitting}
              />
            </label>

            <label className="workspace-modal__field" htmlFor="manual-rfq-business-trigger">
              <span>Business trigger</span>
              <input
                id="manual-rfq-business-trigger"
                type="text"
                value={form.businessTrigger}
                onChange={(event) => onFieldChange('businessTrigger', event.target.value)}
                placeholder="Business trigger"
                disabled={isSubmitting}
              />
            </label>

            <label className="workspace-modal__field" htmlFor="manual-rfq-final-recommendation">
              <span>Final recommendation</span>
              <input
                id="manual-rfq-final-recommendation"
                type="text"
                value={form.finalRecommendation}
                onChange={(event) => onFieldChange('finalRecommendation', event.target.value)}
                placeholder="Final recommendation"
                disabled={isSubmitting}
              />
            </label>

            <label className="workspace-modal__field" htmlFor="manual-rfq-payment-terms">
              <span>Expected payment terms</span>
              <input
                id="manual-rfq-payment-terms"
                type="text"
                value={form.expectedPaymentTerms}
                onChange={(event) => onFieldChange('expectedPaymentTerms', event.target.value)}
                placeholder="Payment terms (e.g., 30 days EOM)"
                disabled={isSubmitting}
              />
            </label>
          </div>

          {errorMessage ? (
            <div className="workspace-modal__feedback workspace-modal__feedback--error">
              {errorMessage}
            </div>
          ) : null}

          <div className="workspace-modal__actions">
            <button
              type="button"
              className="button button-ghost"
              onClick={onRequestClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button type="submit" className="button button-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Add RFQ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
})

export default CostingRfqModal
