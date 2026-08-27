import { Pressable, View, StyleSheet } from 'react-native'
import { usePalette } from './ThemeProvider'
import { Txt } from './Text'
import { space } from './theme'

/**
 * La nota de 1 a 5. Se dibuja con estrellas de texto y no con emojis: en una
 * interfaz monocroma un emoji a color rompería justo eso, y ★/☆ ya distinguen
 * lleno de vacío por su propia forma.
 */
export function Stars({ value, size = 13 }: { value: number; size?: number }) {
  const rounded = Math.round(value)
  return (
    <Txt variant="data" style={{ fontSize: size, letterSpacing: 1 }}>
      {'★'.repeat(rounded)}
      <Txt variant="data" tone="faint" style={{ fontSize: size, letterSpacing: 1 }}>
        {'☆'.repeat(Math.max(0, 5 - rounded))}
      </Txt>
    </Txt>
  )
}

/**
 * Selector de nota. Tocar la misma estrella que ya está puesta la quita: comer
 * algo sin puntuarlo es un caso normal («estaba, ni fu ni fa»), no un hueco que
 * haya que rellenar a la fuerza.
 */
export function StarPicker({
  value,
  onChange,
}: {
  value?: number
  onChange: (v: number | undefined) => void
}) {
  const palette = usePalette()
  const current = value ?? 0

  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          onPress={() => onChange(n === current ? undefined : n)}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={`${n} de 5`}
          accessibilityState={{ selected: n <= current }}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Txt style={{ fontSize: 26, color: n <= current ? palette.fg : palette.faint }}>
            {n <= current ? '★' : '☆'}
          </Txt>
        </Pressable>
      ))}
      <Txt variant="small" tone="faint" style={styles.hint}>
        {current ? `${current}/5` : 'sin nota'}
      </Txt>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  hint: { marginLeft: space.xs },
})
