'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function changePassword(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const password = formData.get('password') as string
  const confirm = formData.get('confirm') as string

  if (password !== confirm) {
    redirect('/profile?error=Passwords+do+not+match')
  }

  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    redirect(`/profile?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/profile?success=password-updated')
}

export async function deleteAccount() {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await admin.auth.admin.deleteUser(user.id)

  if (error) {
    redirect(`/profile?error=${encodeURIComponent(error.message)}`)
  }

  await supabase.auth.signOut()
  redirect('/login')
}
