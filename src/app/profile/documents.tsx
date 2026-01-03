import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  Upload,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Trash2,
  Camera,
  Image as ImageIcon,
} from 'lucide-react-native';
import { useAuth } from '@/lib/api/auth';
import {
  useUploadDocument,
  useDeleteDocument,
  DocumentType,
  DocumentStatus,
} from '@/lib/api/profile';
import { useTranslation, useLanguageStore } from '@/lib/i18n';

interface DocumentCardProps {
  title: string;
  description: string;
  documentType: DocumentType;
  documentUrl: string | null | string[];
  status: DocumentStatus;
  rejectionReason?: string | null;
  onUpload: (type: DocumentType) => void;
  onDelete: (type: DocumentType, index?: number) => void;
  isUploading: boolean;
  isDeleting: boolean;
}

function DocumentCard({
  title,
  description,
  documentType,
  documentUrl,
  status,
  rejectionReason,
  onUpload,
  onDelete,
  isUploading,
  isDeleting,
}: DocumentCardProps) {
  const { t } = useTranslation();

  const getStatusColor = () => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-50 border-emerald-200';
      case 'pending':
        return 'bg-yellow-50 border-yellow-200';
      case 'rejected':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 size={20} color="#10B981" />;
      case 'pending':
        return <Clock size={20} color="#F59E0B" />;
      case 'rejected':
        return <XCircle size={20} color="#EF4444" />;
      default:
        return <Upload size={20} color="#6B7280" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'approved':
        return t('documents.approved');
      case 'pending':
        return t('documents.pending');
      case 'rejected':
        return t('documents.rejected');
      default:
        return t('documents.notUploaded');
    }
  };

  const hasDocument = Array.isArray(documentUrl) ? documentUrl.length > 0 : !!documentUrl;
  const documents = Array.isArray(documentUrl) ? documentUrl : documentUrl ? [documentUrl] : [];

  return (
    <View className={`rounded-xl border p-4 mb-4 ${getStatusColor()}`}>
      <View className="flex-row items-start justify-between mb-3">
        <View className="flex-1">
          <Text
            className="text-base font-semibold text-gray-900"
            style={{ fontFamily: 'Cairo_600SemiBold' }}
          >
            {title}
          </Text>
          <Text
            className="text-sm text-gray-600 mt-1"
            style={{ fontFamily: 'Cairo_400Regular' }}
          >
            {description}
          </Text>
        </View>
        <View className="flex-row items-center ml-2">
          {getStatusIcon()}
          <Text
            className={`text-sm ml-1 ${
              status === 'approved'
                ? 'text-emerald-600'
                : status === 'pending'
                ? 'text-yellow-600'
                : status === 'rejected'
                ? 'text-red-600'
                : 'text-gray-500'
            }`}
            style={{ fontFamily: 'Cairo_600SemiBold' }}
          >
            {getStatusText()}
          </Text>
        </View>
      </View>

      {rejectionReason && status === 'rejected' && (
        <View className="bg-red-100 rounded-lg p-3 mb-3">
          <Text
            className="text-sm text-red-700"
            style={{ fontFamily: 'Cairo_400Regular' }}
          >
            {t('documents.rejectionReason')}: {rejectionReason}
          </Text>
        </View>
      )}

      {/* Document Preview */}
      {documents.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-3"
          style={{ flexGrow: 0 }}
        >
          {documents.map((url, index) => (
            <View key={index} className="relative mr-2">
              <Image
                source={{ uri: url }}
                className="w-24 h-24 rounded-lg bg-gray-200"
                resizeMode="cover"
              />
              {!isDeleting && (
                <Pressable
                  onPress={() => onDelete(documentType, documents.length > 1 ? index : undefined)}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 items-center justify-center"
                >
                  <Trash2 size={12} color="#FFF" />
                </Pressable>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Upload Button */}
      <Pressable
        onPress={() => onUpload(documentType)}
        disabled={isUploading || status === 'approved'}
        className={`flex-row items-center justify-center py-3 rounded-xl ${
          status === 'approved'
            ? 'bg-gray-100'
            : isUploading
            ? 'bg-gray-200'
            : 'bg-white border border-gray-300 active:bg-gray-50'
        }`}
      >
        {isUploading ? (
          <ActivityIndicator size="small" color="#10B981" />
        ) : (
          <>
            <Upload size={18} color={status === 'approved' ? '#9CA3AF' : '#10B981'} />
            <Text
              className={`ml-2 font-semibold ${
                status === 'approved' ? 'text-gray-400' : 'text-emerald-600'
              }`}
              style={{ fontFamily: 'Cairo_600SemiBold' }}
            >
              {hasDocument ? t('documents.uploadAnother') : t('documents.upload')}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

export default function DocumentsScreen() {
  const { t } = useTranslation();
  const isRTL = useLanguageStore((state) => state.isRTL);
  const { data: authData, refetch } = useAuth();

  const uploadDocument = useUploadDocument();
  const deleteDocument = useDeleteDocument();

  const [uploadingType, setUploadingType] = useState<DocumentType | null>(null);
  const [deletingType, setDeletingType] = useState<DocumentType | null>(null);

  const profile = authData?.profile;

  const handleUpload = async (documentType: DocumentType) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setUploadingType(documentType);
      try {
        await uploadDocument.mutateAsync({
          uri: result.assets[0].uri,
          documentType,
          fileType: result.assets[0].mimeType || 'image/jpeg',
        });
        refetch();
      } catch (error) {
        Alert.alert(t('common.error'), t('documents.uploadError'));
      } finally {
        setUploadingType(null);
      }
    }
  };

  const handleDelete = async (documentType: DocumentType, index?: number) => {
    Alert.alert(
      t('documents.deleteTitle'),
      t('documents.deleteMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setDeletingType(documentType);
            try {
              await deleteDocument.mutateAsync({ documentType, documentIndex: index });
              refetch();
            } catch (error) {
              Alert.alert(t('common.error'), t('documents.deleteError'));
            } finally {
              setDeletingType(null);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="px-4 pt-2 pb-4 bg-white border-b border-gray-200">
        <View className="flex-row items-center">
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center active:bg-gray-200 mr-3"
          >
            <ArrowLeft size={20} color="#000" />
          </Pressable>
          <Text
            className="text-xl font-bold text-gray-900"
            style={{ fontFamily: 'Cairo_700Bold' }}
          >
            {t('documents.title')}
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        {/* Info Banner */}
        <View className="bg-blue-50 rounded-xl p-4 mb-6 flex-row">
          <FileText size={24} color="#3B82F6" />
          <View className="flex-1 ml-3">
            <Text
              className="text-base font-semibold text-blue-700"
              style={{ fontFamily: 'Cairo_600SemiBold' }}
            >
              {t('documents.infoTitle')}
            </Text>
            <Text
              className="text-sm text-blue-600 mt-1"
              style={{ fontFamily: 'Cairo_400Regular' }}
            >
              {t('documents.infoDescription')}
            </Text>
          </View>
        </View>

        {/* ID Front */}
        <DocumentCard
          title={t('documents.idFront')}
          description={t('documents.idFrontDesc')}
          documentType="id_front"
          documentUrl={profile?.id_document_url ?? null}
          status={profile?.id_front_document_status as DocumentStatus}
          rejectionReason={profile?.id_front_document_rejection_reason}
          onUpload={handleUpload}
          onDelete={handleDelete}
          isUploading={uploadingType === 'id_front'}
          isDeleting={deletingType === 'id_front'}
        />

        {/* ID Back */}
        <DocumentCard
          title={t('documents.idBack')}
          description={t('documents.idBackDesc')}
          documentType="id_back"
          documentUrl={profile?.id_documents_urls ?? null}
          status={profile?.id_back_document_status as DocumentStatus}
          rejectionReason={profile?.id_back_document_rejection_reason}
          onUpload={handleUpload}
          onDelete={handleDelete}
          isUploading={uploadingType === 'id_back'}
          isDeleting={deletingType === 'id_back'}
        />

        {/* Business License */}
        <DocumentCard
          title={t('documents.businessLicense')}
          description={t('documents.businessLicenseDesc')}
          documentType="business_license"
          documentUrl={profile?.business_license_urls ?? null}
          status={profile?.business_license_document_status as DocumentStatus}
          rejectionReason={profile?.business_license_rejection_reason}
          onUpload={handleUpload}
          onDelete={handleDelete}
          isUploading={uploadingType === 'business_license'}
          isDeleting={deletingType === 'business_license'}
        />

        {/* Additional Documents */}
        <DocumentCard
          title={t('documents.additional')}
          description={t('documents.additionalDesc')}
          documentType="additional"
          documentUrl={profile?.additional_documents_urls ?? null}
          status={profile?.additional_documents_status as DocumentStatus}
          rejectionReason={profile?.additional_documents_rejection_reason}
          onUpload={handleUpload}
          onDelete={handleDelete}
          isUploading={uploadingType === 'additional'}
          isDeleting={deletingType === 'additional'}
        />

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
