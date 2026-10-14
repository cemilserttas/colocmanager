/**
 * Frequency picker component for cleaning tasks
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, SegmentedButtons } from 'react-native-paper';
import { theme } from '../../constants/theme';
import { CleaningFrequency } from '../../types';

interface FrequencyPickerProps {
  /** Currently selected frequency */
  value: CleaningFrequency;
  /** Called when frequency changes */
  onChange: (frequency: CleaningFrequency) => void;
  /** Optional label */
  label?: string;
}

const FrequencyPicker: React.FC<FrequencyPickerProps> = ({
  value,
  onChange,
  label = 'Fréquence',
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <SegmentedButtons
        value={value}
        onValueChange={(val) => onChange(val as CleaningFrequency)}
        buttons={[
          {
            value: 'weekly',
            label: 'Hebdo',
            icon: 'calendar-week',
          },
          {
            value: 'biweekly',
            label: 'Bi-hebdo',
            icon: 'calendar-range',
          },
          {
            value: 'monthly',
            label: 'Mensuel',
            icon: 'calendar-month',
          },
        ]}
        style={styles.buttons}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: theme.spacing.sm,
  },
  label: {
    fontSize: theme.typography.fontSizes.caption,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  buttons: {
    // Handled by SegmentedButtons internally
  },
});

export default FrequencyPicker;
