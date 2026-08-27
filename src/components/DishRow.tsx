import { View, Pressable, StyleSheet } from 'react-native'
import { router } from 'expo-router'
import { Txt } from '../ui/Text'
import { Stars } from '../ui/Stars'
import { usePalette } from '../ui/ThemeProvider'
import { summarize } from '../lib/library'
import { fmtDateShort } from '../lib/dates'
import { radius, space } from '../ui/theme'
import type { Dish, Tasting } from '../types'

/** '2.5' → '2,50 €'. En euros y con coma, que es como se lee aquí. */
export function fmtPrice(price: number): string {
  return `${price.toFixed(2).replace('.', ',')} €`
}

/**
 * Una línea de la carta. El círculo de la izquierda es el atajo de siempre:
 * marcar que lo has comido sin entrar en la ficha, que es lo que se hace en la
 * mesa con el plato delante.
 */
export function DishRow({
  dish,
  tastings,
  onQuick,
}: {
  dish: Dish
  tastings: Tasting[]
  onQuick: () => void
}) {
  const palette = usePalette()
  const { count, avg, last } = summarize(tastings)

  return (
    <View style={[styles.row, { borderBottomColor: palette.line }]}>
      <Pressable
        onPress={onQuick}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={count ? `Comer otra vez ${dish.name}` : `Marcar ${dish.name} como probado`}
        style={({ pressed }) => [
          styles.check,
          {
            borderColor: count ? palette.fg : palette.line,
            backgroundColor: count ? palette.fg : 'transparent',
            opacity: pressed ? 0.6 : 1,
          },
        ]}
      >
        {count > 0 && (
          <Txt variant="small" style={{ color: palette.onFg, fontWeight: '700' }}>
            ✓
          </Txt>
        )}
      </Pressable>

      <Pressable
        onPress={() => router.push(`/plato/${dish.id}`)}
        style={({ pressed }) => [styles.main, { opacity: pressed ? 0.6 : 1 }]}
      >
        <Txt variant="body" numberOfLines={2} tone={dish.archived ? 'faint' : 'fg'}>
          {dish.name}
          {dish.archived ? '  · ya no está' : ''}
        </Txt>
        <View style={styles.meta}>
          {avg !== null && <Stars value={avg} />}
          {count > 0 && (
            <Txt variant="data" tone="faint">
              {count}×{last ? ` · ${fmtDateShort(last)}` : ''}
            </Txt>
          )}
          {dish.price !== undefined && (
            <Txt variant="data" tone="faint">
              {fmtPrice(dish.price)}
            </Txt>
          )}
        </View>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: { flex: 1, gap: space.xs },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.md },
})
