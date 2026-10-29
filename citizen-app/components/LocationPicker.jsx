/**
 * components/LocationPicker.jsx
 *
 * Requests the device's GPS location when the citizen taps the button.
 * Uses expo-location.
 *
 * States handled:
 *   idle          — user has not requested location yet
 *   loading       — waiting for GPS fix
 *   granted       — coordinates displayed
 *   denied        — permission refused
 *   unavailable   — location services off or timed out
 *   error         — unexpected failure
 *
 * Coordinates are included in the issue request when a report is submitted.
 * No coordinates are fabricated or assumed.
 */
import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import * as Location from 'expo-location';
import Colors from '../constants/colors';

/** @typedef {'idle'|'loading'|'granted'|'denied'|'unavailable'|'error'} LocationStatus */

/**
 * @param {object}        props
 * @param {object|null}   props.location    — { latitude, longitude, accuracy } or null
 * @param {function}      props.onLocation  — called with coords object or null (on clear)
 * @param {boolean}       [props.disabled]
 */
export default function LocationPicker({ location, onLocation, disabled = false }) {
  /** @type {[LocationStatus, function]} */
  const [status, setStatus] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const requestLocation = async () => {
    if (disabled) return;
    setStatus('loading');
    setErrorMsg('');

    try {
      // 1. Request foreground permission
      const { status: permStatus } =
        await Location.requestForegroundPermissionsAsync();

      if (permStatus !== 'granted') {
        setStatus('denied');
        return;
      }

      // 2. Check if location services are enabled on device
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        setStatus('unavailable');
        setErrorMsg('Location services are turned off on your device. Enable them in Settings and try again.');
        return;
      }

      // 3. Get current position (high accuracy, 15 s timeout)
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 15000,
      });

      onLocation({
        latitude:  parseFloat(pos.coords.latitude.toFixed(6)),
        longitude: parseFloat(pos.coords.longitude.toFixed(6)),
        accuracy:  pos.coords.accuracy ? Math.round(pos.coords.accuracy) : null,
      });
      setStatus('granted');
    } catch (err) {
      // Timed-out or other native error
      if (err.message?.toLowerCase().includes('timeout') ||
          err.message?.toLowerCase().includes('unavailable')) {
        setStatus('unavailable');
        setErrorMsg('Could not get a GPS fix. Make sure you are outdoors and try again.');
      } else {
        setStatus('error');
        setErrorMsg('An unexpected error occurred. Please try again.');
      }
    }
  };

  const handleClear = () => {
    onLocation(null);
    setStatus('idle');
    setErrorMsg('');
  };

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderIdle = () => (
    <TouchableOpacity
      style={[styles.actionBtn, disabled && styles.actionBtnDisabled]}
      onPress={requestLocation}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Get my current GPS location"
    >
      <Text style={styles.actionBtnIcon}>📍</Text>
      <Text style={styles.actionBtnText}>Get My Location</Text>
    </TouchableOpacity>
  );

  const renderLoading = () => (
    <View style={styles.loadingRow}>
      <ActivityIndicator color={Colors.primary} size="small" />
      <Text style={styles.loadingText}>Getting GPS location…</Text>
    </View>
  );

  const renderGranted = () => (
    <View style={styles.coordCard}>
      <View style={styles.coordHeader}>
        <Text style={styles.coordTitle}>📍 Location Obtained</Text>
        <TouchableOpacity
          onPress={handleClear}
          accessibilityRole="button"
          accessibilityLabel="Clear location"
        >
          <Text style={styles.clearBtn}>✕ Clear</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.coordRow}>
        <View style={styles.coordItem}>
          <Text style={styles.coordKey}>Latitude</Text>
          <Text style={styles.coordVal}>{location?.latitude}</Text>
        </View>
        <View style={styles.coordDivider} />
        <View style={styles.coordItem}>
          <Text style={styles.coordKey}>Longitude</Text>
          <Text style={styles.coordVal}>{location?.longitude}</Text>
        </View>
      </View>
      {location?.accuracy != null && (
        <Text style={styles.accuracyText}>
          Accuracy: ±{location.accuracy} m
        </Text>
      )}
      <Text style={styles.coordNotice}>
        Coordinates will be shared with the community when you submit this report.
      </Text>
    </View>
  );

  const renderProblem = (icon, message) => (
    <View style={styles.problemBanner}>
      <Text style={styles.problemText}>{icon} {message}</Text>
      <TouchableOpacity
        style={styles.retryBtn}
        onPress={requestLocation}
        accessibilityRole="button"
        accessibilityLabel="Retry getting location"
      >
        <Text style={styles.retryBtnText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>GPS Location</Text>

      {status === 'idle'        && renderIdle()}
      {status === 'loading'     && renderLoading()}
      {status === 'granted'     && renderGranted()}
      {status === 'denied'      && renderProblem('📵',
        'Location permission was denied. Enable it in Settings → Apps → CivicFix → Permissions.')}
      {status === 'unavailable' && renderProblem('📡', errorMsg || 'Location unavailable.')}
      {status === 'error'       && renderProblem('⚠️', errorMsg || 'Unexpected error.')}
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

  // Idle button
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    backgroundColor: Colors.primaryLight,
  },
  actionBtnDisabled: { opacity: 0.5 },
  actionBtnIcon: { fontSize: 18 },
  actionBtnText: { fontSize: 14, fontWeight: '600', color: Colors.primary },

  // Loading
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
  },
  loadingText: { fontSize: 14, color: Colors.primary },

  // Coordinate card
  coordCard: {
    backgroundColor: Colors.successLight,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  coordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  coordTitle: { fontSize: 13, fontWeight: '700', color: Colors.success },
  clearBtn:   { fontSize: 12, color: '#C62828', fontWeight: '600' },

  coordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  coordItem:    { flex: 1, alignItems: 'center' },
  coordDivider: { width: 1, height: 36, backgroundColor: '#A5D6A7' },
  coordKey: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  coordVal: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.success,
    fontFamily: 'monospace',
  },
  accuracyText: { fontSize: 11, color: Colors.textMuted, textAlign: 'center', marginBottom: 6 },
  coordNotice:  { fontSize: 11, color: Colors.textMuted, textAlign: 'center', fontStyle: 'italic' },

  // Problem banner
  problemBanner: {
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  problemText: { fontSize: 13, color: '#5D4037', lineHeight: 19, marginBottom: 10 },
  retryBtn: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.warning,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  retryBtnText: { fontSize: 13, color: '#fff', fontWeight: '600' },
});
