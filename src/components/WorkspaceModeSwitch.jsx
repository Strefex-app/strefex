import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useWorkspaceModeStore, { WORKSPACE_MODES, availableWorkspaceModes } from '../store/workspaceModeStore'
import { useAuthStore } from '../store/authStore'
import { useSubscriptionStore } from '../services/featureFlags'
import { resolveWorkspaceLandingPath } from '../utils/workspaceLanding'
import './WorkspaceModeSwitch.css'

export default function WorkspaceModeSwitch({ compact = false }) {
  const navigate = useNavigate()
  const accountType = useSubscriptionStore((s) => s.accountType)
  const user = useAuthStore((s) => s.user)
  const isSuperAdmin = useAuthStore((s) => s.role === 'superadmin')
  const stored = useWorkspaceModeStore((s) => s.mode)
  const setMode = useWorkspaceModeStore((s) => s.setMode)
  const accountTypes = Array.isArray(user?.accountTypes) && user.accountTypes.length > 0
    ? user.accountTypes
    : [accountType].filter(Boolean)
  const available = availableWorkspaceModes(accountTypes, { isSuperAdmin })
  const mode = stored || useWorkspaceModeStore.getState().resolveMode(accountType)
  const visible = WORKSPACE_MODES.filter((item) => available.includes(item.id))

  useEffect(() => {
    if (available.length && !available.includes(mode)) {
      setMode(available[0])
    }
  }, [available, mode, setMode])

  if (visible.length < 2) return null

  const selectMode = (next) => {
    if (next === mode) return
    setMode(next)
    navigate(resolveWorkspaceLandingPath({
      accountType,
      accountTypes,
      isSuperAdmin,
      mode: next,
    }), { replace: true })
  }

  return (
    <div className={`ws-mode${compact ? ' ws-mode--compact' : ''}`} role="group" aria-label="Workspace mode">
      {visible.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`ws-mode__btn${mode === item.id ? ' is-active' : ''}`}
          onClick={() => selectMode(item.id)}
          title={item.hint}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
