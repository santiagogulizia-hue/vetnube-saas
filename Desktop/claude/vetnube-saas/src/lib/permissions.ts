import type { MemberRole } from '@/lib/types'

/** Coincide con las políticas RLS de la Fase 1. */
export const canWriteClinical = (role: MemberRole) => role === 'owner' || role === 'admin' || role === 'vet'
export const canDelete = (role: MemberRole) => role === 'owner' || role === 'admin'
export const canManageClinic = (role: MemberRole) => role === 'owner' || role === 'admin'
export const isOwner = (role: MemberRole) => role === 'owner'
/** Reportes con costos y ganancias: solo dueño/a y administración. */
export const canSeeFinancials = canManageClinic
