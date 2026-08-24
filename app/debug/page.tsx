import { getDebug } from '@/app/actions/debug-whatsapp'
export default async function Page() {
  const data = await getDebug();
  return <pre>{JSON.stringify(data, null, 2)}</pre>
}
