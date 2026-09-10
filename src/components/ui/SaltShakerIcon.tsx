import { StyleSheet, View } from 'react-native';
import type { SaltShakerContents } from '@/constants/emojis';

const FILL: Record<SaltShakerContents, string> = {
  salt: '#F4F4F5',
  pepper: '#2C2C30',
  vegeta: '#D4DE3C',
};

const GRAIN: Record<SaltShakerContents, string> = {
  salt: '#E4E4E7',
  pepper: '#5C5C63',
  vegeta: '#7CB342',
};

export function SaltShakerIcon({
  size,
  contents,
}: {
  size: number;
  contents: SaltShakerContents;
}) {
  const fill = FILL[contents];
  const grain = GRAIN[contents];
  const scale = size / 44;
  const bodyWidth = 18 * scale;
  const bodyHeight = 16 * scale;
  const grainSize = Math.max(1.5, 2.2 * scale);

  return (
    <View style={{ width: 22 * scale, height: 24 * scale, alignItems: 'center' }}>
      <View
        style={[
          styles.cap,
          {
            width: 10 * scale,
            height: 4 * scale,
            borderTopLeftRadius: 3 * scale,
            borderTopRightRadius: 3 * scale,
          },
        ]}
      >
        <View style={[styles.hole, { width: 1.4 * scale, height: 1.4 * scale }]} />
        <View style={[styles.hole, { width: 1.4 * scale, height: 1.4 * scale }]} />
        <View style={[styles.hole, { width: 1.4 * scale, height: 1.4 * scale }]} />
      </View>
      <View
        style={[
          styles.neck,
          { width: 8 * scale, height: 2.5 * scale },
        ]}
      />
      <View
        style={[
          styles.body,
          {
            width: bodyWidth,
            height: bodyHeight,
            borderRadius: 5 * scale,
            borderWidth: Math.max(1, 1.2 * scale),
          },
        ]}
      >
        <View
          style={[
            styles.fill,
            {
              backgroundColor: fill,
              height: bodyHeight * 0.58,
              borderBottomLeftRadius: 4 * scale,
              borderBottomRightRadius: 4 * scale,
            },
          ]}
        >
          <View
            style={[
              styles.grain,
              {
                backgroundColor: grain,
                width: grainSize,
                height: grainSize,
                left: bodyWidth * 0.22,
                top: bodyHeight * 0.12,
              },
            ]}
          />
          <View
            style={[
              styles.grain,
              {
                backgroundColor: grain,
                width: grainSize,
                height: grainSize,
                left: bodyWidth * 0.48,
                top: bodyHeight * 0.06,
              },
            ]}
          />
          <View
            style={[
              styles.grain,
              {
                backgroundColor: grain,
                width: grainSize,
                height: grainSize,
                left: bodyWidth * 0.62,
                top: bodyHeight * 0.22,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cap: {
    backgroundColor: '#A8A29E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 1,
  },
  hole: {
    backgroundColor: '#57534E',
    borderRadius: 99,
  },
  neck: {
    backgroundColor: '#D6D3D1',
  },
  body: {
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderColor: '#D6D3D1',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  fill: {
    width: '100%',
    position: 'relative',
  },
  grain: {
    position: 'absolute',
    borderRadius: 99,
  },
});
