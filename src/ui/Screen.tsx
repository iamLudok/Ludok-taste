import { View, Pressable, StyleSheet, type ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { usePalette } from './ThemeProvider'
import { Txt } from './Text'
import { radius, space } from './theme'

/**
 * Contenedor de pantalla. Respeta la zona segura de arriba (barra de estado) y
 * deja el borde inferior a la barra de pestañas, que ya la gestiona el layout.
 */
export function Screen({
  children,
  title,
  subtitle,
  right,
  onBack,
  padded = true,
  style,
}: {
  children: React.ReactNode
  title?: string
  subtitle?: string
  right?: React.ReactNode
  /** Si se pasa, sale la flecha de volver a la izquierda del título. */
  onBack?: () => void
  padded?: boolean
  style?: ViewStyle
}) {
  const palette = usePalette()
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.root, { backgroundColor: palette.bg, paddingTop: insets.top }, style]}>
      {title !== undefined && (
        <View style={styles.head}>
          {onBack && (
            <Pressable
              onPress={onBack}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Volver"
              style={({ pressed }) => [styles.back, { opacity: pressed ? 0.5 : 1 }]}
            >
              <Txt variant="display" tone="muted">
                ‹
              </Txt>
            </Pressable>
          )}
          <View style={styles.headText}>
            <Txt variant="display" numberOfLines={1}>
              {title}
            </Txt>
            {subtitle ? (
              <Txt variant="small" tone="muted" numberOfLines={1}>
                {subtitle}
              </Txt>
            ) : null}
          </View>
          {right}
        </View>
      )}
      <View style={[styles.body, padded && styles.padded]}>{children}</View>
    </View>
  )
}

/** Estado vacío: un texto y, si hace falta, una acción. */
export function Empty({ text, hint, children }: { text: string; hint?: string; children?: React.ReactNode }) {
  return (
    <View style={styles.empty}>
      <Txt variant="body" tone="muted" style={{ textAlign: 'center' }}>
        {text}
      </Txt>
      {hint ? (
        <Txt variant="small" tone="faint" style={{ textAlign: 'center' }}>
          {hint}
        </Txt>
      ) : null}
      {children}
    </View>
  )
}

/** Bloque de contenido sobre la superficie elevada. */
export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const palette = usePalette()
  return (
    <View style={[styles.card, { backgroundColor: palette.surface, borderColor: palette.line }, style]}>
      {children}
    </View>
  )
}

/** Título de sección dentro de una lista («Pinchos», «Tus favoritos»…). */
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Txt variant="label" tone="faint" style={styles.sectionTitle}>
      {children}
    </Txt>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.sm,
  },
  headText: { flexShrink: 1, flexGrow: 1 },
  back: { marginBottom: -2 },
  body: { flex: 1 },
  padded: { paddingHorizontal: space.lg },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    padding: space.xl,
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.lg,
    gap: space.md,
  },
  sectionTitle: { paddingTop: space.lg, paddingBottom: space.xs },
})
