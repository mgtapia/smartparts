import { redirect } from 'next/navigation'
import { DEFAULT_AUTHENTICATED_PATH } from '@constants/routes'

export default function RootPage() {
  redirect(DEFAULT_AUTHENTICATED_PATH)
}
