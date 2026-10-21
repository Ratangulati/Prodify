import { describe, expect, it } from 'vitest'
import { branchName, formatTaskKey, isTaskStatus } from '@/lib/tasks'

describe('task keys', () => {
  it('formats a key from prefix and number', () => {
    expect(formatTaskKey('PROD', 42)).toBe('PROD-42')
  })

  it('builds a branch name that starts with the key', () => {
    expect(branchName('PROD', 42, 'Add CSV import')).toBe('prod-42-add-csv-import')
  })

  it('strips punctuation and trims long titles without a trailing dash', () => {
    expect(branchName('PROD', 7, '  Fix: "Save" button (Safari)!! ')).toBe('prod-7-fix-save-button-safari')
    const long = branchName('PROD', 1, 'a'.repeat(39) + ' and more words')
    expect(long.endsWith('-')).toBe(false)
    expect(long.length).toBeLessThanOrEqual('prod-1-'.length + 40)
  })

  it('falls back to just the key when the title has no letters or digits', () => {
    expect(branchName('PROD', 3, '!!!')).toBe('prod-3')
  })

  it('only accepts known statuses', () => {
    expect(isTaskStatus('review')).toBe(true)
    expect(isTaskStatus('blocked')).toBe(false)
  })
})
