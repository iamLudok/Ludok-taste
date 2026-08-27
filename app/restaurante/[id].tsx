import { useMemo, useState } from 'react'
import { View, ScrollView, Pressable, StyleSheet, Alert } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { Screen, Empty, SectionTitle } from '../../src/ui/Screen'
import { Txt } from '../../src/ui/Text'
import { Chips } from '../../src/ui/Chips'
import { Fab } from '../../src/ui/Fab'
import { Progress } from '../../src/ui/Progress'
import { useLibrary } from '../../src/hooks/useLibrary'
import { byDish, groupByCategory, progressOf, sortDishes, suggest, deleteRestaurantDeep } from '../../src/lib/library'
import { deletePhotos } from '../../src/lib/photos'
import { DishRow } from '../../src/components/DishRow'
import { DishSheet } from '../../src/components/DishSheet'
import { TastingSheet } from '../../src/components/TastingSheet'
import { RestaurantSheet } from '../../src/components/RestaurantSheet'
import { Sheet } from '../../src/ui/Sheet'
import { Button } from '../../src/ui/Button'
import { space } from '../../src/ui/theme'
import type { Dish } from '../../src/types'

type Tab = 'carta' | 'pedir'

const TABS = [
  { key: 'carta' as const, label: 'Carta' },
  { key: 'pedir' as const, label: '¿Qué pido hoy?' },
]

export default function RestaurantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { restaurants, dishes, tastings, ready } = useLibrary()

  const [tab, setTab] = useState<Tab>('carta')
  const [menu, setMenu] = useState(false)
  const [editing, setEditing] = useState(false)
  const [addingDish, setAddingDish] = useState(false)
  const [quickDish, setQuickDish] = useState<Dish | null>(null)

  const restaurant = restaurants.find((r) => r.id === id)
  const ownDishes = useMemo(() => dishes.filter((d) => d.restaurantId === id), [dishes, id])
  const ownTastings = useMemo(() => tastings.filter((t) => t.restaurantId === id), [tastings, id])
  const grouped = useMemo(() => byDish(ownTastings), [ownTastings])
  const progress = useMemo(() => progressOf(ownDishes, ownTastings), [ownDishes, ownTastings])
  const categories = useMemo(
    () => [...new Set(ownDishes.map((d) => d.category).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b, 'es')),
    [ownDishes],
  )
  const tips = useMemo(() => suggest(ownDishes, ownTastings), [ownDishes, ownTastings])

  if (!restaurant) {
    return (
      <Screen title="Restaurante" onBack={() => router.back()}>
        <Empty text={ready ? 'Este restaurante ya no está.' : 'Cargando…'} />
      </Screen>
    )
  }

  const remove = () => {
    Alert.alert(
      `¿Borrar ${restaurant.name}?`,
      'Se van con él todos sus platos, fotos y notas. No se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar',
          style: 'destructive',
          onPress: async () => {
            deletePhotos(await deleteRestaurantDeep(restaurant.id))
            setMenu(false)
            router.back()
          },
        },
      ],
    )
  }

  const rows = (list: Dish[]) =>
    list.map((dish) => (
      <DishRow
        key={dish.id}
        dish={dish}
        tastings={grouped.get(dish.id) ?? []}
        onQuick={() => setQuickDish(dish)}
      />
    ))

  return (
    <Screen
      title={restaurant.name}
      subtitle={restaurant.city}
      onBack={() => router.back()}
      padded={false}
      right={
        <Pressable
          onPress={() => setMenu(true)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Opciones del restaurante"
          style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
        >
          <Txt variant="title" tone="muted">
            ⋯
          </Txt>
        </Pressable>
      }
    >
      <View style={styles.top}>
        {restaurant.notes ? (
          <Txt variant="small" tone="muted">
            {restaurant.notes}
          </Txt>
        ) : null}
        <Progress percent={progress.percent} />
        <Txt variant="data" tone="faint">
          {progress.total
            ? `${progress.tried}/${progress.total} probados${progress.complete ? ' · carta completa' : ''}`
            : 'la carta está vacía'}
        </Txt>
        <Chips options={TABS} value={tab} onChange={setTab} />
      </View>

      <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
        {tab === 'carta' ? (
          ownDishes.length === 0 ? (
            <Empty
              text="La carta está vacía."
              hint="Añade los platos con «＋ Plato». Puedes ponerles categoría: pizzas, pinchos, postres…"
            />
          ) : (
            groupByCategory(ownDishes).map(({ category, dishes: list }) => (
              <View key={category}>
                <SectionTitle>{category}</SectionTitle>
                {rows(list)}
              </View>
            ))
          )
        ) : (
          <>
            <SectionTitle>Tus favoritos</SectionTitle>
            {tips.favourites.length ? (
              rows(tips.favourites)
            ) : (
              <Txt variant="small" tone="faint">
                Aún no hay platos con 4★ o más. ¡A comer!
              </Txt>
            )}

            <SectionTitle>Sin probar</SectionTitle>
            {tips.untried.length ? (
              rows(sortDishes(tips.untried))
            ) : (
              <Txt variant="small" tone="faint">
                Lo has probado todo. Enhorabuena.
              </Txt>
            )}

            {tips.avoid.length > 0 && (
              <>
                <SectionTitle>Mejor evita</SectionTitle>
                {rows(tips.avoid)}
              </>
            )}
          </>
        )}
      </ScrollView>

      <Fab title="＋ Plato" onPress={() => setAddingDish(true)} />

      {addingDish && (
        <DishSheet
          restaurantId={restaurant.id}
          categories={categories}
          onClose={() => setAddingDish(false)}
        />
      )}

      {quickDish && <TastingSheet dish={quickDish} onClose={() => setQuickDish(null)} />}

      {editing && <RestaurantSheet existing={restaurant} onClose={() => setEditing(false)} />}

      {menu && (
        <Sheet title={restaurant.name} onClose={() => setMenu(false)}>
          <Button
            title="Editar restaurante"
            onPress={() => {
              setMenu(false)
              setEditing(true)
            }}
          />
          <Button title="Borrar restaurante" kind="danger" onPress={remove} />
          <Txt variant="small" tone="faint">
            Borrar un restaurante se lleva por delante su carta y todo lo que hayas apuntado en él,
            fotos incluidas.
          </Txt>
        </Sheet>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: space.lg, paddingBottom: space.sm, gap: space.sm },
  list: { paddingHorizontal: space.lg, paddingBottom: 110 },
})
