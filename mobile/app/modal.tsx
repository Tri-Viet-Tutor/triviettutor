import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/Colors';
import { CENTER_INFO } from '@/constants/data';
import { router } from 'expo-router';

export default function ModalScreen() {
  const handleCallHotline = () => {
    Alert.alert(
      'Liên hệ Trung tâm',
      `Tổng đài tư vấn VietTriTutor:\n${CENTER_INFO.hotline}\n\nEmail: ${CENTER_INFO.email}`
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}>
        
        {/* Header Icon */}
        <View style={styles.logoBadge}>
          <Ionicons name="school" size={32} color="#FFFFFF" />
        </View>

        <Text style={styles.title}>{CENTER_INFO.name}</Text>
        <Text style={styles.slogan}>{CENTER_INFO.slogan}</Text>

        <View style={styles.divider} />

        {/* Info Block */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thông tin liên hệ</Text>
          
          <View style={styles.infoRow}>
            <Ionicons name="call-outline" size={18} color={BrandColors.navy} />
            <Text style={styles.infoText}>Hotline: {CENTER_INFO.hotline}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={18} color={BrandColors.navy} />
            <Text style={styles.infoText}>Email: {CENTER_INFO.email}</Text>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color={BrandColors.navy} />
            <Text style={styles.infoText}>{CENTER_INFO.address}</Text>
          </View>
        </View>

        {/* Features Block */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Điểm nổi bật của VietTriTutor</Text>
          {CENTER_INFO.features.map((feature, idx) => (
            <View key={idx} style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={18} color={BrandColors.success} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={styles.hotlineBtn}
          onPress={handleCallHotline}
          activeOpacity={0.85}>
          <Ionicons name="call" size={18} color="#FFFFFF" />
          <Text style={styles.hotlineBtnText}>Gọi tư vấn tuyển sinh ngay</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}>
          <Text style={styles.closeBtnText}>Đóng cửa sổ</Text>
        </TouchableOpacity>
      </ScrollView>

      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
    alignItems: 'center',
    paddingBottom: 40,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: BrandColors.navy,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: BrandColors.navyDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.navy,
    textAlign: 'center',
    marginBottom: 4,
  },
  slogan: {
    fontSize: 13,
    color: BrandColors.muted,
    textAlign: 'center',
    marginBottom: 16,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#E2E8F0',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: BrandColors.ink,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginVertical: 4,
  },
  infoText: {
    fontSize: 13,
    color: BrandColors.ink,
    flex: 1,
    lineHeight: 18,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginVertical: 4,
  },
  featureText: {
    fontSize: 13,
    color: BrandColors.ink,
    flex: 1,
    lineHeight: 18,
  },
  hotlineBtn: {
    backgroundColor: BrandColors.orange,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: '100%',
    gap: 8,
    marginTop: 8,
    marginBottom: 10,
  },
  hotlineBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  closeBtn: {
    paddingVertical: 10,
  },
  closeBtnText: {
    color: BrandColors.muted,
    fontSize: 13,
    fontWeight: '600',
  },
});
