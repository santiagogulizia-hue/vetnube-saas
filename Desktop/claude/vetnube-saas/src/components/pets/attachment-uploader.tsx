'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Upload } from 'lucide-react'
import { Field, FormAlert, inputClass, primaryButton } from '@/components/forms/fields'
import { createClient } from '@/lib/supabase/client'

const MAX_BYTES = 25 * 1024 * 1024
const ACCEPT = 'image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt,.dcm'

type Props = {
  clinicId: string
  petId: string
  records: { id: string; label: string }[]
}

/**
 * Sube el archivo directo del navegador a Supabase Storage (bucket privado
 * clinic-files, carpeta {clinic_id}/{pet_id}/) y registra la fila en attachments.
 * Las políticas de Storage de la Fase 1 validan que el usuario sea de la clínica.
 */
export function AttachmentUploader({ clinicId, petId, records }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const file = data.get('file')
    if (!(file instanceof File) || file.size === 0) return setError('Elegí un archivo.')
    if (file.size > MAX_BYTES) return setError('El archivo supera los 25 MB.')

    setBusy(true)
    setError(undefined)
    const supabase = createClient()
    const safeName = file.name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^\w.-]+/g, '_')
      .slice(-80)
    const path = `${clinicId}/${petId}/${crypto.randomUUID()}-${safeName}`

    const { error: uploadError } = await supabase.storage
      .from('clinic-files')
      .upload(path, file, { contentType: file.type || undefined })
    if (uploadError) {
      setBusy(false)
      return setError(`No se pudo subir el archivo: ${uploadError.message}`)
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    const recordId = String(data.get('medical_record_id') ?? '')
    const { error: insertError } = await supabase.from('attachments').insert({
      clinic_id: clinicId,
      pet_id: petId,
      medical_record_id: recordId || null,
      storage_path: path,
      file_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
      uploaded_by: user?.id ?? null,
    })
    if (insertError) {
      await supabase.storage.from('clinic-files').remove([path])
      setBusy(false)
      return setError(`No se pudo registrar el archivo: ${insertError.message}`)
    }

    form.reset()
    setBusy(false)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border border-dashed border-line bg-canvas/60 p-4">
      <FormAlert message={error} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
        <Field label="Archivo" htmlFor="file" hint="Radiografías, análisis, ecografías, consentimientos. Hasta 25 MB.">
          <input id="file" name="file" type="file" accept={ACCEPT} required className={`${inputClass} file:mr-3 file:rounded file:border-0 file:bg-brand-50 file:px-2 file:py-1 file:font-bold file:text-brand-700`} />
        </Field>
        <Field label="Vincular a una consulta" htmlFor="medical_record_id" hint="Opcional.">
          <select id="medical_record_id" name="medical_record_id" className={inputClass} defaultValue="">
            <option value="">Sin vincular</option>
            {records.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>
        <button type="submit" disabled={busy} className={`${primaryButton} sm:mb-5`}>
          <Upload className="size-4" aria-hidden />
          {busy ? 'Subiendo…' : 'Subir'}
        </button>
      </div>
    </form>
  )
}
