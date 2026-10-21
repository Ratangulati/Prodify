import { describe, expect, it } from 'vitest'
import { findTaskKeys } from '@/lib/github/keys'

const pr = (over: Partial<{ branch: string; title: string; body: string }>) =>
  ({ branch: 'main', title: '', body: '', ...over })

describe('findTaskKeys', () => {
  it('finds a key in a lowercase branch name', () => {
    expect(findTaskKeys('PROD', pr({ branch: 'prod-42-add-csv-import' }))).toEqual(new Map([[42, 'branch name']]))
  })

  it('finds keys in the title and description', () => {
    const keys = findTaskKeys('PROD', pr({ title: 'PROD-7: fix login', body: 'Also closes PROD-9 and prod-12.' }))
    expect(keys).toEqual(new Map([[7, 'title'], [9, 'description'], [12, 'description']]))
  })

  it('reports the first place a key appears and lists it once', () => {
    const keys = findTaskKeys('PROD', pr({ branch: 'prod-3-x', title: 'PROD-3', body: 'PROD-3' }))
    expect(keys).toEqual(new Map([[3, 'branch name']]))
  })

  it('does not match a longer number or another prefix', () => {
    expect(findTaskKeys('PROD', pr({ title: 'PROD-421 done' })).has(42)).toBe(false)
    expect(findTaskKeys('PROD', pr({ title: 'XPROD-5 and PRODUCT-6 and OPS-7' })).size).toBe(0)
  })

  it('treats the prefix literally', () => {
    expect(findTaskKeys('A.B', pr({ title: 'AxB-1 A.B-2' }))).toEqual(new Map([[2, 'title']]))
  })
})
