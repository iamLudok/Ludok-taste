import { Pressable, StyleSheet } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { usePalette } from './ThemeProvider'
import { Txt } from './Text'
import { radius, space } from './theme'

/**
 * Botón flotante de «añadir». Va abajo a la derecha, al alcance del pulgar, y
 * se separa de la barra de gestos del sistema para no pelearse con ella.
 */
export function Fab({
  title,
  onPress,
  /** Píxeles extra por debajo, para cuando hay barra de pestañas detrás. */
  offset = 0,
}: {
  title: string
  onPress: () => void
  offset?: number
}) {
  const palette = usePalette()
  const insets = useSafeAreaInsets()

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.fab,
        {
          backgroundColor: palette.fg,
          bottom: space.lg + insets.bottom + offset,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Txt variant="body" style={{ color: palette.onFg, fontWeight: '700' }}>
        {title}
      </Txt>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: space.lg,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    elevation: 4,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
})
