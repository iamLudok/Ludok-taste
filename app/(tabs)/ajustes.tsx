import { useState } from 'react'
import { ScrollView, View, StyleSheet, Alert } from 'react-native'
import { Screen, Card } from '../../src/ui/Screen'
import { Txt } from '../../src/ui/Text'
import { Button } from '../../src/ui/Button'
import { Chips } from '../../src/ui/Chips'
import { usePalette } from '../../src/ui/ThemeProvider'
import { radius, space } from '../../src/ui/theme'
import { useSettings } from '../../src/hooks/useSettings'
import { useLibrary } from '../../src/hooks/useLibrary'
import { updateSettings } from '../../src/lib/settings'
import { shareBackup, pickJsonFile, importAll, daysSinceBackup } from '../../src/lib/backup'
import { computeStats } from '../../src/lib/library'
import { NextcloudSettings } from '../../src/components/NextcloudSettings'

const THEMES = [
  { key: 'system' as const, label: 'Sistema' },
  { key: 'dark' as const, label: 'Oscuro' },
  { key: 'light' as const, label: 'Claro' },
]

export default function SettingsScreen() {
  const settings = useSettings()
  const palette = usePalette()
  const { restaurants, dishes, tastings } = useLibrary()
  const [busy, setBusy] = useState(false)

  const stats = computeStats(restaurants, dishes, tastings)
  const photos = tastings.filter((t) => t.photo).length
  const days = daysSinceBackup(settings.lastBackup)
  const lastBackupText =
    days === null ? 'nunca' : days === 0 ? 'hoy' : `hace ${days} ${days === 1 ? 'día' : 'días'}`

  const doExport = async () => {
    setBusy(true)
    try {
      await shareBackup()
    } catch (e) {
      Alert.alert('No se pudo exportar', e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setBusy(false)
    }
  }

  const doImport = async () => {
    setBusy(true)
    try {
      const raw = await pickJsonFile()
      if (!raw) return
      // Se pregunta DESPUÉS de elegir el fichero, para que la decisión se tome
      // sabiendo ya qué copia es.
      Alert.alert(
        'Importar copia',
        'Esto reemplaza todos los restaurantes, platos y fotos que tienes ahora.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Reemplazar', style: 'destructive', onPress: () => runImport(raw) },
        ],
      )
    } catch (e) {
      Alert.alert('No se pudo leer', e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setBusy(false)
    }
  }

  const runImport = async (raw: string) => {
    setBusy(true)
    try {
      const res = await importAll(raw)
      Alert.alert(
        'Importado',
        `${res.restaurants} restaurantes, ${res.dishes} platos, ${res.tastings} veces y ${res.photos} fotos.` +
          (res.legacy ? '\n\nVenía de la versión web.' : ''),
      )
    } catch (e) {
      Alert.alert('Error al importar', e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen title="Ajustes" padded={false}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Copias — lo más importante de la app */}
        <Card>
          <Txt variant="title">Copia de seguridad</Txt>
          <Txt variant="small" tone="muted">
            Tus datos viven solo en este móvil. Exporta a menudo y guarda el fichero donde quieras:
            las fotos van dentro del propio JSON, así que una copia lo lleva todo.
          </Txt>
          <View style={[styles.stat, { borderColor: palette.line }]}>
            <Row label="Restaurantes" value={String(stats.restaurants)} />
            <Row label="Platos" value={String(stats.dishes)} />
            <Row label="Veces apuntadas" value={String(stats.tastings)} />
            <Row label="Fotos" value={String(photos)} />
            <Row label="Última copia" value={lastBackupText} />
          </View>
          <Button title="Exportar copia" kind="primary" onPress={doExport} disabled={busy} />
          <Button title="Importar copia" onPress={doImport} disabled={busy} />
          <Txt variant="small" tone="faint">
            También se pueden importar las copias de la versión web (`ludrest-backup-….json`).
          </Txt>
        </Card>

        <NextcloudSettings />

        {/* Tema */}
        <Card>
          <Txt variant="title">Tema</Txt>
          <Txt variant="small" tone="muted">
            La app está diseñada en oscuro, pero el claro está cuidado igual.
          </Txt>
          <Chips options={THEMES} value={settings.theme} onChange={(theme) => updateSettings({ theme })} />
        </Card>

        <Txt variant="small" tone="faint" style={{ textAlign: 'center' }}>
          Ludok Taste · tus datos, tuyos.
        </Txt>
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
  stat: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: space.md,
    gap: space.xs,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
})
