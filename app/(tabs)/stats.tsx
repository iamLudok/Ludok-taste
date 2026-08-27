import { useMemo } from 'react'
import { ScrollView, View, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Screen, Card, Empty } from '../../src/ui/Screen'
import { Txt } from '../../src/ui/Text'
import { Stars } from '../../src/ui/Stars'
import { usePalette } from '../../src/ui/ThemeProvider'
import { useLibrary } from '../../src/hooks/useLibrary'
import { computeStats, topDishes } from '../../src/lib/library'
import { space } from '../../src/ui/theme'

export default function StatsScreen() {
  const palette = usePalette()
  const { restaurants, dishes, tastings, ready } = useLibrary()

  const stats = useMemo(
    () => computeStats(restaurants, dishes, tastings),
    [restaurants, dishes, tastings],
  )
  const top = useMemo(
    () => topDishes(restaurants, dishes, tastings),
    [restaurants, dishes, tastings],
  )

  if (ready && restaurants.length === 0) {
    return (
      <Screen title="Stats">
        <Empty text="Aquí saldrán tus números cuando empieces a apuntar sitios." />
      </Screen>
    )
  }

  return (
    <Screen title="Stats" padded={false}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <Txt variant="title">De un vistazo</Txt>
          <Row label="Restaurantes" value={String(stats.restaurants)} />
          <Row label="Platos en carta" value={String(stats.dishes)} />
          <Row label="Probados" value={`${stats.tried} · ${stats.percent}%`} />
          <Row label="Cartas completas" value={String(stats.completed)} />
        </Card>

        <Card>
          <Txt variant="title">Lo que has comido</Txt>
          <Row label="Veces apuntadas" value={String(stats.tastings)} />
          <Row label="Nota media" value={stats.avg === null ? '—' : stats.avg.toFixed(1)} />
          <Row
            label="Gasto estimado"
            value={stats.spent ? `${stats.spent.toFixed(2).replace('.', ',')} €` : '—'}
          />
          <Txt variant="small" tone="faint">
            El gasto sale de sumar el precio de cada plato por las veces que lo has comido, así que
            solo cuenta lo que tenga precio apuntado.
          </Txt>
        </Card>

        <Card>
          <Txt variant="title">Tus mejores platos</Txt>
          {top.length === 0 ? (
            <Txt variant="small" tone="faint">
              Todavía no has puntuado nada. Pon estrellas y esto se llena solo.
            </Txt>
          ) : (
            top.map(({ dish, restaurantName, avg, count }) => (
              <Pressable
                key={dish.id}
                onPress={() => router.push(`/plato/${dish.id}`)}
                style={({ pressed }) => [
                  styles.top,
                  { borderBottomColor: palette.line, opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Txt variant="body" numberOfLines={1}>
                    {dish.name}
                  </Txt>
                  <Txt variant="small" tone="faint" numberOfLines={1}>
                    {restaurantName}
                    {count > 1 ? ` · ${count}×` : ''}
                  </Txt>
                </View>
                <Stars value={avg} />
              </Pressable>
            ))
          )}
        </Card>
      </ScrollView>
    </Screen>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Txt variant="small" tone="muted">
        {label}
      </Txt>
      <Txt variant="data">{value}</Txt>
    </View>
  )
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: space.xxl, gap: space.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
})
