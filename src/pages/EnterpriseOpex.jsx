import useEnterpriseStore from '../store/enterpriseStore'
import EnterpriseCostPage from './EnterpriseCostPage'

const EnterpriseOpex = () => {
  const { opex, addOpex, updateOpex, deleteOpex } = useEnterpriseStore()

  const columns = [
    { key: 'name', label: 'Expense Name', className: 'name-cell' },
    { key: 'category', label: 'Category', className: 'category-cell' },
    { key: 'amount', label: 'Monthly Amount', format: 'currency', className: 'cost-cell' },
    { key: 'description', label: 'Description', className: 'desc-cell' },
  ]

  const formFields = [
    { key: 'name', label: 'Expense Name', type: 'text', required: true, placeholder: 'e.g., Marketing & Advertising' },
    { key: 'category', label: 'Category', type: 'select', required: true, options: [
      { value: 'Marketing', label: 'Marketing' },
      { value: 'Admin', label: 'Administration' },
      { value: 'Operations', label: 'Operations' },
      { value: 'Services', label: 'Professional Services' },
      { value: 'R&D', label: 'R&D' },
      { value: 'IT', label: 'IT' },
      { value: 'Other', label: 'Other' },
    ]},
    { key: 'amount', label: 'Monthly Amount ($)', type: 'number', required: true, step: '0.01', placeholder: '0.00' },
    { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Brief description of this operating expense' },
  ]

  const calculateTotal = (costs) => costs.reduce((sum, c) => sum + c.amount, 0)

  return (
    <EnterpriseCostPage
      title="Operating Expenses (OPEX)"
      subtitle="Day-to-day operational expenses for running the business"
      costType="Operating Expense"
      costs={opex}
      columns={columns}
      onAdd={addOpex}
      onUpdate={updateOpex}
      onDelete={deleteOpex}
      calculateTotal={calculateTotal}
      addFormFields={formFields}
      color="#1abc9c"
    />
  )
}

export default EnterpriseOpex
