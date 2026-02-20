import useEnterpriseStore from '../store/enterpriseStore'
import EnterpriseCostPage from './EnterpriseCostPage'

const EnterpriseFinancial = () => {
  const { financialCosts, addFinancialCost, updateFinancialCost, deleteFinancialCost } = useEnterpriseStore()

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  const columns = [
    { key: 'name', label: 'Cost Name', className: 'name-cell' },
    { key: 'category', label: 'Type', className: 'category-cell' },
    { key: 'principal', label: 'Principal', className: 'cost-cell',
      render: (val) => val ? formatCurrency(val) : '-'
    },
    { key: 'rate', label: 'Rate',
      render: (val) => val ? `${val}%` : '-'
    },
    { key: 'amount', label: 'Monthly Cost', format: 'currency', className: 'cost-cell' },
    { key: 'description', label: 'Description', className: 'desc-cell' },
  ]

  const formFields = [
    { key: 'name', label: 'Cost Name', type: 'text', required: true, placeholder: 'e.g., Bank Loan Interest' },
    { key: 'category', label: 'Type', type: 'select', required: true, options: [
      { value: 'Interest', label: 'Interest' },
      { value: 'Fees', label: 'Bank Fees' },
      { value: 'FX', label: 'Foreign Exchange' },
      { value: 'Factoring', label: 'Factoring' },
      { value: 'Other', label: 'Other' },
    ]},
    { key: 'principal', label: 'Principal Amount ($)', type: 'number', step: '0.01', placeholder: 'For loans/credit' },
    { key: 'rate', label: 'Annual Interest Rate (%)', type: 'number', step: '0.1', placeholder: 'e.g., 6.5' },
    { key: 'amount', label: 'Monthly Cost ($)', type: 'number', required: true, step: '0.01', placeholder: '0.00' },
    { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Brief description of this financial cost' },
  ]

  const calculateTotal = (costs) => costs.reduce((sum, c) => sum + c.amount, 0)

  return (
    <EnterpriseCostPage
      title="Financial Costs"
      subtitle="Interest payments, bank fees, and financing costs"
      costType="Financial Cost"
      costs={financialCosts}
      columns={columns}
      onAdd={addFinancialCost}
      onUpdate={updateFinancialCost}
      onDelete={deleteFinancialCost}
      calculateTotal={calculateTotal}
      addFormFields={formFields}
      color="#8e44ad"
    />
  )
}

export default EnterpriseFinancial
