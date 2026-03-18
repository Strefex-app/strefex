import {
  dataSourcesService,
  supplierRawDataService,
  suppliersService,
  supplierCapabilitiesService,
  supplierScoresService,
} from './supabaseService'

function normalizeText(v) {
  return String(v || '').trim()
}

function normalizeSupplierPayload(raw) {
  const data = raw || {}
  return {
    legal_name: normalizeText(data.legal_name || data.legalName || data.company_name || data.companyName),
    display_name: normalizeText(data.display_name || data.displayName || data.company_name || data.companyName),
    country: normalizeText(data.country),
    industry: normalizeText(data.industry),
    website: normalizeText(data.website),
    description: normalizeText(data.description),
    capabilities: Array.isArray(data.capabilities) ? data.capabilities : [],
    quality_score: Number(data.quality_score || data.qualityScore || 0),
    risk_score: Number(data.risk_score || data.riskScore || 0),
    delivery_score: Number(data.delivery_score || data.deliveryScore || 0),
    esg_score: Number(data.esg_score || data.esgScore || 0),
  }
}

const supplierIngestionService = {
  validateRawSupplierPayload(raw) {
    const normalized = normalizeSupplierPayload(raw)
    const errors = []
    if (!normalized.legal_name) errors.push('legal_name is required')
    if (!normalized.display_name) errors.push('display_name is required')
    return { valid: errors.length === 0, errors, normalized }
  },

  async ingestRawSupplierData({ sourceName, sourceType = 'import', rawJson }) {
    const source = await dataSourcesService.create({
      source_name: normalizeText(sourceName || 'unnamed_source'),
      type: sourceType,
    })
    return supplierRawDataService.create({
      source_id: source.id,
      raw_json: rawJson || {},
      processed: false,
    })
  },

  async processRawRecord(rawRecordId) {
    const raw = await supplierRawDataService.getById(rawRecordId)
    if (!raw) throw new Error('Raw record not found')
    const check = this.validateRawSupplierPayload(raw.raw_json)
    const normalized = check.normalized
    if (!check.valid) {
      throw new Error(`Invalid supplier payload: ${check.errors.join(', ')}`)
    }

    // Deduplicate by legal_name + country.
    const existing = await suppliersService.list(null, {
      filters: [
        ['legal_name', 'eq', normalized.legal_name],
        ['country', 'eq', normalized.country || ''],
      ],
      limit: 1,
    }).catch(() => [])
    let supplier = existing[0] || null
    if (!supplier) {
      supplier = await suppliersService.create({
        legal_name: normalized.legal_name,
        display_name: normalized.display_name || normalized.legal_name,
        country: normalized.country || null,
        industry: normalized.industry || null,
        website: normalized.website || null,
        description: normalized.description || null,
        source_confidence: 60,
      })
    } else {
      supplier = await suppliersService.update(supplier.id, {
        display_name: normalized.display_name || supplier.display_name,
        industry: normalized.industry || supplier.industry,
        website: normalized.website || supplier.website,
        description: normalized.description || supplier.description,
      })
    }

    if (normalized.capabilities.length > 0) {
      const inserts = normalized.capabilities
        .map((cap) => ({
          supplier_id: supplier.id,
          process: normalizeText(cap.process || cap.manufacturing_process),
          capability: normalizeText(cap.capability || cap.name),
          material: normalizeText(cap.material),
        }))
        .filter((cap) => cap.capability)
      await Promise.all(inserts.map((cap) => supplierCapabilitiesService.create(cap).catch(() => null)))
    }

    await supplierScoresService.create({
      supplier_id: supplier.id,
      quality_score: normalized.quality_score,
      risk_score: normalized.risk_score,
      delivery_score: normalized.delivery_score,
      esg_score: normalized.esg_score,
    }).catch(() => null)

    await supplierRawDataService.update(raw.id, {
      processed: true,
      processed_at: new Date().toISOString(),
    })
    return supplier
  },

  async processQueuedRawData(limit = 100) {
    const queued = await supplierRawDataService.list(null, {
      filters: [['processed', 'eq', false]],
      orderBy: 'created_at',
      ascending: true,
      limit,
    })
    let processed = 0
    let failed = 0
    for (const row of queued || []) {
      try {
        await this.processRawRecord(row.id)
        processed += 1
      } catch {
        failed += 1
      }
    }
    return { queued: (queued || []).length, processed, failed }
  },
}

export default supplierIngestionService
