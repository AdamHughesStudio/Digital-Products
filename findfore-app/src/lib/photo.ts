import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

/** Profile photos are saved as a square this many pixels across */
export const PHOTO_SIZE = 480;

/** A square part of a picture, in the picture's own pixels */
export interface CropRect {
  x: number;
  y: number;
  size: number;
}

/**
 * Let someone choose a photo from their library. Returns its address, or null if they backed out.
 * On iPhone and Android apps the system's own square crop appears; on the web app the photo comes
 * back whole, ready for FindFore's crop screen.
 */
export async function pickPhoto(): Promise<string | null> {
  if (Platform.OS !== 'web') {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return null;
  }
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: Platform.OS !== 'web', aspect: [1, 1], quality: 0.85 });
  if (res.canceled || !res.assets?.[0]) return null;
  return res.assets[0].uri;
}

/** Cut the chosen square out of a picture and shrink it to a small JPEG (web only) */
export function cropToSquare(uri: string, rect: CropRect): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = PHOTO_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('No canvas'));
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, rect.x, rect.y, rect.size, rect.size, 0, 0, PHOTO_SIZE, PHOTO_SIZE);
      resolve(canvas.toDataURL('image/jpeg', 0.88));
    };
    img.onerror = () => reject(new Error('Could not read that photo'));
    img.src = uri;
  });
}
