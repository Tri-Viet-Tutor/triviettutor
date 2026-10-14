import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/common/AppHeader';
import { SessionCard } from '@/components/common/SessionCard';
import { BrandColors } from '@/constants/Colors';
import { MOCK_SESSIONS } from '@/constants/data';
import { useAuth } from '@/services/authContext';

const DAYS_OF_WEEK = [
  { day: 'T2', date: '12/10', fullDate: '2026-10-12', hasSession: false },
  { day: 'T3', date: '13/10', fullDate: '2026-10-13', hasSession: true },
  { day: 'T4', date: '14/10', fullDate: '2026-10-14', hasSession: false },
  { day: 'T5', date: '15/10', fullDate: '2026-10-15', hasSession: true, isToday: true },
  { day: 'T6', date: '16/10', fullDate: '2026-10-16', hasSession: true },
  { day: 'T7', date: '17/10', fullDate: '2026-10-17', hasSession: false },
  { day: 'CN', date: '18/10', fullDate: '2026-10-18', hasSession: true },
];

export default function ScheduleScreen() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>('2026-10-15'); // Defaults to today
  const [filterMode, setFilterMode] = useState<'SELECTED_DAY' | 'ALL_WEEK'>('ALL_WEEK');

  const filteredSessions =
    filterMode === 'SELECTED_DAY'
      ? MOCK_SESSIONS.filter((s) => s.date === selectedDate)
      : MOCK_SESSIONS;

  const completedCount = MOCK_SESSIONS.filter((s) => s.status === 'COMPLETED').length;
  const upcomingCount = MOCK_SESSIONS.filter((s) => s.status === 'UPCOMING').length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <AppHeader title="Thời khóa biểu" subtitle="Lịch học & chuyên cần tuần này" />

      <View style={styles.container}>
        {/* Weekly Stats Header */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{MOCK_SESSIONS.length}</Text>
            <Text style={styles.statLabel}>Tổng ca học</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: BrandColors.success }]}>{completedCount}</Text>
            <Text style={styles.statLabel}>Đã học</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: BrandColors.orange }]}>{upcomingCount}</Text>
            <Text style={styles.statLabel}>Sắp diễn ra</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: BrandColors.navy }]}>100%</Text>
            <Text style={styles.statLabel}>Chuyên cần</Text>
          </View>
        </View>

        {/* Week Day Strip */}
        <View style={styles.weekStripWrapper}>
          <View style={styles.weekStripHeader}>
            <Text style={styles.weekTitle}>Tháng 10 / 2026</Text>
            <View style={styles.modeToggle}>
              <TouchableOpacity
                style={[styles.toggleBtn, filterMode === 'ALL_WEEK' && styles.toggleBtnActive]}
                onPress={() => setFilterMode('ALL_WEEK')}>
                <Text
                  style={[
                    styles.toggleBtnText,
                    filterMode === 'ALL_WEEK' && styles.toggleBtnTextActive,
                  ]}>
                  Cả tuần
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, filterMode === 'SELECTED_DAY' && styles.toggleBtnActive]}
                onPress={() => setFilterMode('SELECTED_DAY')}>
                <Text
                  style={[
                    styles.toggleBtnText,
                    filterMode === 'SELECTED_DAY' && styles.toggleBtnTextActive,
                  ]}>
                  Theo ngày
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.daysRow}>
            {DAYS_OF_WEEK.map((item) => {
              const isSelected = selectedDate === item.fullDate;
              return (
                <TouchableOpacity
                  key={item.fullDate}
                  style={[
                    styles.dayItem,
                    isSelected && styles.dayItemActive,
                    item.isToday && styles.dayItemToday,
                  ]}
                  onPress={() => {
                    setSelectedDate(item.fullDate);
                    setFilterMode('SELECTED_DAY');
                  }}
                  activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.dayText,
                      isSelected && styles.dayTextActive,
                      item.isToday && !isSelected && styles.dayTextToday,
                    ]}>
                    {item.day}
                  </Text>
                  <Text
                    style={[
                      styles.dateText,
                      isSelected && styles.dateTextActive,
                      item.isToday && !isSelected && styles.dateTextToday,
                    ]}>
                    {item.date.split('/')[0]}
                  </Text>
                  {item.hasSession && (
                    <View
                      style={[
                        styles.sessionDot,
                        isSelected ? styles.sessionDotActive : styles.sessionDotNormal,
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Rule note notice */}
        <View style={styles.noticeBar}>
          <Ionicons name="information-circle" size={16} color={BrandColors.navy} />
          <Text style={styles.noticeText}>
            Quy tắc xin nghỉ: Học viên gửi đơn trước $\ge 24h$ sẽ được sắp xếp lịch học bù miễn phí.
          </Text>
        </View>

        {/* Sessions list */}
        <ScrollView
          style={styles.sessionList}
          contentContainerStyle={styles.sessionListContent}
          showsVerticalScrollIndicator={false}>
          {filteredSessions.length > 0 ? (
            filteredSessions.map((session) => (
              <SessionCard key={session.sessionId} session={session} />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="cafe-outline" size={48} color={BrandColors.muted} />
              <Text style={styles.emptyTitle}>Không có ca học nào trong ngày</Text>
              <Text style={styles.emptyDesc}>
                Bạn có thể nghỉ ngơi, ôn lại bài giảng cũ hoặc xem lịch toàn bộ tuần.
              </Text>
              <TouchableOpacity
                style={styles.showAllBtn}
                onPress={() => setFilterMode('ALL_WEEK')}>
                <Text style={styles.showAllBtnText}>Xem lịch toàn bộ tuần</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    borderRadius: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.navy,
  },
  statLabel: {
    fontSize: 11,
    color: BrandColors.muted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  weekStripWrapper: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  weekStripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  weekTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: BrandColors.ink,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleBtnText: {
    fontSize: 11,
    color: BrandColors.muted,
    fontWeight: '600',
  },
  toggleBtnTextActive: {
    color: BrandColors.navy,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayItem: {
    width: 44,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dayItemToday: {
    borderColor: BrandColors.navy,
  },
  dayItemActive: {
    backgroundColor: BrandColors.navy,
    borderColor: BrandColors.navy,
  },
  dayText: {
    fontSize: 11,
    color: BrandColors.muted,
    fontWeight: '600',
    marginBottom: 2,
  },
  dayTextActive: {
    color: '#FFFFFF',
  },
  dayTextToday: {
    color: BrandColors.navy,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.ink,
  },
  dateTextActive: {
    color: '#FFFFFF',
  },
  dateTextToday: {
    color: BrandColors.navy,
  },
  sessionDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 4,
  },
  sessionDotNormal: {
    backgroundColor: BrandColors.orange,
  },
  sessionDotActive: {
    backgroundColor: '#FFFFFF',
  },
  noticeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BrandColors.navyLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  noticeText: {
    fontSize: 11,
    color: BrandColors.navy,
    lineHeight: 16,
    flex: 1,
  },
  sessionList: {
    flex: 1,
  },
  sessionListContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingBottom: 30,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: BrandColors.ink,
    marginTop: 12,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 13,
    color: BrandColors.muted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  showAllBtn: {
    backgroundColor: BrandColors.navy,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  showAllBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
