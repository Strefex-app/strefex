import { AUTO_DB } from './autoDbSeed'
import { EDM_DB } from './edmDbSeed'
import { IMM_DB } from './immDbSeed'
import { TURN_DB } from './turnDbSeed'

/** @typedef {'edm'|'turn'|'auto'|'imm'} MachineDbType */

/**
 * @typedef {{
 *   id: string
 *   routeSlug: string
 *   shortName: string
 *   title: string
 *   subtitle: string
 *   version: string
 *   dbType: MachineDbType
 *   color: string
 *   icon: string
 *   relatedSubcategories: string[]
 *   db: { suppliers: object[], machines: object[] }
 * }} MachineDbCatalog
 */

/** @param {{ suppliers?: object[], machines?: object[] } | null | undefined} db */
export function sanitizeMachineDb(db) {
  return {
    suppliers: (db?.suppliers || []).filter(Boolean),
    machines: (db?.machines || []).filter(Boolean),
  }
}

function withCatalog(/** @type {Omit<MachineDbCatalog, 'db'> & { db: object }} */ config) {
  return { ...config, db: sanitizeMachineDb(config.db) }
}

/** @type {Record<string, MachineDbCatalog>} */
export const MACHINE_DB_CATALOGS = {
  edmdb: withCatalog({
    id: 'edmdb',
    routeSlug: 'edmdb',
    shortName: 'EDMDB',
    title: 'EDM Machine Intelligence',
    subtitle: 'EDM database',
    version: 'v2.0 · GLOBAL EDITION',
    dbType: 'edm',
    color: '#2c3e50',
    icon: 'production',
    relatedSubcategories: ['edm'],
    db: EDM_DB,
  }),
  turndb: withCatalog({
    id: 'turndb',
    routeSlug: 'turndb',
    shortName: 'TurnDB',
    title: 'CNC Turning Machine Intelligence',
    subtitle: 'Turning machine database',
    version: 'v2.0 · GLOBAL EDITION',
    dbType: 'turn',
    color: '#2980b9',
    icon: 'factory',
    relatedSubcategories: ['turning'],
    db: TURN_DB,
  }),
  autodb: withCatalog({
    id: 'autodb',
    routeSlug: 'autodb',
    shortName: 'AutoDB',
    title: 'Automation & Robotics Intelligence',
    subtitle: 'Automation suppliers database',
    version: 'v2.0 · GLOBAL EDITION',
    dbType: 'auto',
    color: '#8e44ad',
    icon: 'ai',
    relatedSubcategories: ['automation'],
    db: AUTO_DB,
  }),
  immdb: withCatalog({
    id: 'immdb',
    routeSlug: 'immdb',
    shortName: 'IMMDB',
    title: 'Injection Molding Machine Intelligence',
    subtitle: 'Plastic injection molding database',
    version: 'v3.0 · GLOBAL EDITION',
    dbType: 'imm',
    color: '#16a085',
    icon: 'factory',
    relatedSubcategories: ['injection-molding'],
    db: IMM_DB,
  }),
}

/** Machine intelligence catalogues (superadmin Profile → Documentation). */
export const METAL_MACHINE_CATALOGUES = [
  MACHINE_DB_CATALOGS.edmdb,
  MACHINE_DB_CATALOGS.turndb,
  MACHINE_DB_CATALOGS.autodb,
  MACHINE_DB_CATALOGS.immdb,
]

export function getMachineDbCatalog(slug) {
  return MACHINE_DB_CATALOGS[slug] || null
}

export function getCataloguesForSubcategory(subcategoryId) {
  return Object.values(MACHINE_DB_CATALOGS).filter((c) =>
    c.relatedSubcategories.includes(subcategoryId),
  )
}
