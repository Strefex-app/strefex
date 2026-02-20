import { useEffect } from 'react'
import AppLayout from '../components/AppLayout'
import { useSettingsStore } from '../store/settingsStore'
import { useTranslation } from '../i18n/useTranslation'
import { LANGUAGES } from '../i18n/translations'
import './Settings.css'

export default function Settings() {
  const { theme, toggleTheme, language, setLanguage } = useSettingsStore()
  const { t } = useTranslation()

  /* Apply theme on mount */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <AppLayout>
      <div className="settings-page">
        {/* Header card */}
        <div className="settings-header-card">
          <h1 className="settings-title">{t('settings.title')}</h1>
          <p className="settings-subtitle">{t('settings.subtitle')}</p>
        </div>

        {/* Main two-column layout */}
        <div className="settings-main">
          {/* Left column — content cards */}
          <div className="settings-left">
            {/* ── Appearance ──────────────────────────────────── */}
            <div className="settings-card">
              <h2 className="settings-card-title">{t('settings.appearance')}</h2>

              <div className="settings-item">
                <div className="settings-item-info">
                  <div className="settings-item-icon night-icon">
                    {theme === 'dark' ? (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    ) : (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                    )}
                  </div>
                  <div>
                    <div className="settings-item-label">{t('settings.nightMode')}</div>
                    <div className="settings-item-desc">{t('settings.nightModeDesc')}</div>
                  </div>
                </div>
                <button type="button" className={`settings-toggle ${theme === 'dark' ? 'on' : ''}`} onClick={toggleTheme} aria-label="Toggle night mode">
                  <span className="settings-toggle-knob" />
                </button>
              </div>
            </div>

            {/* ── Language ────────────────────────────────────── */}
            <div className="settings-card">
              <h2 className="settings-card-title">{t('settings.language')}</h2>
              <p className="settings-card-desc">{t('settings.languageDesc')}</p>

              <div className="settings-lang-grid">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    className={`settings-lang-btn ${language === lang.code ? 'active' : ''}`}
                    onClick={() => setLanguage(lang.code)}
                  >
                    <span className="settings-lang-flag">{lang.flag}</span>
                    <span className="settings-lang-label">{lang.label}</span>
                    {language === lang.code && (
                      <span className="settings-lang-check">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Account ────────────────────────────────────── */}
            <div className="settings-card">
              <h2 className="settings-card-title">{t('settings.account')}</h2>

              <div className="settings-item clickable">
                <div className="settings-item-info">
                  <div className="settings-item-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  </div>
                  <div>
                    <div className="settings-item-label">{t('settings.changePassword')}</div>
                  </div>
                </div>
                <span className="settings-item-arrow">→</span>
              </div>

              <div className="settings-item clickable">
                <div className="settings-item-info">
                  <div className="settings-item-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="2"/><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div>
                    <div className="settings-item-label">{t('settings.twoFactor')}</div>
                  </div>
                </div>
                <span className="settings-item-arrow">→</span>
              </div>

              <div className="settings-item clickable">
                <div className="settings-item-info">
                  <div className="settings-item-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><path d="M7 10l5 5 5-5M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div>
                    <div className="settings-item-label">{t('settings.dataExport')}</div>
                  </div>
                </div>
                <span className="settings-item-arrow">→</span>
              </div>
            </div>
          </div>

          {/* Right column — Notifications quick actions */}
          <div className="settings-right">
            <div className="settings-card">
              <h2 className="settings-card-title">{t('settings.notifications')}</h2>
              <p className="settings-card-desc" style={{ marginBottom: 12 }}>Manage how you receive alerts</p>

              <div className="settings-item">
                <div className="settings-item-info">
                  <div className="settings-item-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" strokeWidth="2"/><path d="M22 6l-10 7L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div>
                    <div className="settings-item-label">{t('settings.emailNotif')}</div>
                  </div>
                </div>
                <button type="button" className="settings-toggle on" aria-label="Toggle email notifications">
                  <span className="settings-toggle-knob" />
                </button>
              </div>

              <div className="settings-item">
                <div className="settings-item-info">
                  <div className="settings-item-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                  <div>
                    <div className="settings-item-label">{t('settings.pushNotif')}</div>
                  </div>
                </div>
                <button type="button" className="settings-toggle on" aria-label="Toggle push notifications">
                  <span className="settings-toggle-knob" />
                </button>
              </div>

              <div className="settings-item">
                <div className="settings-item-info">
                  <div className="settings-item-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/><path d="M16 2v4M8 2v4M3 10h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
                  </div>
                  <div>
                    <div className="settings-item-label">{t('settings.exhibitionReminders')}</div>
                  </div>
                </div>
                <button type="button" className="settings-toggle on" aria-label="Toggle exhibition reminders">
                  <span className="settings-toggle-knob" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
