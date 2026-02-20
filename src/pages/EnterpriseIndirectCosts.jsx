import useEnterpriseStore from '../store/enterpriseStore'
import EnterpriseCostPage from './EnterpriseCostPage'

const EnterpriseIndirectCosts = () => {
  const { indirectCosts, addIndirectCost, updateIndirectCost, deleteIndirectCost } = useEnterpriseStore()

  const columns = [
    { key: 'name', label: 'Cost Name', className: 'name-cell' },
    { key: 'category', label: 'Category', className: 'category-cell' },
    { key: 'amount', label: 'Monthly Amount', format: 'currency', className: 'cost-cell' },
    { key: 'description', label: 'Description', className: 'desc-cell' },
  ]

  const formFields = [
    { key: 'name', label: 'Cost Name', type: 'text', required: true, placeholder: 'e.g., Factory Supervision' },
    { key: 'category', label: 'Category', type: 'select', required: true, options: [
      { value: 'Labor', label: 'Labor' },
      { value: 'Utilities', label: 'Utilities' },
      { value: 'Assets', label: 'Assets/Depreciation' },
      { value: 'Materials', label: 'Materials' },
      { value: 'Operations', label: 'Operations' },
      { value: 'Other', label: 'Other' },
    ]},
    { key: 'amount', label: 'Monthly Amount ($)', type: 'number', required: true, step: '0.01', placeholder: '0.00' },
    { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Brief description of this indirect cost' },
  ]

  const calculateTotal = (costs) => costs.reduce((sum, c) => sum + c.amount, 0)

  return (
    <EnterpriseCostPage
      title="Indirect Costs"
      subtitle="Overhead costs not directly tied to specific products"
      costType="Indirect Cost"
      costs={indirectCosts}
      columns={columns}
      onAdd={addIndirectCost}
      onUpdate={updateIndirectCost}
      onDelete={deleteIndirectCost}
      calculateTotal={calculateTotal}
      addFormFields={formFields}
      color="#f39c12"
    />
  )
}

export default EnterpriseIndirectCosts
