import { randomUUID } from 'node:crypto'
import type { PrismaClient } from '@prisma/client'

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>

/** Supports the `where` shapes our code uses: equality, { in }, OR, NOT, compound unique keys */
function matches(row: Row, where: Row = {}): boolean {
  return Object.entries(where).every(([key, cond]) => {
    if (key === 'OR')  return (cond as Row[]).some((c) => matches(row, c))
    if (key === 'NOT') return !matches(row, cond)
    if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
      if ('in' in cond) return cond.in.includes(row[key])
      return matches(row, cond) // compound key, e.g. taskId_repoFullName_number: { … }
    }
    return row[key] === cond
  })
}

class FakeModel {
  rows: Row[] = []
  constructor(private db: FakeDb, private uniques: string[][], private defaults: Row = {}) {}

  private withIncludes(row: Row | undefined, include?: Row) {
    if (!row || !include) return row
    const out = { ...row }
    for (const rel of Object.keys(include)) out[rel] = (this.db as any)[rel].rows.find((r: Row) => r.id === row[`${rel}Id`])
    return out
  }

  private checkUnique(row: Row, ignore?: Row) {
    for (const fields of [['id'], ...this.uniques]) {
      if (this.rows.some((r) => r !== ignore && fields.every((f) => r[f] === row[f]))) {
        throw Object.assign(new Error(`Unique constraint failed on ${fields.join(', ')}`), { code: 'P2002' })
      }
    }
  }

  async findUnique({ where, include }: Row) { return this.withIncludes(this.rows.find((r) => matches(r, where)), include) ?? null }
  async findFirst({ where, include }: Row = {}) { return this.findUnique({ where, include }) }
  async findMany({ where }: Row = {}) { return this.rows.filter((r) => matches(r, where)).map((r) => ({ ...r })) }
  async count({ where }: Row = {}) { return this.rows.filter((r) => matches(r, where)).length }

  async create({ data }: Row) {
    const row = { id: randomUUID(), createdAt: new Date(), ...this.defaults, ...data }
    this.checkUnique(row)
    this.rows.push(row)
    return { ...row }
  }

  async update({ where, data }: Row) {
    const row = this.rows.find((r) => matches(r, where))
    if (!row) throw Object.assign(new Error('Record not found'), { code: 'P2025' })
    const next = { ...row, ...data, updatedAt: new Date() }
    this.checkUnique(next, row)
    Object.assign(row, next)
    return { ...row }
  }

  async upsert({ where, create, update }: Row) {
    const row = this.rows.find((r) => matches(r, where))
    return row ? this.update({ where: { id: row.id }, data: update }) : this.create({ data: create })
  }

  async delete({ where }: Row) {
    const row = this.rows.find((r) => matches(r, where))
    this.rows = this.rows.filter((r) => r !== row)
    return row
  }

  async deleteMany({ where }: Row = {}) {
    const before = this.rows.length
    this.rows = this.rows.filter((r) => !matches(r, where))
    return { count: before - this.rows.length }
  }
}

/** An in-memory stand-in for the parts of PrismaClient the GitHub code uses */
export class FakeDb {
  workspace        = new FakeModel(this, [], { taskKeyPrefix: 'PROD', nextTaskNumber: 1, githubAutomation: false })
  task             = new FakeModel(this, [['workspaceId', 'number']], { description: '', status: 'todo', docId: null })
  gitHubConnection = new FakeModel(this, [['workspaceId'], ['installationId']])
  gitHubRepo       = new FakeModel(this, [['githubId']])
  pullRequestLink  = new FakeModel(this, [['taskId', 'repoFullName', 'number']])
  webhookDelivery  = new FakeModel(this, [])
  taskActivity     = new FakeModel(this, [])

  private models() {
    return [this.workspace, this.task, this.gitHubConnection, this.gitHubRepo,
      this.pullRequestLink, this.webhookDelivery, this.taskActivity]
  }

  /** Like Prisma: if the callback throws, every change it made is undone */
  async $transaction<T>(fn: (tx: this) => Promise<T>): Promise<T> {
    const snapshot = this.models().map((m) => m.rows.map((r) => ({ ...r })))
    try {
      return await fn(this)
    } catch (err) {
      this.models().forEach((m, i) => { m.rows = snapshot[i] })
      throw err
    }
  }

  asPrisma() {
    return this as unknown as PrismaClient
  }
}
