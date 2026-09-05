import { useMemo } from 'react'
import useHrSpaceStore from '../store/hrSpaceStore'
import useIatfControlStore from '../store/iatfControlStore'
import { listCompanyDepartmentRecords, listCompanyDepartments } from '../utils/departmentHome'

/** Department display names (legacy). */
export default function useCompanyDepartments() {
  const records = useCompanyDepartmentRecords()
  return useMemo(() => records.map((d) => d.name), [records])
}

/** Department objects with stable ids. */
export function useCompanyDepartmentRecords() {
  const hrDepartments = useHrSpaceStore((s) => s.departments)
  const employees = useHrSpaceStore((s) => s.employees)
  const openPositions = useHrSpaceStore((s) => s.openPositions)
  const workforcePlans = useHrSpaceStore((s) => s.workforcePlans)
  const documents = useIatfControlStore((s) => s.documents)
  const lots = useIatfControlStore((s) => s.lots)

  return useMemo(
    () => listCompanyDepartmentRecords({
      hrDepartments,
      employees,
      documents,
      lots,
      openPositions,
      workforcePlans,
    }),
    [hrDepartments, employees, documents, lots, openPositions, workforcePlans],
  )
}

export { listCompanyDepartments }
