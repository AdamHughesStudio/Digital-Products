import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

const SIZE = 360;

/** Shrink a picked image to a small square JPEG so it can be kept on the device */
async function shrinkOnWeb(uri: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(uri);
      // centre crop to a square, then scale down
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => resolve(uri);
    img.src = uri;
  });
}

/** Let someone choose a profile photo from their library. Returns its address, or null if they backed out */
export async function pickProfilePhoto(): Promise<string | null> {
  if (Platform.OS !== 'web') {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return null;
  }
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
  if (res.canceled || !res.assets?.[0]) return null;
  const uri = res.assets[0].uri;
  return Platform.OS === 'web' ? shrinkOnWeb(uri) : uri;
}
