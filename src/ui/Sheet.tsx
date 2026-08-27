import {
  Modal,
  Pressable,
  ScrollView,
  View,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { usePalette } from './ThemeProvider'
import { Txt } from './Text'
import { space } from './theme'

/**
 * Hoja inferior: lo que en la web eran los diálogos modales.
 *
 * Sale de abajo porque todos los formularios de esta app se rellenan con una
 * mano y con el teclado abierto; arriba, el pulgar no llega y el teclado tapa
 * justo el campo que estás escribiendo.
 */
export function Sheet({
  title,
  onClose,
  children,
  footer,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  const palette = usePalette()
  const insets = useSafeAreaInsets()

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={[styles.backdrop, { backgroundColor: palette.scrim }]} onPress={onClose}>
          <Pressable
            style={[
              styles.sheet,
              {
                backgroundColor: palette.surface,
                borderColor: palette.line,
                paddingBottom: space.lg + insets.bottom,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.handle, { backgroundColor: palette.surface2 }]} />
            <Txt variant="title" numberOfLines={2}>
              {title}
            </Txt>
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.lg,
    gap: space.md,
    // Deja ver el fondo por arriba: recuerda que esto es una capa encima de la
    // pantalla, no una pantalla nueva.
    maxHeight: '88%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center' },
  content: { gap: space.md, paddingBottom: space.xs },
  footer: { flexDirection: 'row', gap: space.sm },
})
