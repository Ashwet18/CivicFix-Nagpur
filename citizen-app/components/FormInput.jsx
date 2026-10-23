/**
 * components/FormInput.jsx
 * Reusable labelled text input with inline error display.
 * Used by Login and Register screens.
 */
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import Colors from '../constants/colors';

/**
 * @param {object}  props
 * @param {string}  props.label          — field label shown above the input
 * @param {string}  props.value          — controlled value
 * @param {function}props.onChangeText   — change handler
 * @param {string}  [props.placeholder]
 * @param {string}  [props.error]        — validation error string; hides when falsy
 * @param {boolean} [props.secureEntry]  — enables show/hide toggle
 * @param {string}  [props.keyboardType]
 * @param {string}  [props.autoComplete]
 * @param {string}  [props.textContentType]
 * @param {boolean} [props.autoCapitalize]
 * @param {boolean} [props.editable]
 * @param {function}[props.onSubmitEditing]
 * @param {object}  [props.inputRef]    — ref forwarded to the TextInput
 */
export default function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  secureEntry = false,
  keyboardType = 'default',
  autoComplete,
  textContentType,
  autoCapitalize = 'none',
  editable = true,
  onSubmitEditing,
  inputRef,
}) {
  const [hidden, setHidden] = useState(secureEntry);

  return (
    <View style={styles.wrapper}>
      {/* Label */}
      <Text style={styles.label} accessibilityRole="text">
        {label}
      </Text>

      {/* Input row */}
      <View
        style={[
          styles.inputRow,
          !!error && styles.inputRowError,
          !editable && styles.inputRowDisabled,
        ]}
      >
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          secureTextEntry={hidden}
          keyboardType={keyboardType}
          autoComplete={autoComplete}
          textContentType={textContentType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          editable={editable}
          onSubmitEditing={onSubmitEditing}
          accessibilityLabel={label}
          accessibilityHint={error || undefined}
          returnKeyType={onSubmitEditing ? 'next' : 'done'}
        />

        {/* Show / hide toggle for password fields */}
        {secureEntry && (
          <TouchableOpacity
            onPress={() => setHidden((h) => !h)}
            style={styles.eyeButton}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          >
            <Text style={styles.eyeIcon}>{hidden ? '👁️' : '🙈'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Inline error */}
      {!!error && (
        <Text style={styles.errorText} accessibilityRole="alert">
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  inputRowError: {
    borderColor: '#C62828',
    backgroundColor: '#FFF5F5',
  },
  inputRowDisabled: {
    backgroundColor: '#F0F0F0',
    opacity: 0.7,
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  eyeButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  eyeIcon: {
    fontSize: 18,
  },
  errorText: {
    marginTop: 5,
    fontSize: 12,
    color: '#C62828',
    lineHeight: 16,
  },
});
