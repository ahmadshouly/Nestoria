import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { Languages, ChevronDown, X, Check } from 'lucide-react-native';
import {
  useTranslateContent,
  useUserPreferredLanguage,
  SUPPORTED_LANGUAGES,
  getLanguageNativeName,
} from '@/lib/api/translation';
import { useTranslation } from '@/lib/i18n';

interface TranslateButtonProps {
  content: string;
  contentType: 'review' | 'description' | 'message';
  onTranslated: (translatedContent: string, targetLanguage: string) => void;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  showLanguageSelector?: boolean;
}

export function TranslateButton({
  content,
  contentType,
  onTranslated,
  size = 'sm',
  variant = 'ghost',
  showLanguageSelector = true,
}: TranslateButtonProps) {
  const { t } = useTranslation();
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);

  const { data: preferredLanguage } = useUserPreferredLanguage();
  const translateContent = useTranslateContent();

  const handleQuickTranslate = async () => {
    const targetLang = selectedLanguage || preferredLanguage || 'en';

    try {
      const result = await translateContent.mutateAsync({
        content,
        targetLanguage: targetLang,
        contentType,
      });

      if (result.translatedContent) {
        onTranslated(result.translatedContent, targetLang);
      }

      if (result.rateLimited) {
        console.warn('Translation rate limited');
      }
    } catch (error) {
      console.error('Translation failed:', error);
    }
  };

  const handleLanguageSelect = async (langCode: string) => {
    setSelectedLanguage(langCode);
    setShowLanguageModal(false);

    try {
      const result = await translateContent.mutateAsync({
        content,
        targetLanguage: langCode,
        contentType,
      });

      if (result.translatedContent) {
        onTranslated(result.translatedContent, langCode);
      }
    } catch (error) {
      console.error('Translation failed:', error);
    }
  };

  // Size styles
  const sizeStyles = {
    sm: 'px-2 py-1',
    md: 'px-3 py-2',
    lg: 'px-4 py-3',
  };

  const iconSize = size === 'sm' ? 14 : size === 'md' ? 16 : 18;
  const textSize = size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base';

  // Variant styles
  const variantStyles = {
    default: 'bg-emerald-500',
    outline: 'border border-emerald-500',
    ghost: 'bg-transparent',
  };

  const textColorStyles = {
    default: 'text-white',
    outline: 'text-emerald-500',
    ghost: 'text-emerald-600',
  };

  return (
    <>
      <View className="flex-row items-center">
        {/* Quick translate button */}
        <Pressable
          onPress={handleQuickTranslate}
          disabled={translateContent.isPending}
          className={`flex-row items-center rounded-full ${sizeStyles[size]} ${variantStyles[variant]} active:opacity-70`}
        >
          {translateContent.isPending ? (
            <ActivityIndicator size="small" color="#10B981" />
          ) : (
            <>
              <Languages size={iconSize} color={variant === 'default' ? '#FFF' : '#10B981'} />
              <Text
                className={`ml-1 ${textSize} ${textColorStyles[variant]}`}
                style={{ fontFamily: 'Cairo_600SemiBold' }}
              >
                {t('translation.translate')}
              </Text>
            </>
          )}
        </Pressable>

        {/* Language selector */}
        {showLanguageSelector && (
          <Pressable
            onPress={() => setShowLanguageModal(true)}
            className="ml-1 p-1 rounded-full active:bg-gray-100"
          >
            <ChevronDown size={14} color="#6B7280" />
          </Pressable>
        )}
      </View>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setShowLanguageModal(false)}
        >
          <View className="bg-white rounded-t-3xl max-h-[70%]">
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-4 border-b border-gray-100">
              <Text className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Cairo_700Bold' }}>
                {t('translation.selectLanguage')}
              </Text>
              <Pressable
                onPress={() => setShowLanguageModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 items-center justify-center"
              >
                <X size={18} color="#000" />
              </Pressable>
            </View>

            {/* Language List */}
            <ScrollView className="px-4 py-2" showsVerticalScrollIndicator={false}>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <Pressable
                  key={lang.code}
                  onPress={() => handleLanguageSelect(lang.code)}
                  className={`flex-row items-center justify-between py-3 px-3 rounded-xl mb-1 ${
                    selectedLanguage === lang.code ? 'bg-emerald-50' : 'active:bg-gray-50'
                  }`}
                >
                  <View>
                    <Text
                      className={`text-base ${
                        selectedLanguage === lang.code ? 'text-emerald-600' : 'text-gray-900'
                      }`}
                      style={{ fontFamily: 'Cairo_600SemiBold' }}
                    >
                      {lang.nativeName}
                    </Text>
                    <Text className="text-xs text-gray-500" style={{ fontFamily: 'Cairo_400Regular' }}>
                      {lang.name}
                    </Text>
                  </View>
                  {selectedLanguage === lang.code && <Check size={20} color="#10B981" />}
                </Pressable>
              ))}
              <View className="h-8" />
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// Component to wrap content with translation capability
interface TranslatableContentProps {
  children: React.ReactNode;
  content: string;
  contentType: 'review' | 'description' | 'message';
}

export function TranslatableContent({ children, content, contentType }: TranslatableContentProps) {
  const { t } = useTranslation();
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [targetLanguage, setTargetLanguage] = useState<string | null>(null);

  const handleTranslated = (translated: string, lang: string) => {
    setTranslatedContent(translated);
    setTargetLanguage(lang);
  };

  const handleShowOriginal = () => {
    setTranslatedContent(null);
    setTargetLanguage(null);
  };

  return (
    <View>
      {!translatedContent ? (
        <View>
          {/* Translate button */}
          <View className="flex-row justify-end mb-2">
            <TranslateButton
              content={content}
              contentType={contentType}
              onTranslated={handleTranslated}
            />
          </View>
          {/* Original content */}
          {children}
        </View>
      ) : (
        <View>
          {/* Translated content */}
          <View className="bg-emerald-50 rounded-xl p-3 mb-2">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center">
                <Languages size={14} color="#10B981" />
                <Text className="text-xs text-emerald-600 ml-1" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                  {t('translation.translatedTo')} {targetLanguage && getLanguageNativeName(targetLanguage)}
                </Text>
              </View>
              <Pressable onPress={handleShowOriginal}>
                <Text className="text-xs text-emerald-600" style={{ fontFamily: 'Cairo_600SemiBold' }}>
                  {t('translation.showOriginal')}
                </Text>
              </Pressable>
            </View>
            <Text className="text-gray-900 leading-6" style={{ fontFamily: 'Cairo_400Regular' }}>
              {translatedContent}
            </Text>
          </View>

          {/* Original content (collapsed) */}
          <View className="opacity-60">
            <Text className="text-xs text-gray-500 mb-1" style={{ fontFamily: 'Cairo_600SemiBold' }}>
              {t('translation.original')}:
            </Text>
            {children}
          </View>
        </View>
      )}
    </View>
  );
}
