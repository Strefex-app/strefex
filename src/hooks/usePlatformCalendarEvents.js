import { useMemo } from 'react'
import { useProjectStore } from '../store/projectStore'
import useRfqStore from '../store/rfqStore'
import { useServiceRequestStore } from '../store/serviceRequestStore'
import useHrSpaceStore from '../store/hrSpaceStore'
import useExhibitionStore from '../store/exhibitionStore'
import { useIndustryStore } from '../store/industryStore'
import useContractStore from '../store/contractStore'
import {
  collectPlatformCalendarEvents,
  filterExhibitionsForMonth,
  groupEventsByDate,
} from '../utils/platformCalendarEvents'

/**
 * @param {number} year
 * @param {number} month0 0-11
 */
export function usePlatformCalendarEvents(year, month0) {
  const projects = useProjectStore((s) => s.projects)
  const rfqs = useRfqStore((s) => s.getSafeRfqs())
  const receivedRfqs = useRfqStore((s) => s.getSafeReceivedRfqs())
  const serviceRequests = useServiceRequestStore((s) => s.getSafeRequests())
  const onboardingTasks = useHrSpaceStore((s) => s.onboardingTasks)
  const hrDocuments = useHrSpaceStore((s) => s.hrDocuments)
  const trainingRecords = useHrSpaceStore((s) => s.trainingRecords)
  const goals = useHrSpaceStore((s) => s.goals)
  const employees = useHrSpaceStore((s) => s.employees)
  const exhibitions = useExhibitionStore((s) => s.exhibitions)
  const selectedIndustries = useIndustryStore((s) => s.selectedIndustries)
  const contracts = useContractStore((s) => s.getSafeContracts())

  return useMemo(() => {
    const exMonth = filterExhibitionsForMonth(exhibitions, year, month0)
    const flat = collectPlatformCalendarEvents({
      projects,
      rfqs,
      receivedRfqs,
      serviceRequests,
      onboardingTasks,
      exhibitions: exMonth,
      industryIdsForExpo: selectedIndustries || [],
      contracts,
      hrDocuments,
      trainingRecords,
      goals,
      employees,
    })
    return {
      eventsByDate: groupEventsByDate(flat),
      flatEvents: flat,
    }
  }, [
    projects,
    rfqs,
    receivedRfqs,
    serviceRequests,
    onboardingTasks,
    hrDocuments,
    trainingRecords,
    goals,
    employees,
    contracts,
    exhibitions,
    selectedIndustries,
    year,
    month0,
  ])
}
