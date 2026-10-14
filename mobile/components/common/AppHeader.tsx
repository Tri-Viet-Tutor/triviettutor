import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { BrandColors } from '@/constants/Colors';
import { useAuth } from '@/services/authContext';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
}) => {
  const { user } = useAuth();

  const getRoleLabel = () => {
    if (!user) return 'Khách thăm quan';
    if (user.role === 'ROLE_ADMIN') return 'Quản trị viên';
    if (user.role === 'ROLE_TUTOR') return 'Gia sư Trung tâm';
    return 'Học viên THPT';
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftRow}>
        {showBack && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={BrandColors.navy} />
          </TouchableOpacity>
        )}
        <View>
          <View style={styles.brandRow}>
            <View style={styles.logoBadge}>
              <Ionicons name="school" size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.brandTitle}>VietTri<Text style={styles.brandHighlight}>Tutor</Text></Text>
            <View style={styles.roleTag}>
              <Text style={styles.roleTagText}>{getRoleLabel()}</Text>
            </View>
          </View>
          <Text style={styles.greetingText}>
            {title || (user ? `Xin chào, ${user.fullName}!` : 'Chào mừng bạn đến với VietTriTutor')}
          </Text>
          {subtitle && <Text style={styles.subtitleText}>{subtitle}</Text>}
        </View>
      </View>

      <View style={styles.rightActions}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.push('/modal')}
          activeOpacity={0.7}>
          <Ionicons name="call-outline" size={20} color={BrandColors.navy} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => router.push('/modal')}
          activeOpacity={0.7}>
          <Ionicons name="notifications-outline" size={20} color={BrandColors.navy} />
          <View style={styles.badgeDot} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backBtn: {
    marginRight: 12,
    padding: 6,
    borderRadius: 8,
    backgroundColor: BrandColors.navyLight,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  logoBadge: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: BrandColors.navy,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: BrandColors.navy,
    letterSpacing: -0.3,
  },
  brandHighlight: {
    color: BrandColors.orange,
  },
  roleTag: {
    marginLeft: 8,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: BrandColors.muted,
  },
  greetingText: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.ink,
    marginTop: 2,
  },
  subtitleText: {
    fontSize: 12,
    color: BrandColors.muted,
    marginTop: 1,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: 6,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BrandColors.orange,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
});
