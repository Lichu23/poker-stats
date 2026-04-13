'use server'

import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseFile, calculateStats, mergeStats } from '@/lib/parser'

const MAX_FILE_SIZE = 50 * 1024 * 1024  // 50 MB
const STORAGE_BUCKET = 'hand-histories'

// ── Background: parse file and insert hands ───────────────────────────────────
async function parseAndInsert(uploadId: string, storagePath: string, userId: string) {
  const admin = createAdminClient()

  try {
    // Download file from storage
    const { data: fileData, error: dlError } = await admin.storage
      .from(STORAGE_BUCKET)
      .download(storagePath)

    if (dlError || !fileData) throw new Error(dlError?.message ?? 'Failed to download file')

    const content = await fileData.text()

    // Validate PokerStars format
    if (!content.includes('PokerStars Hand #')) {
      throw new Error('File does not appear to be a valid PokerStars hand history')
    }

    // Parse
    const { hands, errors } = parseFile(content)

    if (hands.length === 0) {
      throw new Error('No hands could be parsed from this file')
    }

    // Insert hands (ignore duplicates via upsert)
    const rows = hands.map(h => ({
      user_id: userId,
      hand_id: h.handId,
      game_type: h.gameType,
      limit_type: h.limitType,
      stakes: h.stakes,
      table_size: h.tableSize,
      position: h.position,
      hole_cards: h.holeCards,
      board: h.board,
      actions: h.actions,
      result_bb: h.resultBb,
      rake: h.rake,
      is_all_in: h.isAllIn,
      went_to_showdown: h.wentToShowdown,
      won_at_showdown: h.wonAtShowdown,
      played_at: h.playedAt.toISOString(),
    }))

    // Insert in batches of 500 to avoid payload limits
    let inserted = 0
    for (let i = 0; i < rows.length; i += 500) {
      const batch = rows.slice(i, i + 500)
      const { error: insertError } = await admin
        .from('hands')
        .upsert(batch, { onConflict: 'user_id,hand_id', ignoreDuplicates: true })
      if (insertError) throw new Error(`Insert error: ${insertError.message}`)
      inserted += batch.length
    }

    // Recalculate and merge user_stats
    const newStats = calculateStats(hands)
    const { data: existing } = await admin
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single()

    const merged = mergeStats(existing, newStats)
    await admin
      .from('user_stats')
      .upsert({ user_id: userId, ...merged })

    // Mark upload complete
    await admin
      .from('uploads')
      .update({
        status: 'completed',
        hands_parsed: hands.length,
        error_message: errors.length > 0 ? `${errors.length} hand(s) skipped` : null,
      })
      .eq('id', uploadId)

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await admin
      .from('uploads')
      .update({ status: 'failed', error_message: message })
      .eq('id', uploadId)
  }
}

// ── Server action: validate + upload + trigger background parse ───────────────
export async function uploadHandHistory(formData: FormData): Promise<{ uploadId: string } | { error: string }> {
  try {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (user.email === process.env.DEMO_USER_EMAIL) {
    return { error: 'Uploads are disabled in demo mode' }
  }

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { error: 'No file selected' }

  // Validate extension
  if (!file.name.toLowerCase().endsWith('.txt')) {
    return { error: 'Only .txt files are accepted' }
  }

  // Validate size
  if (file.size > MAX_FILE_SIZE) {
    return { error: 'File must be under 50 MB' }
  }

  // Upload to Supabase Storage
  const storagePath = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const { error: storageError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file, { contentType: 'text/plain' })

  if (storageError) {
    return { error: `Storage error: ${storageError.message}` }
  }

  // Create upload record
  const { data: upload, error: dbError } = await supabase
    .from('uploads')
    .insert({
      user_id: user.id,
      filename: file.name,
      file_size: file.size,
      status: 'processing',
    })
    .select('id')
    .single()

  if (dbError || !upload) {
    return { error: 'Failed to create upload record' }
  }

  // Parse in background after response is sent
  after(() => parseAndInsert(upload.id, storagePath, user.id))

  return { uploadId: upload.id }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error'
    console.error('[uploadHandHistory] uncaught error:', message, err)
    return { error: message }
  }
}

// ── Server action: get upload status for polling ──────────────────────────────
export async function getUploadStatus(uploadId: string): Promise<{
  status: string
  handsParsed: number
  errorMessage: string | null
} | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('uploads')
    .select('status, hands_parsed, error_message')
    .eq('id', uploadId)
    .eq('user_id', user.id)
    .single()

  if (!data) return null
  return {
    status: data.status,
    handsParsed: data.hands_parsed ?? 0,
    errorMessage: data.error_message ?? null,
  }
}
