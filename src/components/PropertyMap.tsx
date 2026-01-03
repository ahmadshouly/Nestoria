import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MapView, { Marker, Circle, PROVIDER_DEFAULT } from 'react-native-maps';
import { MapPin } from 'lucide-react-native';
import { getDisplayCoordinates, MAP_CONFIG } from '@/lib/maps';

interface PropertyMapProps {
  latitude: number;
  longitude: number;
  location: string;
  showExactLocation?: boolean;
  className?: string;
}

export default function PropertyMap({
  latitude,
  longitude,
  location,
  showExactLocation = true,
  className = '',
}: PropertyMapProps) {
  // Get display coordinates (with privacy offset if needed)
  const displayCoords = useMemo(
    () => getDisplayCoordinates(latitude, longitude, showExactLocation),
    [latitude, longitude, showExactLocation]
  );

  if (!displayCoords) {
    return (
      <View className={`bg-gray-100 rounded-xl h-64 items-center justify-center ${className}`}>
        <MapPin size={32} color="#9CA3AF" />
        <Text className="text-gray-500 mt-2">Location not available</Text>
      </View>
    );
  }

  const region = {
    latitude: displayCoords.latitude,
    longitude: displayCoords.longitude,
    latitudeDelta: showExactLocation ? 0.01 : 0.05, // Closer zoom for exact, wider for approximate
    longitudeDelta: showExactLocation ? 0.01 : 0.05,
  };

  return (
    <View className={className}>
      <MapView
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={region}
        scrollEnabled={true}
        zoomEnabled={true}
        pitchEnabled={false}
        rotateEnabled={false}
      >
        {showExactLocation ? (
          // Exact location: Show precise marker
          <Marker
            coordinate={{
              latitude: displayCoords.latitude,
              longitude: displayCoords.longitude,
            }}
            title={location}
            pinColor="#10B981"
          />
        ) : (
          // Approximate location: Show translucent circle
          <Circle
            center={{
              latitude: displayCoords.latitude,
              longitude: displayCoords.longitude,
            }}
            radius={1000} // 1km radius
            fillColor="rgba(16, 185, 129, 0.2)"
            strokeColor="#10B981"
            strokeWidth={2}
          />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    width: '100%',
    height: 256, // h-64 equivalent
    borderRadius: 12,
  },
});
