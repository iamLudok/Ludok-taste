import { View, StyleSheet } from 'react-native'
import { usePalette } from './ThemeProvider'
import { radius } from './theme'

/**
 * La barra de progreso de una carta: cuánto has probado de lo que hay.
 * Es la idea que traía la PWA de «completar el álbum de cromos».
 */
export function Progress({ percent }: { percent: number }) {
  const palette = usePalette()
  return (
    <View style={[styles.track, { backgroundColor: palette.surface2 }]}>
      <View
        style={[
          styles.fill,
          { backgroundColor: palette.fg, width: `${Math.max(0, Math.min(100, percent))}%` },
        ]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  track: { height: 4, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill },
})
