import { Download, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AppName } from '@/components/branding/AppName'
import { Button } from '@/components/ui/button'
import { APP_CONFIG } from '@/config/app.config'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISS_KEY = `${APP_CONFIG.storageKey}:install-dismissed`

export function InstallPrompt() {
  const [deferred, setDeferred] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof localStorage === 'undefined') return false
    return localStorage.getItem(DISMISS_KEY) === '1'
  })

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (dismissed || !deferred) return null

  const dismiss = () => {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* empty */
    }
  }

  const install = async () => {
    try {
      await deferred.prompt()
      const choice = await deferred.userChoice
      if (choice.outcome === 'accepted') {
        setDeferred(null)
      } else {
        dismiss()
      }
    } catch {
      dismiss()
    }
  }

  return (
    <div className="relative flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm">
      <div className="rounded-full bg-primary/10 p-3 text-primary">
        <Download className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold">
          Install <AppName />
        </p>
        <p className="text-xs text-muted-foreground">
          Add the app to your home screen for one-tap access in the field.
        </p>
      </div>
      <Button size="sm" onClick={() => void install()}>
        Install
      </Button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        className="tap absolute right-1 top-1 rounded-full p-1 text-muted-foreground hover:bg-muted"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
