import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  Modal,
  Pressable,
  Dimensions,
  ScrollView,
  StatusBar,
} from 'react-native';
import { X, ChevronLeft, ChevronRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

interface PhotoGalleryProps {
  images: string[];
  initialIndex?: number;
  visible: boolean;
  onClose: () => void;
}

export default function PhotoGallery({
  images,
  initialIndex = 0,
  visible,
  onClose,
}: PhotoGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState<number>(initialIndex);

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <StatusBar barStyle="light-content" />
      <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3">
          <View className="flex-1" />
          <View className="flex-1 items-center">
            <View className="bg-white/20 rounded-full px-3 py-1">
              <Text className="text-white text-sm font-semibold">
                {currentIndex + 1} / {images.length}
              </Text>
            </View>
          </View>
          <View className="flex-1 items-end">
            <Pressable
              onPress={onClose}
              className="w-10 h-10 rounded-full bg-white/20 items-center justify-center"
            >
              <X size={24} color="#fff" />
            </Pressable>
          </View>
        </View>

        {/* Image Viewer */}
        <View className="flex-1 items-center justify-center">
          <Image
            source={{ uri: images[currentIndex] }}
            style={{ width: width, height: height * 0.7 }}
            resizeMode="contain"
          />
        </View>

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            {currentIndex > 0 && (
              <Pressable
                onPress={handlePrevious}
                className="absolute left-4 top-1/2 w-12 h-12 rounded-full bg-white/20 items-center justify-center"
                style={{ transform: [{ translateY: -24 }] }}
              >
                <ChevronLeft size={28} color="#fff" />
              </Pressable>
            )}
            {currentIndex < images.length - 1 && (
              <Pressable
                onPress={handleNext}
                className="absolute right-4 top-1/2 w-12 h-12 rounded-full bg-white/20 items-center justify-center"
                style={{ transform: [{ translateY: -24 }] }}
              >
                <ChevronRight size={28} color="#fff" />
              </Pressable>
            )}
          </>
        )}

        {/* Thumbnail Strip */}
        <View className="pb-4">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            {images.map((image, index) => (
              <Pressable
                key={index}
                onPress={() => setCurrentIndex(index)}
                className={`rounded-lg overflow-hidden ${
                  index === currentIndex ? 'border-2 border-emerald-500' : 'border border-white/30'
                }`}
              >
                <Image
                  source={{ uri: image }}
                  className="w-16 h-16"
                  resizeMode="cover"
                />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
