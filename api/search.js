import suppliersHandler from './suppliers.js'

// Alias route for marketplace search:
// /api/search -> same implementation as /api/suppliers
export default async function handler(req, res) {
  return suppliersHandler(req, res)
}
