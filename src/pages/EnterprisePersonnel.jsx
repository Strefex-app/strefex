import useEnterpriseStore from '../store/enterpriseStore'
import EnterpriseCostPage from './EnterpriseCostPage'

const EnterprisePersonnel = () => {
  const { personnelCosts, addPersonnelCost, updatePersonnelCost, deletePersonnelCost } = useEnterpriseStore()

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  const columns = [
    { key: 'department', label: 'Department', className: 'name-cell' },
    { key: 'headcount', label: 'Headcount' },
    { key: 'avgSalary', label: 'Avg. Salary', format: 'currency', className: 'cost-cell' },
    { key: 'benefits', label: 'Benefits', format: 'currency', className: 'cost-cell' },
    { key: 'training', label: 'Training', format: 'currency', className: 'cost-cell' },
    { key: 'totalMonthly', label: 'Total Monthly', className: 'cost-cell',
      render: (_, cost) => formatCurrency(cost.headcount * (cost.avgSalary + cost.benefits + cost.training))
    },
  ]

  const formFields = [
    { key: 'department', label: 'Department', type: 'text', required: true, placeholder: 'e.g., Production' },
    { key: 'headcount', label: 'Number of Employees', type: 'number', required: true, step: '1', placeholder: '0' },
    { key: 'avgSalary', label: 'Average Monthly Salary ($)', type: 'number', required: true, step: '0.01', placeholder: '0.00' },
    { key: 'benefits', label: 'Benefits per Employee ($)', type: 'number', required: true, step: '0.01', placeholder: '0.00' },
    { key: 'training', label: 'Training per Employee ($)', type: 'number', step: '0.01', placeholder: '0.00', default: 0 },
    { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Brief description of this department' },
  ]

  const calculateTotal = (costs) => {
    return costs.reduce((sum, c) => sum + (c.headcount * (c.avgSalary + c.benefits + c.training)), 0)
  }

  return (
    <EnterpriseCostPage
      title="Personnel Costs"
      subtitle="Salaries, benefits, and training expenses by department"
      costType="Personnel Cost"
      costs={personnelCosts}
      columns={columns}
      onAdd={addPersonnelCost}
      onUpdate={updatePersonnelCost}
      onDelete={deletePersonnelCost}
      calculateTotal={calculateTotal}
      addFormFields={formFields}
      color="#e67e22"
    />
  )
}

export default EnterprisePersonnel
