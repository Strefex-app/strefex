import useEnterpriseStore from '../store/enterpriseStore'
import EnterpriseCostPage from './EnterpriseCostPage'

const EnterpriseSemiVariableCosts = () => {
  const { semiVariableCosts, addSemiVariableCost, updateSemiVariableCost, deleteSemiVariableCost, config } = useEnterpriseStore()

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  const columns = [
    { key: 'name', label: 'Cost Name', className: 'name-cell' },
    { key: 'category', label: 'Category', className: 'category-cell' },
    { key: 'fixedAmount', label: 'Fixed Portion', format: 'currency', className: 'cost-cell' },
    { key: 'variableRate', label: 'Variable Rate', className: 'cost-cell', render: (val) => `${formatCurrency(val)}/unit` },
    { key: 'description', label: 'Description', className: 'desc-cell' },
  ]

  const formFields = [
    { key: 'name', label: 'Cost Name', type: 'text', required: true, placeholder: 'e.g., Electricity' },
    { key: 'category', label: 'Category', type: 'select', required: true, options: [
      { value: 'Utilities', label: 'Utilities' },
      { value: 'Equipment', label: 'Equipment' },
      { value: 'Production', label: 'Production' },
      { value: 'Support', label: 'Support' },
      { value: 'Other', label: 'Other' },
    ]},
    { key: 'fixedAmount', label: 'Fixed Monthly Amount ($)', type: 'number', required: true, step: '0.01', placeholder: '0.00' },
    { key: 'variableRate', label: 'Variable Rate ($/unit)', type: 'number', required: true, step: '0.01', placeholder: '0.00' },
    { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Brief description of this cost' },
  ]

  const calculateTotal = (costs) => {
    return costs.reduce((sum, c) => {
      return sum + c.fixedAmount + (c.variableRate * config.monthlyProductionUnits)
    }, 0)
  }

  return (
    <EnterpriseCostPage
      title="Semi-Variable Costs"
      subtitle="Costs with both fixed and variable components"
      costType="Semi-Variable Cost"
      costs={semiVariableCosts}
      columns={columns}
      onAdd={addSemiVariableCost}
      onUpdate={updateSemiVariableCost}
      onDelete={deleteSemiVariableCost}
      totalLabel="Est. Monthly Total"
      calculateTotal={calculateTotal}
      addFormFields={formFields}
      color="#9b59b6"
    />
  )
}

export default EnterpriseSemiVariableCosts
