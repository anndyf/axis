import { describe, it, expect } from 'vitest'
import { can, type RbacUser } from './rbac'

function user(overrides: Partial<RbacUser> = {}): RbacUser {
  return { isSuperuser: false, isDirecao: false, isStaff: false, isAEE: false, ...overrides }
}

describe('can', () => {
  it('gestao: superuser ou direcao', () => {
    expect(can(user({ isSuperuser: true }), 'gestao')).toBe(true)
    expect(can(user({ isDirecao: true }), 'gestao')).toBe(true)
    expect(can(user({ isStaff: true }), 'gestao')).toBe(false)
    expect(can(user(), 'gestao')).toBe(false)
  })

  it('staff: staff, superuser ou direcao', () => {
    expect(can(user({ isStaff: true }), 'staff')).toBe(true)
    expect(can(user({ isSuperuser: true }), 'staff')).toBe(true)
    expect(can(user({ isDirecao: true }), 'staff')).toBe(true)
    expect(can(user({ isAEE: true }), 'staff')).toBe(false)
  })

  it('superuser: só superuser', () => {
    expect(can(user({ isSuperuser: true }), 'superuser')).toBe(true)
    expect(can(user({ isDirecao: true }), 'superuser')).toBe(false)
  })

  it('aee: direcao, superuser ou aee', () => {
    expect(can(user({ isAEE: true }), 'aee')).toBe(true)
    expect(can(user({ isDirecao: true }), 'aee')).toBe(true)
    expect(can(user({ isSuperuser: true }), 'aee')).toBe(true)
    expect(can(user({ isStaff: true }), 'aee')).toBe(false)
  })

  it('staffPuro: staff e não superuser/direcao', () => {
    expect(can(user({ isStaff: true }), 'staffPuro')).toBe(true)
    expect(can(user({ isStaff: true, isSuperuser: true }), 'staffPuro')).toBe(false)
    expect(can(user({ isStaff: true, isDirecao: true }), 'staffPuro')).toBe(false)
  })
})
