import { Iterators } from 'fabric-shim'

export async function drainIterator(iterator: Iterators.StateQueryIterator): Promise<any[]> {
  const results = []
  let result = await iterator.next()
  while (!result.done) {
    if (result.value && result.value.value && result.value.value.toString()) {
      try {
        results.push(JSON.parse(Buffer.from(result.value.value).toString('utf8')))
      } catch (err) {
        // Skip invalid JSON
      }
    }
    result = await iterator.next()
  }
  await iterator.close()
  return results
}

export function buildSelectorQuery(docType: string, filters: Record<string, any> = {}): object {
  return {
    selector: {
      docType,
      ...filters,
    },
  }
}
