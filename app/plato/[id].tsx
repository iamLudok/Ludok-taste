import { useMemo, useState } from 'react'
import { View, ScrollView, Pressable, StyleSheet, Alert } from 'react-native'
import { Image } from 'expo-image'
import { router, useLocalSearchParams } from 'expo-router'
import { Screen, Empty, Card } from '../../src/ui/Screen'
import { Txt } from '../../src/ui/Text'
import { Button } from '../../src/ui/Button'
import { Sheet } from '../../src/ui/Sheet'
import { Stars } from '../../src/ui/Stars'
import { usePalette } from '../../src/ui/ThemeProvider'
import { useLibrary } from '../../src/hooks/useLibrary'
import { summarize, deleteDishDeep, deleteTasting } from '../../src/lib/library'
import { deletePhotos, photoUri } from '../../src/lib/photos'
import { fmtDate } from '../../src/lib/dates'
import { fmtPrice } from '../../src/components/DishRow'
import { DishSheet } from '../../src/components/DishSheet'
import { TastingSheet } from '../../src/components/TastingSheet'
import { PhotoViewer } from '../../src/components/PhotoViewer'
import { radius, space } from '../../src/ui/theme'

export default function DishScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const palette = usePalette()
  const { restaurants, dishes, tastings, ready } = useLibrary()

  const [menu, setMenu] = useState(false)
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [viewing, setViewing] = useState<string | null>(null)

  const dish = dishes.find((d) => d.id === id)
  const restaurant = restaurants.find((r) => r.id === dish?.restaurantId)
  const own = useMemo(
    () => tastings.filter((t) => t.dishId === id).sort((a, b) => b.date.localeCompare(a.date)),
    [tastings, id],
  )
  const categories = useMemo(
    () =>
      [...new Set(
        dishes
          .filter((d) => d.restaurantId === dish?.restaurantId)
          .map((d) => d.category)
          .filter((c): c is string => !!c),
      )].sort((a, b) => a.localeCompare(b, 'es')),
    [dishes, dish?.restaurantId],
  )

  if (!dish) {
    return (
      <Screen title="Plato" onBack={() => router.back()}>
        <Empty text={ready ? 'Este plato ya no está.' : 'Cargando…'} />
      </Screen>
    )
  }

  const { count, avg } = summarize(own)

  const removeDish = () => {
    Alert.alert(`¿Borrar ${dish.name}?`, 'Se borra también su historial y sus fotos.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          deletePhotos(await deleteDishDeep(dish.id))
          setMenu(false)
          router.back()
        },
      },
    ])
  }

  const removeTasting = (tastingId: string) => {
    Alert.alert('¿Borrar esta vez?', 'Se borra la nota, el comentario y la foto de ese día.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => deletePhotos(await deleteTasting(tastingId)),
      },
    ])
  }

  return (
    <Screen
      title={dish.name}
      subtitle={[restaurant?.name, dish.category].filter(Boolean).join(' · ')}
      onBack={() => router.back()}
      padded={false}
      right={
        <Pressable
          onPress={() => setMenu(true)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Opciones del plato"
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <Txt variant="title" tone="muted">
            ⋯
          </Txt>
        </Pressable>
      }
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          {dish.archived && (
            <Txt variant="label" tone="warn">
              Ya no está en la carta
            </Txt>
          )}
          {dish.description ? <Txt variant="body">{dish.description}</Txt> : null}
          <View style={styles.meta}>
            {dish.price !== undefined && <Txt variant="data">{fmtPrice(dish.price)}</Txt>}
            {avg !== null && (
              <View style={styles.metaItem}>
                <Stars value={avg} />
                <Txt variant="data" tone="muted">
                  {avg.toFixed(1)}
                </Txt>
              </View>
            )}
            <Txt variant="data" tone="faint">
              {count ? `probado ${count} ${count === 1 ? 'vez' : 'veces'}` : 'sin probar todavía'}
            </Txt>
          </View>
        </Card>

        <Button title="He comido esto" kind="primary" onPress={() => setAdding(true)} />

        {own.length === 0 ? (
          <Txt variant="small" tone="faint">
            Cuando lo pruebes, apunta aquí qué te pareció y hazle una foto.
          </Txt>
        ) : (
          own.map((tasting) => (
            <View
              key={tasting.id}
              style={[styles.tasting, { backgroundColor: palette.surface, borderColor: palette.line }]}
            >
              {tasting.photo ? (
                <Pressable onPress={() => setViewing(tasting.photo ?? null)}>
                  <Image
                    source={{ uri: photoUri(tasting.photo) }}
                    style={[styles.photo, { backgroundColor: palette.surface2 }]}
                    contentFit="cover"
                    transition={120}
                  />
                </Pressable>
              ) : null}
              <View style={styles.tastingBody}>
                <View style={styles.tastingHead}>
                  <Txt variant="data" tone="muted">
                    {fmtDate(tasting.date)}
                  </Txt>
                  {tasting.rating ? (
                    <Stars value={tasting.rating} />
                  ) : (
                    <Txt variant="small" tone="faint">
                      sin nota
                    </Txt>
                  )}
                  <View style={{ flex: 1 }} />
                  <Button title="Borrar" small kind="ghost" onPress={() => removeTasting(tasting.id)} />
                </View>
                {tasting.note ? <Txt variant="body">{tasting.note}</Txt> : null}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {adding && <TastingSheet dish={dish} onClose={() => setAdding(false)} />}

      {editing && (
        <DishSheet
          restaurantId={dish.restaurantId}
          categories={categories}
          existing={dish}
          onClose={() => setEditing(false)}
        />
      )}

      {viewing && <PhotoViewer name={viewing} onClose={() => setViewing(null)} />}

      {menu && (
        <Sheet title={dish.name} onClose={() => setMenu(false)}>
          <Button
            title="Editar plato"
            onPress={() => {
              setMenu(false)
              setEditing(true)
            }}
          />
          <Button title="Borrar plato" kind="danger" onPress={removeDish} />
          <Txt variant="small" tone="faint">
            Si el plato ha desaparecido de la carta pero quieres conservar lo que apuntaste, edítalo
            y márcalo como «ya no está» en vez de borrarlo.
          </Txt>
        </Sheet>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.lg, paddingBottom: space.xxl, gap: space.md },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  tasting: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  photo: { width: '100%', height: 200 },
  tastingBody: { padding: space.lg, gap: space.sm },
  tastingHead: { flexDirection: 'row', alignItems: 'center', gap: space.md },
})
