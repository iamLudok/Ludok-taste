import { Tabs } from 'expo-router'
import { View, StyleSheet, type ColorValue } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { usePalette } from '../../src/ui/ThemeProvider'
import { radius } from '../../src/ui/theme'

/**
 * Las tres pestañas. Los iconos son formas geométricas dibujadas con vistas en
 * vez de emojis: en «Sala oscura» la interfaz es monocroma, y un emoji a color
 * rompería justo eso.
 */
type Shape = 'plate' | 'stats' | 'settings'

function Icon({ shape, color }: { shape: Shape; color: ColorValue }) {
  if (shape === 'plate') {
    return (
      <View style={styles.box}>
        <View style={[styles.plate, { borderColor: color }]} />
        <View style={[styles.plateInner, { borderColor: color }]} />
      </View>
    )
  }
  if (shape === 'stats') {
    return (
      <View style={[styles.row, { alignItems: 'flex-end' }]}>
        <View style={[styles.bar, { backgroundColor: color, height: 7 }]} />
        <View style={[styles.bar, { backgroundColor: color, height: 14 }]} />
        <View style={[styles.bar, { backgroundColor: color, height: 18 }]} />
      </View>
    )
  }
  return (
    <View style={styles.box}>
      <View style={[styles.ring, { borderColor: color }]} />
    </View>
  )
}

export default function TabsLayout() {
  const palette = usePalette()
  // La barra de gestos del sistema se come el texto de las pestañas si no se
  // deja hueco por debajo (se ve en móviles con navegación por gestos).
  const insets = useSafeAreaInsets()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: palette.bg },
        tabBarActiveTintColor: palette.fg,
        tabBarInactiveTintColor: palette.faint,
        tabBarStyle: {
          backgroundColor: palette.bg,
          borderTopColor: palette.line,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 62 + insets.bottom,
          paddingTop: 6,
          paddingBottom: 8 + insets.bottom,
        },
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Restaurantes',
          tabBarIcon: ({ color }) => <Icon shape="plate" color={color} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{ title: 'Stats', tabBarIcon: ({ color }) => <Icon shape="stats" color={color} /> }}
      />
      <Tabs.Screen
        name="ajustes"
        options={{ title: 'Ajustes', tabBarIcon: ({ color }) => <Icon shape="settings" color={color} /> }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  box: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 2.5, height: 20 },
  bar: { width: 3.5, borderRadius: 1.5 },
  plate: { position: 'absolute', width: 19, height: 19, borderRadius: radius.pill, borderWidth: 2 },
  plateInner: { position: 'absolute', width: 9, height: 9, borderRadius: radius.pill, borderWidth: 1.5 },
  ring: { width: 17, height: 17, borderRadius: radius.pill, borderWidth: 3 },
})
