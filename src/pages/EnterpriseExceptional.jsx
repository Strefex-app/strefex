import useEnterpriseStore from '../store/enterpriseStore'
import EnterpriseCostPage from './EnterpriseCostPage'

const EnterpriseExceptional = () => {
  const { exceptionalCosts, addExceptionalCost, updateExceptionalCost, deleteExceptionalCost } = useEnterpriseStore()

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  const columns = [
    { key: 'name', label: 'Cost Name', className: 'name-cell' },
    { key: 'category', label: 'Category', className: 'category-cell' },
    { key: 'date', label: 'Date', render: (val) => val || 'Provisioned' },
    { key: 'status', label: 'Status',
      render: (val) => (
        <span className={`status-badge ${val}`}>
          {val === 'resolved' ? 'Resolved' : val === 'provisioned' ? 'Provisioned' : 'Active'}
        </span>
      )
    },
    { key: 'amount', label: 'Amount', className: 'cost-cell',
      render: (val, cost) => formatCurrency(cost.provision || val || 0)
    },
    { key: 'description', label: 'Description', className: 'desc-cell' },
  ]

  const formFields = [
    { key: 'name', label: 'Cost Name', type: 'text', required: true, placeholder: 'e.g., Equipment Breakdown' },
    { key: 'category', label: 'Category', type: 'select', required: true, options: [
      { value: 'Emergency', label: 'Emergency' },
      { value: 'Quality', label: 'Quality Issue' },
      { value: 'Legal', label: 'Legal' },
      { value: 'Compliance', label: 'Compliance' },
      { value: 'Other', label: 'Other' },
    ]},
    { key: 'status', label: 'Status', type: 'select', required: true, options: [
      { value: 'active', label: 'Active' },
      { value: 'resolved', label: 'Resolved' },
      { value: 'provisioned', label: 'Provisioned' },
    ]},
    { key: 'date', label: 'Date (if occurred)', type: 'date' },
    { key: 'amount', label: 'Actual Amount ($)', type: 'number', step: '0.01', placeholder: 'If resolved/active' },
    { key: 'provision', label: 'Provision Amount ($)', type: 'number', step: '0.01', placeholder: 'If provisioned' },
    { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Description of the exceptional cost' },
  ]

  const calculateTotal = (costs) => {
    return costs.reduce((sum, c) => sum + (c.amount || c.provision || 0), 0)
  }

  return (
    <EnterpriseCostPage
      title="Exceptional Costs"
      subtitle="Non-recurring, emergency, and extraordinary costs"
      costType="Exceptional Cost"
      costs={exceptionalCosts}
      columns={columns}
      onAdd={addExceptionalCost}
      onUpdate={updateExceptionalCost}
      onDelete={deleteExceptionalCost}
      totalLabel="Total (Actual + Provisions)"
      calculateTotal={calculateTotal}
      addFormFields={formFields}
      color="#c0392b"
    />
  )
}

export default EnterpriseExceptional
