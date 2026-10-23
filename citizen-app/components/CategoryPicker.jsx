/**
 * components/CategoryPicker.jsx
 * Horizontal scrollable list of issue category chips.
 * Tapping a chip selects it; the selected chip shows a highlighted border.
 */
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import Colors from '../constants/colors';

export const CATEGORIES = [
  { id: 'pothole',    label: 'Pothole',             icon: '🚧' },
  { id: 'garbage',   label: 'Garbage',              icon: '🗑️' },
  { id: 'streetlight', label: 'Damaged Streetlight', icon: '💡' },
  { id: 'water',     label: 'Water Leakage',        icon: '💧' },
  { id: 'drainage',  label: 'Drainage',             icon: '🌊' },
  { id: 'other',     label: 'Other',                icon: '📌' },
];

/**
 * @param {object}   props
 * @param {string}   props.selected      — id of the currently selected category
 * @param {function} props.onSelect      — called with the category id
 * @param {string}   [props.error]       — validation error message
 * @param {boolean}  [props.disabled]
 */
export default function CategoryPicker({ selected, onSelect, error, disabled = false }) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Category <Text style={styles.required}>*</Text></Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        accessibilityRole="menu"
        accessibilityLabel="Issue category selector"
      >
        {CATEGORIES.map((cat) => {
          const isSelected = selected === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.chip,
                isSelected && styles.chipSelected,
                disabled && styles.chipDisabled,
              ]}
              onPress={() => !disabled && onSelect(cat.id)}
              accessibilityRole="menuitem"
              accessibilityLabel={cat.label}
              accessibilityState={{ selected: isSelected }}
              activeOpacity={0.75}
            >
              <Text style={styles.chipIcon}>{cat.icon}</Text>
              <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {!!error && (
        <Text style={styles.errorText} accessibilityRole="alert">{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 20 },

  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  required: { color: '#C62828' },

  row: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },

  chip: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    minWidth: 86,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  chipSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
    elevation: 2,
  },
  chipDisabled: {
    opacity: 0.5,
  },

  chipIcon:  { fontSize: 22, marginBottom: 5 },
  chipLabel: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },
  chipLabelSelected: { color: Colors.primary },

  errorText: {
    marginTop: 6,
    fontSize: 12,
    color: '#C62828',
  },
});
