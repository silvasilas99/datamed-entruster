import { Context } from 'fabric-contract-api'

export function txTimestampToISO(ctx: Context): string {
  const ts = ctx.stub.getTxTimestamp()
  if (!ts) return new Date().toISOString()
  const seconds = typeof ts.seconds === 'object' && typeof (ts.seconds as any).toNumber === 'function'
    ? (ts.seconds as any).toNumber()
    : Number(ts.seconds)
  const millis = seconds * 1000 + Math.floor(ts.nanos / 1e6)
  return new Date(millis).toISOString()
}
