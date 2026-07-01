/**
 * Extract a human-readable message from a fetch Response (or a parsed JSON body).
 *
 * FastAPI's response can be:
 *   - {"detail": "string"} (HTTPException)
 *   - {"detail": [{"loc":[...], "msg":"...", "type":"..."}, ...]} (validation errors)
 *   - Any other shape
 *
 * This util handles all three so we never render "[object Object]" in a toast.
 */
export const extractApiError = async (responseOrData, fallback = 'Ocurrió un error') => {
  let data = responseOrData;
  if (responseOrData && typeof responseOrData.json === 'function') {
    try { data = await responseOrData.json(); } catch { return fallback; }
  }
  if (!data) return fallback;
  const detail = data.detail ?? data.message ?? data;

  if (typeof detail === 'string') return detail;

  if (Array.isArray(detail)) {
    // Pydantic v2 validation errors: [{loc, msg, type, ...}, ...]
    const parts = detail
      .map((e) => {
        if (typeof e === 'string') return e;
        const field = Array.isArray(e?.loc) ? e.loc.filter((s) => s !== 'body').join('.') : '';
        return field ? `${field}: ${e?.msg || 'inválido'}` : (e?.msg || JSON.stringify(e));
      })
      .filter(Boolean);
    return parts.length ? parts.join(' · ') : fallback;
  }

  if (typeof detail === 'object') {
    return detail.msg || detail.error || fallback;
  }
  return fallback;
};
