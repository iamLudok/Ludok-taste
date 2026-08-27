import { useState } from 'react'
import { View, Pressable, StyleSheet, Alert } from 'react-native'
import { Sheet } from '../ui/Sheet'
import { Field } from '../ui/Field'
import { Button } from '../ui/Button'
import { Txt } from '../ui/Text'
import { usePalette } from '../ui/ThemeProvider'
import { saveDish } from '../lib/library'
import { trimmed, parsePrice } from '../lib/rows'
import { radius, space } from '../ui/theme'
import type { Dish } from '../types'

/**
 * Alta y edición de un plato.
 *
 * Las categorías que ya existen en esta carta se ofrecen como atajos: es el
 * equivalente del `<datalist>` que tenía la web, y evita acabar con «Pinchos»,
 * «pinchos» y «Pintxos» como tres secciones distintas.
 */
export function DishSheet({
  restaurantId,
  categories,
  existing,
  onClose,
}: {
  restaurantId: string
  categories: string[]
  existing?: Dish
  onClose: () => void
}) {
  const palette = usePalette()
  const [name, setName] = useState(existing?.name ?? '')
  const [category, setCategory] = useState(existing?.category ?? '')
  const [price, setPrice] = useState(existing?.price !== undefined ? String(existing.price) : '')
  const [description, setDescription] = useState(existing?.description ?? '')
  const [archived, setArchived] = useState(existing?.archived ?? false)
  const [busy, setBusy] = useState(false)

  const save = async () => {
    if (!name.trim()) {
      Alert.alert('Falta el nombre', 'Ponle nombre al plato para poder marcarlo después.')
      return
    }
    setBusy(true)
    try {
      await saveDish({
        id: existing?.id,
        restaurantId,
        name,
        category: trimmed(category),
        price: parsePrice(price),
        description: trimmed(description),
        archived,
      })
      onClose()
    } catch (e) {
      Alert.alert('No se pudo guardar', e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet
      title={existing ? 'Editar plato' : 'Nuevo plato'}
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
        placeholder="Pincho de tortilla con cebolla"
        maxLength={120}
        autoFocus={!existing}
      />

      <Field
        label="Categoría"
        hint="opcional"
        value={category}
        onChangeText={setCategory}
        placeholder="Pinchos"
        maxLength={60}
      />
      {categories.length > 0 && (
        <View style={styles.cats}>
          {categories.map((c) => (
            <Pressable
              key={c}
              onPress={() => setCategory(c)}
              style={({ pressed }) => [
                styles.cat,
                {
                  borderColor: c === category.trim() ? palette.fg : palette.line,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <Txt variant="small" tone={c === category.trim() ? 'fg' : 'muted'}>
                {c}
              </Txt>
            </Pressable>
          ))}
        </View>
      )}

      <Field
        label="Precio"
        hint="€, opcional"
        value={price}
        onChangeText={setPrice}
        placeholder="2,50"
        inputMode="decimal"
        maxLength={10}
      />
      <Field
        label="Descripción"
        hint="opcional"
        value={description}
        onChangeText={setDescription}
        placeholder="Con pan, poco hecha…"
        multiline
      />

      {existing && (
        <Pressable
          onPress={() => setArchived((v) => !v)}
          accessibilityRole="switch"
          accessibilityState={{ checked: archived }}
          style={({ pressed }) => [
            styles.toggle,
            { borderColor: palette.line, opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <View
            style={[
              styles.dot,
              {
                borderColor: archived ? palette.fg : palette.line,
                backgroundColor: archived ? palette.fg : 'transparent',
              },
            ]}
          />
          <View style={{ flex: 1 }}>
            <Txt variant="small" style={{ fontWeight: '600' }}>
              Ya no está en la carta
            </Txt>
            <Txt variant="small" tone="faint">
              Sigue en el historial, pero deja de contar para el progreso.
            </Txt>
          </View>
        </Pressable>
      )}
    </Sheet>
  )
}

const styles = StyleSheet.create({
  cats: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  cat: {
    paddingVertical: 5,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: space.md,
  },
  dot: { width: 18, height: 18, borderRadius: radius.pill, borderWidth: 2 },
})
