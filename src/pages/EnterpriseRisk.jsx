import useEnterpriseStore from '../store/enterpriseStore'
import EnterpriseCostPage from './EnterpriseCostPage'

const EnterpriseRisk = () => {
  const { riskCosts, addRiskCost, updateRiskCost, deleteRiskCost } = useEnterpriseStore()

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  const columns = [
    { key: 'name', label: 'Risk Item', className: 'name-cell' },
    { key: 'category', label: 'Category', className: 'category-cell' },
    { key: 'baseAmount', label: 'Base Amount', className: 'cost-cell',
      render: (val) => val ? formatCurrency(val) : '-'
    },
    { key: 'provisionRate', label: 'Provision %',
      render: (val) => val ? `${val}%` : '-'
    },
    { key: 'monthlyProvision', label: 'Monthly Provision', className: 'cost-cell',
      render: (_, cost) => {
        if (cost.fixedProvision) return formatCurrency(cost.fixedProvision)
        return formatCurrency((cost.baseAmount * cost.provisionRate / 100) / 12)
      }
    },
    { key: 'description', label: 'Description', className: 'desc-cell' },
  ]

  const formFields = [
    { key: 'name', label: 'Risk Item Name', type: 'text', required: true, placeholder: 'e.g., Bad Debt Provision' },
    { key: 'category', label: 'Category', type: 'select', required: true, options: [
      { value: 'Credit', label: 'Credit Risk' },
      { value: 'Product', label: 'Product Warranty' },
      { value: 'Inventory', label: 'Inventory' },
      { value: 'FX', label: 'Foreign Exchange' },
      { value: 'Legal', label: 'Legal/Litigation' },
      { value: 'Operational', label: 'Operational' },
      { value: 'Other', label: 'Other' },
    ]},
    { key: 'baseAmount', label: 'Base Amount ($)', type: 'number', step: '0.01', placeholder: 'e.g., Revenue or asset value' },
    { key: 'provisionRate', label: 'Provision Rate (%)', type: 'number', step: '0.1', placeholder: 'e.g., 2.5' },
    { key: 'fixedProvision', label: 'OR Fixed Annual Provision ($)', type: 'number', step: '0.01', placeholder: 'Use instead of rate' },
    { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Description of this risk provision' },
  ]

  const calculateTotal = (costs) => {
    return costs.reduce((sum, c) => {
      if (c.fixedProvision) return sum + (c.fixedProvision / 12)
      return sum + ((c.baseAmount * c.provisionRate / 100) / 12)
    }, 0)
  }

  return (
    <EnterpriseCostPage
      title="Risk Costs"
      subtitle="Provisions and contingencies for potential risks"
      costType="Risk Provision"
      costs={riskCosts}
      columns={columns}
      onAdd={addRiskCost}
      onUpdate={updateRiskCost}
      onDelete={deleteRiskCost}
      totalLabel="Monthly Risk Provisions"
      calculateTotal={calculateTotal}
      addFormFields={formFields}
      color="#2c3e50"
    />
  )
}

export default EnterpriseRisk
