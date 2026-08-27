import { useState } from 'react'
import { Alert } from 'react-native'
import { Sheet } from '../ui/Sheet'
import { Field } from '../ui/Field'
import { Button } from '../ui/Button'
import { saveRestaurant } from '../lib/library'
import { trimmed } from '../lib/rows'
import type { Restaurant } from '../types'

/**
 * Alta y edición de un restaurante. El mismo formulario para las dos cosas:
 * cambia el título y poco más, y así no hay dos sitios donde tocar cuando se
 * añade un campo.
 */
export function RestaurantSheet({
  existing,
  onClose,
  onSaved,
}: {
  existing?: Restaurant
  onClose: () => void
  onSaved?: (id: string) => void
}) {
  const [name, setName] = useState(existing?.name ?? '')
  const [city, setCity] = useState(existing?.city ?? '')
  const [notes, setNotes] = useState(existing?.notes ?? '')
  const [busy, setBusy] = useState(false)

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Falta el nombre', 'Un restaurante sin nombre no hay quien lo encuentre luego.')
      return
    }
    setBusy(true)
    try {
      const id = await saveRestaurant({
        id: existing?.id,
        name,
        city: trimmed(city),
        notes: trimmed(notes),
      })
      onSaved?.(id)
      onClose()
    } catch (e) {
      Alert.alert('No se pudo guardar', e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      title={existing ? 'Editar restaurante' : 'Nuevo restaurante'}
      onClose={onClose}
      footer={
        <>
          <Button title="Cancelar" onPress={onClose} style={{ flex: 1 }} />
          <Button title="Guardar" kind="primary" onPress={save} disabled={busy} style={{ flex: 1 }} />
        </>
      }
    >
      <Field
        label="Nombre"
        value={name}
        onChangeText={setName}
        placeholder="Pizzería Da Luken"
        maxLength={80}
        autoFocus={!existing}
      />
      <Field
        label="Ciudad o zona"
        hint="opcional"
        value={city}
        onChangeText={setCity}
        placeholder="Bilbao"
        maxLength={80}
      />
      <Field
        label="Notas"
        hint="opcional"
        value={notes}
        onChangeText={setNotes}
        placeholder="Cierran los lunes…"
        multiline
      />
    </Sheet>
  )
}
