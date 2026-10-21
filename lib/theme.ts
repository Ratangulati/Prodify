import type { Theme } from '@/lib/types'

export const THEME_STORAGE_KEY = 'prodify-theme'

/**
 * Runs in <head> before the page paints, so the right theme shows from the
 * first frame: the saved choice, otherwise the system setting.
 * Kept as a string because it's inlined into the HTML.
 */
export const themeInitScript = `(function(){try{
var t=localStorage.getItem('${THEME_STORAGE_KEY}');
if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}
var r=document.documentElement;r.dataset.theme=t;r.classList.toggle('dark',t==='dark');
}catch(e){}})()`

/** The theme the page is currently showing (set by themeInitScript or applyTheme) */
export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

/** Switches the page's theme and remembers the choice */
export function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.dataset.theme = theme
  root.classList.toggle('dark', theme === 'dark')
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Private windows can block storage; the theme still applies for this visit
  }
}
