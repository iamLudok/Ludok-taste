import { useMemo, useState } from 'react'
import { View, FlatList, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Screen, Empty } from '../../src/ui/Screen'
import { Txt } from '../../src/ui/Text'
import { Fab } from '../../src/ui/Fab'
import { Progress } from '../../src/ui/Progress'
import { usePalette } from '../../src/ui/ThemeProvider'
import { useLibrary } from '../../src/hooks/useLibrary'
import { progressOf } from '../../src/lib/library'
import { RestaurantSheet } from '../../src/components/RestaurantSheet'
import BackupBanner from '../../src/components/BackupBanner'
import { radius, space } from '../../src/ui/theme'
import type { Restaurant } from '../../src/types'

interface Card {
  restaurant: Restaurant
  tried: number
  total: number
  percent: number
  complete: boolean
}

export default function RestaurantesScreen() {
  const palette = usePalette()
  const { restaurants, dishes, tastings, ready } = useLibrary()
  const [adding, setAdding] = useState(false)

  const cards = useMemo<Card[]>(() => {
    return [...restaurants]
      .sort((a, b) => a.name.localeCompare(b.name, 'es'))
      .map((restaurant) => ({
        restaurant,
        ...progressOf(
          dishes.filter((d) => d.restaurantId === restaurant.id),
          tastings.filter((t) => t.restaurantId === restaurant.id),
        ),
      }))
  }, [restaurants, dishes, tastings])

  return (
    <Screen title="Ludrest" padded={false}>
      <FlatList
        data={cards}
        keyExtractor={(c) => c.restaurant.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<BackupBanner />}
        ListEmptyComponent={
          ready ? (
            <Empty
              text="Todavía no hay restaurantes."
              hint="Añade tu pizzería de Bilbao o ese bar de Durango con tantos pinchos de tortilla…"
            />
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/restaurante/${item.restaurant.id}`)}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: palette.surface, borderColor: palette.line, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <View style={styles.head}>
              <Txt variant="title" numberOfLines={1} style={{ flex: 1 }}>
                {item.restaurant.name}
              </Txt>
              {item.complete && (
                <Txt variant="label" tone="faint">
                  Completa
                </Txt>
              )}
            </View>
            {item.restaurant.city ? (
              <Txt variant="small" tone="muted" numberOfLines={1}>
                {item.restaurant.city}
              </Txt>
            ) : null}
            <Progress percent={item.percent} />
            <Txt variant="data" tone="faint">
              {item.total ? `${item.tried}/${item.total} probados` : 'carta vacía'}
            </Txt>
          </Pressable>
        )}
      />

      <Fab title="＋ Restaurante" onPress={() => setAdding(true)} offset={62} />

      {adding && (
        <RestaurantSheet
          onClose={() => setAdding(false)}
          onSaved={(id) => router.push(`/restaurante/${id}`)}
        />
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: space.lg,
    paddingBottom: 96,
    gap: space.md,
    flexGrow: 1,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.lg,
    gap: space.sm,
  },
  head: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
})
