import useEnterpriseStore from '../store/enterpriseStore'
import EnterpriseCostPage from './EnterpriseCostPage'

const EnterpriseVariableCosts = () => {
  const { variableCosts, addVariableCost, updateVariableCost, deleteVariableCost, config } = useEnterpriseStore()

  const columns = [
    { key: 'name', label: 'Cost Name', className: 'name-cell' },
    { key: 'category', label: 'Category', className: 'category-cell' },
    { key: 'unitCost', label: 'Cost Per Unit', format: 'currency', className: 'cost-cell' },
    { key: 'unit', label: 'Unit' },
    { key: 'description', label: 'Description', className: 'desc-cell' },
  ]

  const formFields = [
    { key: 'name', label: 'Cost Name', type: 'text', required: true, placeholder: 'e.g., Raw Materials' },
    { key: 'category', label: 'Category', type: 'select', required: true, options: [
      { value: 'Production', label: 'Production' },
      { value: 'Logistics', label: 'Logistics' },
      { value: 'Sales', label: 'Sales' },
      { value: 'Utilities', label: 'Utilities' },
      { value: 'Other', label: 'Other' },
    ]},
    { key: 'unitCost', label: 'Cost Per Unit ($)', type: 'number', required: true, step: '0.01', placeholder: '0.00' },
    { key: 'unit', label: 'Unit Type', type: 'select', required: true, options: [
      { value: 'per unit', label: 'Per Unit' },
      { value: 'per kg', label: 'Per Kilogram' },
      { value: 'per hour', label: 'Per Hour' },
      { value: 'per batch', label: 'Per Batch' },
    ]},
    { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Brief description of this variable cost' },
  ]

  const calculateTotal = (costs) => {
    const totalPerUnit = costs.reduce((sum, c) => sum + c.unitCost, 0)
    return totalPerUnit * config.monthlyProductionUnits
  }

  return (
    <EnterpriseCostPage
      title="Variable Costs"
      subtitle={`Costs that change with production volume (${config.monthlyProductionUnits.toLocaleString()} units/month)`}
      costType="Variable Cost"
      costs={variableCosts}
      columns={columns}
      onAdd={addVariableCost}
      onUpdate={updateVariableCost}
      onDelete={deleteVariableCost}
      totalLabel="Est. Monthly Total"
      calculateTotal={calculateTotal}
      addFormFields={formFields}
      color="#e74c3c"
    />
  )
}

export default EnterpriseVariableCosts
