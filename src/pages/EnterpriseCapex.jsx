import useEnterpriseStore from '../store/enterpriseStore'
import EnterpriseCostPage from './EnterpriseCostPage'

const EnterpriseCapex = () => {
  const { capex, addCapex, updateCapex, deleteCapex } = useEnterpriseStore()

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  const columns = [
    { key: 'name', label: 'Asset Name', className: 'name-cell' },
    { key: 'category', label: 'Category', className: 'category-cell' },
    { key: 'amount', label: 'Total Value', format: 'currency', className: 'cost-cell' },
    { key: 'usefulLife', label: 'Useful Life', render: (val) => `${val} years` },
    { key: 'yearAcquired', label: 'Year' },
    { key: 'monthlyDepr', label: 'Monthly Depr.', className: 'cost-cell',
      render: (_, cost) => formatCurrency(cost.amount / (cost.usefulLife * 12))
    },
  ]

  const formFields = [
    { key: 'name', label: 'Asset Name', type: 'text', required: true, placeholder: 'e.g., CNC Machine' },
    { key: 'category', label: 'Category', type: 'select', required: true, options: [
      { value: 'Equipment', label: 'Equipment' },
      { value: 'Facilities', label: 'Facilities' },
      { value: 'IT', label: 'IT Infrastructure' },
      { value: 'Vehicles', label: 'Vehicles' },
      { value: 'Other', label: 'Other' },
    ]},
    { key: 'amount', label: 'Total Asset Value ($)', type: 'number', required: true, step: '0.01', placeholder: '0.00' },
    { key: 'usefulLife', label: 'Useful Life (years)', type: 'number', required: true, step: '1', placeholder: 'e.g., 10' },
    { key: 'yearAcquired', label: 'Year Acquired', type: 'number', required: true, placeholder: 'e.g., 2026' },
    { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Brief description of this capital asset' },
  ]

  const calculateTotal = (costs) => {
    return costs.reduce((sum, c) => sum + (c.amount / (c.usefulLife * 12)), 0)
  }

  return (
    <EnterpriseCostPage
      title="Capital Expenditures (CAPEX)"
      subtitle="Long-term asset investments and their depreciation"
      costType="Capital Asset"
      costs={capex}
      columns={columns}
      onAdd={addCapex}
      onUpdate={updateCapex}
      onDelete={deleteCapex}
      totalLabel="Monthly Depreciation"
      calculateTotal={calculateTotal}
      addFormFields={formFields}
      color="#34495e"
    />
  )
}

export default EnterpriseCapex
