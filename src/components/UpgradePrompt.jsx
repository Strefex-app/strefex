/**
 * UpgradePrompt — shown when a user tries to access a gated feature.
 * Directs them to the billing/plans page.
 */
import { useNavigate } from 'react-router-dom'
import { useSubscriptionStore } from '../services/featureFlags'
import { getPlanById } from '../services/stripeService'

export default function UpgradePrompt({ feature = 'This feature', requiredPlan = 'a higher' }) {
  const navigate = useNavigate()
  const planId = useSubscriptionStore((s) => s.planId)
  const currentPlan = getPlanById(planId)

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px 24px',
      textAlign: 'center',
      maxWidth: 520,
      margin: '40px auto',
    }}>
      {/* Lock icon */}
      <div style={{
        width: 72,
        height: 72,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #eef0ff, #f0f2ff)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
      }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" style={{ color: '#000888' }}>
          <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <circle cx="12" cy="16" r="1" fill="currentColor"/>
        </svg>
      </div>

      <h2 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', margin: '0 0 8px' }}>
        Upgrade Required
      </h2>
      <p style={{ fontSize: 15, color: '#666', lineHeight: 1.7, margin: '0 0 8px' }}>
        <strong>{feature}</strong> is available on the <strong>{requiredPlan}</strong> plan and above.
      </p>
      <p style={{ fontSize: 13, color: '#999', margin: '0 0 28px' }}>
        You are currently on the <strong style={{ color: '#555' }}>{currentPlan.name}</strong> plan.
      </p>

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          onClick={() => navigate('/plans')}
          style={{
            padding: '12px 28px',
            borderRadius: 8,
            background: 'linear-gradient(135deg, #000888 2%, #000222 100%)',
            color: '#fff',
            border: 'none',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,8,136,0.3)' }}
          onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none' }}
        >
          View Plans & Upgrade
        </button>
        <button
          onClick={() => navigate(-1)}
          style={{
            padding: '12px 20px',
            borderRadius: 8,
            background: 'transparent',
            color: '#666',
            border: '1px solid #ddd',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Go Back
        </button>
      </div>
    </div>
  )
}
