import { Modal, Pressable, StyleSheet } from 'react-native'
import { Image } from 'expo-image'
import { usePalette } from '../ui/ThemeProvider'
import { photoUri } from '../lib/photos'

/** La foto a pantalla completa. Se cierra tocando en cualquier sitio. */
export function PhotoViewer({ name, onClose }: { name: string; onClose: () => void }) {
  const palette = usePalette()
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={[styles.backdrop, { backgroundColor: palette.scrim }]} onPress={onClose}>
        <Image source={{ uri: photoUri(name) }} style={styles.photo} contentFit="contain" />
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  photo: { width: '100%', height: '80%' },
})
