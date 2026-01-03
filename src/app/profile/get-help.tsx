import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  I18nManager,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Plus, MessageCircle, Clock, CheckCircle, XCircle } from 'lucide-react-native';
import { useUserTickets, getTicketStatusColor, STATUS_LABELS, CATEGORY_LABELS } from '@/lib/api/support';
import { useTranslation } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

export default function GetHelpScreen() {
  const { t } = useTranslation();
  const isRTL = I18nManager.isRTL;
  const [activeFilter, setActiveFilter] = useState<'all' | 'open' | 'resolved' | 'closed'>('all');

  const { data: tickets, isLoading, refetch } = useUserTickets(
    activeFilter === 'all' ? undefined : activeFilter
  );

  // Real-time subscription for ticket updates
  useEffect(() => {
    const channel = supabase
      .channel('user-tickets')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'client_support_tickets',
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <MessageCircle size={16} color={getTicketStatusColor('open')} />;
      case 'in_progress':
        return <Clock size={16} color={getTicketStatusColor('in_progress')} />;
      case 'resolved':
        return <CheckCircle size={16} color={getTicketStatusColor('resolved')} />;
      case 'closed':
        return <XCircle size={16} color={getTicketStatusColor('closed')} />;
      default:
        return <MessageCircle size={16} color="#6B7280" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('common.justNow') || 'Just now';
    if (diffMins < 60) return `${diffMins}${t('common.minutesAgo') || 'm ago'}`;
    if (diffHours < 24) return `${diffHours}${t('common.hoursAgo') || 'h ago'}`;
    if (diffDays < 7) return `${diffDays}${t('common.daysAgo') || 'd ago'}`;

    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <View className="flex-1 bg-white">
        <Stack.Screen
          options={{
            title: t('support.getHelp') || 'Get Help',
            headerStyle: { backgroundColor: '#fff' },
            headerTintColor: '#000',
          }}
        />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#10B981" />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      <Stack.Screen
        options={{
          title: t('support.getHelp') || 'Get Help',
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#000',
        }}
      />

      {/* Filter Tabs */}
      <View className="border-b border-gray-200">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="px-6"
          contentContainerStyle={{ paddingVertical: 12 }}
        >
          {(['all', 'open', 'resolved', 'closed'] as const).map((filter) => (
            <Pressable
              key={filter}
              onPress={() => setActiveFilter(filter)}
              className={`px-4 py-2 rounded-full ${isRTL ? 'ml-2' : 'mr-2'} ${
                activeFilter === filter ? 'bg-emerald-500' : 'bg-gray-100'
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  activeFilter === filter ? 'text-white' : 'text-gray-700'
                }`}
                style={{ fontFamily: 'Cairo_600SemiBold' }}
              >
                {filter === 'all' ? t('support.all') || 'All' : STATUS_LABELS[filter]}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} colors={['#10B981']} />
        }
      >
        {/* New Ticket Button */}
        <Pressable
          onPress={() => router.push('/profile/create-ticket')}
          className="bg-emerald-500 rounded-xl p-4 mb-6 flex-row items-center justify-center active:opacity-80"
        >
          <Plus size={20} color="#fff" />
          <Text
            className={`text-white font-bold text-base ${isRTL ? 'mr-2' : 'ml-2'}`}
            style={{ fontFamily: 'Cairo_700Bold' }}
          >
            {t('support.createTicket') || 'Create New Ticket'}
          </Text>
        </Pressable>

        {/* Tickets List */}
        {tickets && tickets.length > 0 ? (
          <View>
            <Text
              className="text-sm font-semibold text-gray-500 mb-4"
              style={{ fontFamily: 'Cairo_600SemiBold' }}
            >
              {t('support.yourTickets') || 'Your Support Tickets'}
            </Text>
            {tickets.map((ticket) => (
              <Pressable
                key={ticket.id}
                onPress={() => router.push(`/profile/ticket/${ticket.id}`)}
                className="bg-white border border-gray-200 rounded-xl p-4 mb-3 active:bg-gray-50"
              >
                {/* Header */}
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-1">
                    <Text
                      className="text-base font-semibold text-gray-900"
                      style={{ fontFamily: 'Cairo_600SemiBold' }}
                      numberOfLines={1}
                    >
                      {ticket.subject}
                    </Text>
                    <Text
                      className="text-sm text-gray-500 mt-1"
                      style={{ fontFamily: 'Cairo_400Regular' }}
                    >
                      {CATEGORY_LABELS[ticket.category]}
                    </Text>
                  </View>
                  {ticket.unread_messages_count > 0 && (
                    <View className={`bg-red-500 rounded-full px-2 py-1 ${isRTL ? 'mr-2' : 'ml-2'}`}>
                      <Text
                        className="text-white text-xs font-bold"
                        style={{ fontFamily: 'Cairo_700Bold' }}
                      >
                        {ticket.unread_messages_count}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Status and Time */}
                <View className="flex-row items-center justify-between mt-3">
                  <View className="flex-row items-center">
                    {getStatusIcon(ticket.status)}
                    <Text
                      className={`text-sm ${isRTL ? 'mr-2' : 'ml-2'}`}
                      style={{
                        fontFamily: 'Cairo_600SemiBold',
                        color: getTicketStatusColor(ticket.status),
                      }}
                    >
                      {STATUS_LABELS[ticket.status]}
                    </Text>
                  </View>
                  <Text
                    className="text-xs text-gray-500"
                    style={{ fontFamily: 'Cairo_400Regular' }}
                  >
                    {formatDate(ticket.last_activity_at)}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <View className="items-center justify-center py-12">
            <MessageCircle size={48} color="#D1D5DB" />
            <Text
              className="text-gray-500 text-center mt-4 text-base"
              style={{ fontFamily: 'Cairo_400Regular' }}
            >
              {t('support.noTickets') || 'No support tickets yet'}
            </Text>
            <Text
              className="text-gray-400 text-center mt-2 text-sm px-8"
              style={{ fontFamily: 'Cairo_400Regular' }}
            >
              {t('support.noTicketsDesc') || 'Create a ticket to get help from our support team'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
