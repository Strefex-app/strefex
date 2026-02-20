import useEnterpriseStore from '../store/enterpriseStore'
import EnterpriseCostPage from './EnterpriseCostPage'

const EnterpriseDirectCosts = () => {
  const { directCosts, addDirectCost, updateDirectCost, deleteDirectCost, config } = useEnterpriseStore()

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
  }

  const columns = [
    { key: 'name', label: 'Cost Name', className: 'name-cell' },
    { key: 'category', label: 'Category', className: 'category-cell' },
    { key: 'costPerUnit', label: 'Cost/Unit', className: 'cost-cell',
      render: (val, cost) => {
        if (cost.costPerUnit) return formatCurrency(cost.costPerUnit)
        if (cost.hourlyRate && cost.hoursPerUnit) return formatCurrency(cost.hourlyRate * cost.hoursPerUnit)
        return '-'
      }
    },
    { key: 'details', label: 'Rate Details',
      render: (_, cost) => {
        if (cost.hourlyRate) return `${formatCurrency(cost.hourlyRate)}/hr × ${cost.hoursPerUnit}hrs`
        return 'Per unit'
      }
    },
    { key: 'description', label: 'Description', className: 'desc-cell' },
  ]

  const formFields = [
    { key: 'name', label: 'Cost Name', type: 'text', required: true, placeholder: 'e.g., Direct Labor' },
    { key: 'category', label: 'Category', type: 'select', required: true, options: [
      { value: 'Labor', label: 'Labor' },
      { value: 'Materials', label: 'Materials' },
      { value: 'Equipment', label: 'Equipment' },
      { value: 'Services', label: 'Services' },
    ]},
    { key: 'costPerUnit', label: 'Cost Per Unit ($) - OR -', type: 'number', step: '0.01', placeholder: 'Use this OR hourly rate' },
    { key: 'hourlyRate', label: 'Hourly Rate ($)', type: 'number', step: '0.01', placeholder: 'e.g., 28.50' },
    { key: 'hoursPerUnit', label: 'Hours Per Unit', type: 'number', step: '0.1', placeholder: 'e.g., 2.5' },
    { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Brief description of this direct cost' },
  ]

  const calculateTotal = (costs) => {
    const totalPerUnit = costs.reduce((sum, c) => {
      if (c.costPerUnit) return sum + c.costPerUnit
      if (c.hourlyRate && c.hoursPerUnit) return sum + (c.hourlyRate * c.hoursPerUnit)
      return sum
    }, 0)
    return totalPerUnit * config.monthlyProductionUnits
  }

  return (
    <EnterpriseCostPage
      title="Direct Costs"
      subtitle="Costs directly attributable to product manufacturing"
      costType="Direct Cost"
      costs={directCosts}
      columns={columns}
      onAdd={addDirectCost}
      onUpdate={updateDirectCost}
      onDelete={deleteDirectCost}
      totalLabel="Est. Monthly Total"
      calculateTotal={calculateTotal}
      addFormFields={formFields}
      color="#27ae60"
    />
  )
}

export default EnterpriseDirectCosts
