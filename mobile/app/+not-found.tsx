import React from 'react';
import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BrandColors } from '@/constants/Colors';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Không tìm thấy trang' }} />
      <View style={styles.container}>
        <View style={styles.iconBox}>
          <Ionicons name="alert-circle-outline" size={48} color={BrandColors.orange} />
        </View>
        <Text style={styles.title}>Trang không tồn tại</Text>
        <Text style={styles.desc}>
          Đường dẫn bạn yêu cầu không tồn tại hoặc đã được chuyển sang mục khác.
        </Text>

        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Quay về Trang chủ VietTriTutor</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F8FAFC',
  },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: BrandColors.ink,
    marginBottom: 6,
  },
  desc: {
    fontSize: 13,
    color: BrandColors.muted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  link: {
    backgroundColor: BrandColors.navy,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
