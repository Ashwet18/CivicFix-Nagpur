/**
 * components/PhotoPicker.jsx
 *
 * Lets the citizen pick a photo from their gallery as evidence.
 * Uses expo-image-picker.
 *
 * States handled:
 *   idle          — no photo selected yet
 *   permission-denied — user denied media library access
 *   selected      — photo chosen, shows preview with remove/replace controls
 *
 * NOTE: The photo is held in local state only.
 * It is not uploaded to the API; the backend currently has no upload endpoint.
 */
import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Colors from '../constants/colors';

/**
 * @param {object}        props
 * @param {object|null}   props.photo       — current photo asset (uri, width, height) or null
 * @param {function}      props.onPhoto     — called with the asset object or null (on remove)
 * @param {boolean}       [props.disabled]
 */
export default function PhotoPicker({ photo, onPhoto, disabled = false }) {
  const [loading, setLoading]           = useState(false);
  const [permDenied, setPermDenied]     = useState(false);

  const requestAndPick = async () => {
    if (disabled) return;
    setLoading(true);
    setPermDenied(false);

    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        setPermDenied(true);
        setLoading(false);
        return;
      }

      // Launch picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length > 0) {
        onPhoto(result.assets[0]);
      }
      // If canceled: do nothing, keep existing state
    } catch (err) {
      Alert.alert('Photo Error', 'Could not open photo library. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    Alert.alert(
      'Remove Photo',
      'Remove the selected photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => onPhoto(null) },
      ]
    );
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Photo Evidence</Text>

      {/* ── Permission denied state ── */}
      {permDenied && (
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>
            📵 Photo library access was denied.{'\n'}
            Enable it in your device Settings → Apps → CivicFix → Permissions, then try again.
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => { setPermDenied(false); requestAndPick(); }}
            accessibilityRole="button"
            accessibilityLabel="Retry photo permission"
          >
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── No photo yet ── */}
      {!photo && !permDenied && (
        <TouchableOpacity
          style={[styles.pickArea, disabled && styles.pickAreaDisabled]}
          onPress={requestAndPick}
          disabled={disabled || loading}
          accessibilityRole="button"
          accessibilityLabel="Select a photo from gallery"
        >
          {loading ? (
            <ActivityIndicator color={Colors.primary} size="small" />
          ) : (
            <>
              <Text style={styles.pickIcon}>📷</Text>
              <Text style={styles.pickLabel}>Tap to select a photo</Text>
              <Text style={styles.pickSub}>JPG / PNG from your gallery</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* ── Photo selected: preview ── */}
      {!!photo && (
        <View style={styles.previewWrapper}>
          <Image
            source={{ uri: photo.uri }}
            style={styles.preview}
            accessibilityLabel="Selected photo preview"
            resizeMode="cover"
          />
          {/* Local-only notice */}
          <View style={styles.localNotice}>
            <Text style={styles.localNoticeText}>
              📎 Photo stays on this device; photo upload is not supported.
            </Text>
          </View>
          {/* Controls */}
          <View style={styles.photoControls}>
            <TouchableOpacity
              style={[styles.photoBtn, styles.replaceBtn]}
              onPress={requestAndPick}
              disabled={disabled || loading}
              accessibilityRole="button"
              accessibilityLabel="Replace photo"
            >
              {loading
                ? <ActivityIndicator color={Colors.primary} size="small" />
                : <Text style={styles.replaceBtnText}>🔄 Replace</Text>
              }
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.photoBtn, styles.removeBtn]}
              onPress={handleRemove}
              disabled={disabled}
              accessibilityRole="button"
              accessibilityLabel="Remove photo"
            >
              <Text style={styles.removeBtnText}>🗑 Remove</Text>
            </TouchableOpacity>
          </View>
        </View>
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

  // Permission denied
  infoBanner: {
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  infoBannerText: {
    fontSize: 13,
    color: '#5D4037',
    lineHeight: 19,
    marginBottom: 10,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.warning,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  retryBtnText: { fontSize: 13, color: '#fff', fontWeight: '600' },

  // Pick area
  pickArea: {
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 32,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  pickAreaDisabled: { opacity: 0.5 },
  pickIcon:  { fontSize: 36, marginBottom: 8 },
  pickLabel: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  pickSub:   { fontSize: 12, color: Colors.textMuted, marginTop: 4 },

  // Preview
  previewWrapper: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
  preview: { width: '100%', height: 200 },

  localNotice: {
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  localNoticeText: { fontSize: 11, color: '#795548' },

  photoControls: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  photoBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  replaceBtn:     { borderRightWidth: 1, borderRightColor: Colors.border },
  replaceBtnText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  removeBtn:      {},
  removeBtnText:  { fontSize: 13, color: '#C62828', fontWeight: '600' },
});
