import useEnterpriseStore from '../store/enterpriseStore'
import EnterpriseCostPage from './EnterpriseCostPage'

const EnterpriseFixedCosts = () => {
  const { fixedCosts, addFixedCost, updateFixedCost, deleteFixedCost } = useEnterpriseStore()

  const columns = [
    { key: 'name', label: 'Cost Name', className: 'name-cell' },
    { key: 'category', label: 'Category', className: 'category-cell' },
    { key: 'amount', label: 'Monthly Amount', format: 'currency', className: 'cost-cell' },
    { key: 'description', label: 'Description', className: 'desc-cell' },
  ]

  const formFields = [
    { key: 'name', label: 'Cost Name', type: 'text', required: true, placeholder: 'e.g., Office Rent' },
    { key: 'category', label: 'Category', type: 'select', required: true, options: [
      { value: 'Facilities', label: 'Facilities' },
      { value: 'Equipment', label: 'Equipment' },
      { value: 'Insurance', label: 'Insurance' },
      { value: 'IT', label: 'IT' },
      { value: 'Other', label: 'Other' },
    ]},
    { key: 'amount', label: 'Monthly Amount ($)', type: 'number', required: true, step: '0.01', placeholder: '0.00' },
    { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Brief description of this cost' },
  ]

  const calculateTotal = (costs) => costs.reduce((sum, c) => sum + c.amount, 0)

  return (
    <EnterpriseCostPage
      title="Fixed Costs"
      subtitle="Costs that remain constant regardless of production volume"
      costType="Fixed Cost"
      costs={fixedCosts}
      columns={columns}
      onAdd={addFixedCost}
      onUpdate={updateFixedCost}
      onDelete={deleteFixedCost}
      calculateTotal={calculateTotal}
      addFormFields={formFields}
      color="#3498db"
    />
  )
}

export default EnterpriseFixedCosts
