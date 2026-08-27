import { View, TextInput, StyleSheet, type TextInputProps } from 'react-native'
import { usePalette } from './ThemeProvider'
import { Txt } from './Text'
import { radius, space } from './theme'

interface Props extends TextInputProps {
  label: string
  /** Se pinta a la derecha de la etiqueta, en pequeño ('opcional', '€'…). */
  hint?: string
}

/** Campo de formulario: etiqueta encima y caja debajo, siempre igual. */
export function Field({ label, hint, style, multiline, ...rest }: Props) {
  const palette = usePalette()
  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Txt variant="label" tone="faint">
          {label}
        </Txt>
        {hint ? (
          <Txt variant="small" tone="faint">
            {hint}
          </Txt>
        ) : null}
      </View>
      <TextInput
        {...rest}
        multiline={multiline}
        placeholderTextColor={palette.faint}
        style={[
          styles.input,
          { borderColor: palette.line, color: palette.fg, backgroundColor: palette.surface2 },
          multiline && styles.multiline,
          style,
        ]}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs },
  labelRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  input: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    fontSize: 14,
  },
  multiline: { minHeight: 76, textAlignVertical: 'top' },
})
