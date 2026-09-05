import AppLayout from '../components/AppLayout'
import ManagementToolsLanding from '../components/management/ManagementToolsLanding'
import '../styles/app-page.css'
import './ManagementHub.css'
import '../styles/managementShell.css'

export default function ManagementHub() {
  return (
    <AppLayout>
      <div className="app-page">
        <ManagementToolsLanding
          title="Management"
          subtitle="Choose an area, then open the module you need"
          toolsHeading="Management tools"
        />
      </div>
    </AppLayout>
  )
}
