import { useState } from 'react'
import { View, Pressable, StyleSheet, Alert, Platform } from 'react-native'
import { Image } from 'expo-image'
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { Sheet } from '../ui/Sheet'
import { Field } from '../ui/Field'
import { Button } from '../ui/Button'
import { Txt } from '../ui/Text'
import { StarPicker } from '../ui/Stars'
import { usePalette } from '../ui/ThemeProvider'
import { addTasting } from '../lib/library'
import { trimmed } from '../lib/rows'
import { todayISO, isoToDate, fmtDate } from '../lib/dates'
import { takePhoto, choosePhoto, deletePhotos, photoUri } from '../lib/photos'
import { radius, space } from '../ui/theme'
import type { Dish } from '../types'

/**
 * «He comido esto»: fecha, nota, comentario y foto.
 *
 * La foto se guarda en disco en cuanto se hace, no al pulsar Guardar: así el
 * formulario no tiene que manejar la imagen en memoria. Si al final se cancela,
 * ese fichero se borra aquí mismo para no dejar basura.
 */
export function TastingSheet({ dish, onClose }: { dish: Dish; onClose: () => void }) {
  const palette = usePalette()
  const [date, setDate] = useState(todayISO())
  const [picking, setPicking] = useState(false)
  const [rating, setRating] = useState<number | undefined>(undefined)
  const [note, setNote] = useState('')
  const [photo, setPhoto] = useState<string | undefined>(undefined)
  const [busy, setBusy] = useState(false)

  const onDatePicked = (event: DateTimePickerEvent, picked?: Date) => {
    // En Android el diálogo se cierra solo; hay que quitarlo del árbol o no se
    // puede volver a abrir.
    if (Platform.OS !== 'ios') setPicking(false)
    if (event.type === 'dismissed' || !picked) return
    setDate(todayISO(picked))
  }

  const addPhoto = async (source: 'camera' | 'library') => {
    setBusy(true)
    try {
      const name = source === 'camera' ? await takePhoto() : await choosePhoto()
      if (!name) return
      // Si ya había una, la anterior se queda sin dueño en cuanto se sustituye.
      if (photo) deletePhotos([photo])
      setPhoto(name)
    } catch (e) {
      Alert.alert('No se pudo añadir la foto', e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setBusy(false)
    }
  }

  const removePhoto = () => {
    if (photo) deletePhotos([photo])
    setPhoto(undefined)
  }

  const cancel = () => {
    removePhoto()
    onClose()
  }

  const save = async () => {
    setBusy(true)
    try {
      await addTasting({
        dishId: dish.id,
        restaurantId: dish.restaurantId,
        date,
        rating,
        note: trimmed(note),
        photo,
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
      title={dish.name}
      onClose={cancel}
      footer={
        <>
          <Button title="Cancelar" onPress={cancel} style={{ flex: 1 }} />
          <Button title="Guardar" kind="primary" onPress={save} disabled={busy} style={{ flex: 1 }} />
        </>
      }
    >
      <View style={styles.block}>
        <Txt variant="label" tone="faint">
          Cuándo
        </Txt>
        <Pressable
          onPress={() => setPicking(true)}
          style={({ pressed }) => [
            styles.dateBox,
            { borderColor: palette.line, backgroundColor: palette.surface2, opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Txt variant="body">{fmtDate(date)}</Txt>
          <Txt variant="small" tone="faint">
            cambiar
          </Txt>
        </Pressable>
        {picking && (
          <DateTimePicker
            mode="date"
            display="default"
            value={isoToDate(date)}
            maximumDate={new Date()}
            onChange={onDatePicked}
          />
        )}
      </View>

      <View style={styles.block}>
        <Txt variant="label" tone="faint">
          Qué tal estaba
        </Txt>
        <StarPicker value={rating} onChange={setRating} />
      </View>

      <Field
        label="Comentario"
        hint="opcional"
        value={note}
        onChangeText={setNote}
        placeholder="Jugosa, poco hecha por dentro. Repetir."
        multiline
      />

      <View style={styles.block}>
        <Txt variant="label" tone="faint">
          Foto
        </Txt>
        {photo ? (
          <>
            <Image
              source={{ uri: photoUri(photo) }}
              style={[styles.preview, { backgroundColor: palette.surface2 }]}
              contentFit="cover"
            />
            <View style={styles.photoActions}>
              <Button title="Cambiar" small onPress={() => addPhoto('camera')} disabled={busy} />
              <Button title="Quitar" small kind="danger" onPress={removePhoto} disabled={busy} />
            </View>
          </>
        ) : (
          <View style={styles.photoActions}>
            <Button title="Hacer foto" small onPress={() => addPhoto('camera')} disabled={busy} />
            <Button title="De la galería" small onPress={() => addPhoto('library')} disabled={busy} />
          </View>
        )}
      </View>
    </Sheet>
  )
}

const styles = StyleSheet.create({
  block: { gap: space.sm },
  dateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  preview: { width: '100%', height: 180, borderRadius: radius.md },
  photoActions: { flexDirection: 'row', gap: space.sm },
})
