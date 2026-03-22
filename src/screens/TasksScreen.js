import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  TextInput, Modal, ScrollView, Platform, Alert, Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getTasks, saveTasks, getStats, getUserProfile } from '../utils/storage';
import { getLevelInfo } from '../constants/achievements';
import { hapticLight, hapticMedium, hapticSuccess } from '../utils/helpers';

// Obsidian Theme tokens
const Theme = {
  bg: '#131315',
  surface: '#1b1b1d',
  surfaceHigh: '#2a2a2c',
  surfaceHighest: '#353437',
  onSurface: '#e5e1e4',
  onSurfaceVariant: '#c8c6ca',
  primary: '#c0c1ff',
  primaryVariant: '#696df8',
  tertiary: '#d0bcff',
  secondary: '#c4c1fb',
  error: '#ffb4ab',
  border: 'rgba(71, 70, 74, 0.15)',
};

const PRIORITY_STYLE = {
  HIGH: { label: 'HIGH PRIORITY', color: Theme.primary, xp: 450 },
  MEDIUM: { label: 'MEDIUM', color: Theme.tertiary, xp: 220 },
  LOW: { label: 'LOW', color: Theme.surfaceHighest, xp: 80 },
};

export default function TasksScreen({ navigation }) {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [profile, setProfile] = useState(null);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskNote, setNewTaskNote] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('MEDIUM');

  useFocusEffect(useCallback(() => { loadData(); }, []));

  const loadData = async () => {
    const [t, s, p] = await Promise.all([getTasks(), getStats(), getUserProfile()]);
    setTasks(t);
    setStats(s);
    setProfile(p);
  };

  const persist = async (u) => { setTasks(u); await saveTasks(u); };

  const addTask = async () => {
    if (!newTaskTitle.trim()) return;
    hapticMedium();
    const task = { id: Date.now().toString(), title: newTaskTitle.trim(), note: newTaskNote.trim(), priority: newTaskPriority, completed: false, createdAt: Date.now(), completedAt: null };
    await persist([task, ...tasks]);
    setNewTaskTitle(''); setNewTaskNote(''); setNewTaskPriority('MEDIUM'); setShowAddModal(false);
  };

  const toggleComplete = async (id) => {
    hapticSuccess();
    await persist(tasks.map((t) => t.id === id ? { ...t, completed: !t.completed, completedAt: !t.completed ? Date.now() : null } : t));
  };

  const deleteTask = (id) => {
    Alert.alert('Delete Protocol', 'Remove this sequence forever?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { hapticLight(); await persist(tasks.filter((t) => t.id !== id)); } },
    ]);
  };

  const activeTasks = tasks.filter(t => !t.completed);
  const archivedTasks = tasks.filter(t => t.completed);

  const levelInfo = stats ? getLevelInfo(stats.xp) : { level: 1, nextXp: 1000 };
  const currentXp = stats?.xp || 0;
  const nextXp = levelInfo.nextXp || 2000;
  const xpProgress = Math.min(currentXp / nextXp, 1);

  const renderActiveCard = ({ item }) => {
    const p = PRIORITY_STYLE[item.priority];
    return (
      <TouchableOpacity 
        style={styles.activeCard} 
        onLongPress={() => deleteTask(item.id)}
        activeOpacity={0.9}
      >
        <View style={styles.cardLeft}>
          <View style={[styles.priorityDot, { backgroundColor: p.color }]} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.taskTitle}>{item.title}</Text>
          <View style={styles.tagRow}>
            <View style={styles.priorityBadge}>
              <Text style={styles.priorityText}>{p.label}</Text>
            </View>
            <View style={styles.xpBadge}>
              <MaterialCommunityIcons name="lightning-bolt" size={10} color={Theme.primary} />
              <Text style={styles.xpText}>+{p.xp} XP</Text>
            </View>
          </View>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.dueDateText}>No Due Date</Text>
          <TouchableOpacity 
            style={styles.radioBtn}
            onPress={() => toggleComplete(item.id)}
          >
            <View style={styles.radioInner} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderArchivedCard = ({ item }) => {
    const p = PRIORITY_STYLE[item.priority];
    return (
      <TouchableOpacity 
        style={styles.archivedRow}
        onLongPress={() => deleteTask(item.id)}
      >
        <MaterialCommunityIcons name="check-circle" size={18} color="rgba(192,193,255,0.4)" style={styles.archivedCheck} />
        <Text style={styles.archivedTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.archivedXp}>+{p.xp} XP</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.openDrawer && navigation.openDrawer()}>
            <MaterialCommunityIcons name="menu" size={26} color={Theme.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>OBSIDIAN</Text>
        </View>
        <TouchableOpacity style={styles.profileBtn} onPress={() => navigation.navigate('Profile')}>
           <Image
            source={{ uri: profile?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80' }}
            style={styles.profileImg}
          />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        
        {/* Operator Status */}
        <View style={styles.statusSection}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>OPERATOR STATUS</Text>
            <Text style={styles.statusLevel}>Level {levelInfo.level}</Text>
          </View>
          <View style={styles.xpRow}>
            <Text style={styles.xpLabel}>EXPERIENCE POINTS PROTOCOL</Text>
            <Text style={styles.xpVal}>{(currentXp).toLocaleString()} / {(nextXp).toLocaleString()} XP</Text>
          </View>
          <View style={styles.xpBarBg}>
            <LinearGradient
              colors={[Theme.primaryVariant, Theme.primary]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[styles.xpBarFill, { width: `${xpProgress * 100}%` }]}
            />
          </View>
        </View>

        {/* Active Protocols */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Protocols</Text>
          <Text style={styles.sectionCount}>{activeTasks.length} SEQUENCES PENDING</Text>
        </View>
        <View style={styles.taskList}>
          {activeTasks.length === 0 ? (
            <Text style={styles.emptyText}>No pending sequences.</Text>
          ) : (
            activeTasks.map(t => <React.Fragment key={t.id}>{renderActiveCard({ item: t })}</React.Fragment>)
          )}
        </View>

        {/* Archived Protocols */}
        {archivedTasks.length > 0 && (
          <View style={styles.archivedSection}>
            <View style={styles.sectionHeaderArchived}>
              <Text style={styles.sectionTitleArchived}>ARCHIVED PROTOCOLS</Text>
            </View>
            <View style={styles.archivedList}>
              {archivedTasks.map(t => <React.Fragment key={t.id}>{renderArchivedCard({ item: t })}</React.Fragment>)}
            </View>
          </View>
        )}

        <View style={{ height: 160 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity 
        style={styles.fab}
        activeOpacity={0.9}
        onPress={() => { hapticLight(); setShowAddModal(true); }}
      >
        <LinearGradient
          colors={[Theme.primaryVariant, Theme.primary]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <MaterialCommunityIcons name="plus" size={30} color={Theme.surfaceHigh} />
        </LinearGradient>
      </TouchableOpacity>

      {/* Add Task Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Protocol Sequence</Text>
            <TextInput
              style={styles.input} placeholder="Sequence Title..." placeholderTextColor={Theme.onSurfaceVariant}
              value={newTaskTitle} onChangeText={setNewTaskTitle} autoFocus
            />
            <TextInput
              style={[styles.input, styles.inputNote]} placeholder="Protocol Notes..." placeholderTextColor={Theme.onSurfaceVariant}
              value={newTaskNote} onChangeText={setNewTaskNote} multiline numberOfLines={2}
            />
            <Text style={styles.modalLabel}>PRIORITY CLASSIFICATION</Text>
            <View style={styles.prioritySelector}>
              {Object.keys(PRIORITY_STYLE).map((key) => {
                const c = PRIORITY_STYLE[key];
                const active = newTaskPriority === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.priSelBtn, active && { backgroundColor: 'rgba(192,193,255,0.05)', borderColor: c.color }]}
                    onPress={() => { setNewTaskPriority(key); hapticLight(); }}
                  >
                    <Text style={[styles.priSelText, active && { color: c.color }]}>{c.label.split(' ')[0]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowAddModal(false); hapticLight(); }}>
                <Text style={styles.cancelBtnText}>Abort</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={addTask} activeOpacity={0.85}>
                <LinearGradient colors={[Theme.primary, Theme.primaryVariant]} style={styles.saveBtnGrad} start={{x:0, y:0}} end={{x:1, y:1}}>
                  <Text style={styles.saveBtnText}>Initialize</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Theme.bg },
  
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 16, backgroundColor: 'rgba(19, 19, 21, 0.8)', zIndex: 10, borderBottomWidth: 1, borderBottomColor: Theme.border },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerTitle: { fontSize: 20, color: Theme.onSurface, fontWeight: '300', letterSpacing: 4 },
  profileBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Theme.surfaceHighest, borderWidth: 1, borderColor: 'rgba(71,70,74,0.3)', overflow: 'hidden' },
  profileImg: { width: '100%', height: '100%' },

  scroll: { paddingHorizontal: 24, paddingTop: 32 },

  // Operator Status
  statusSection: { marginBottom: 40 },
  statusRow: { flexDirection: 'row', alignItems: 'baseline', gap: 12, marginBottom: 24 },
  statusLabel: { fontSize: 10, color: Theme.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 2, fontWeight: '600' },
  statusLevel: { fontSize: 42, color: Theme.onSurface, fontWeight: '800', letterSpacing: -1 },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 },
  xpLabel: { fontSize: 9, color: Theme.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '600' },
  xpVal: { fontSize: 11, color: Theme.primary, fontWeight: '700', letterSpacing: 0.5 },
  xpBarBg: { height: 6, backgroundColor: '#0e0e10', borderRadius: 3, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(71,70,74,0.05)' },
  xpBarFill: { height: '100%', borderRadius: 3 },

  // Active Protocols Head
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 20 },
  sectionTitle: { fontSize: 18, color: Theme.onSurface, fontWeight: '600', letterSpacing: -0.3 },
  sectionCount: { fontSize: 9, color: Theme.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: '600' },
  
  // Active Tasks
  taskList: { gap: 12 },
  activeCard: { backgroundColor: Theme.surface, borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(71,70,74,0.1)' },
  cardLeft: { width: 24, alignItems: 'flex-start' },
  priorityDot: { width: 10, height: 10, borderRadius: 5 },
  cardBody: { flex: 1, paddingRight: 10 },
  taskTitle: { fontSize: 15, color: Theme.onSurface, fontWeight: '600', marginBottom: 10, lineHeight: 20 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priorityBadge: { backgroundColor: 'rgba(192,193,255,0.05)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(192,193,255,0.1)' },
  priorityText: { fontSize: 8, color: Theme.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '600' },
  xpBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  xpText: { fontSize: 9, color: Theme.primary, fontWeight: '700' },
  cardRight: { alignItems: 'flex-end', justifyContent: 'space-between', height: '100%' },
  dueDateText: { fontSize: 10, color: Theme.onSurfaceVariant, marginBottom: 16 },
  radioBtn: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: 'rgba(192,193,255,0.4)', alignItems: 'center', justifyContent: 'center', backgroundColor: Theme.surfaceHigh },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: 'transparent' },

  // Archived Protocols
  archivedSection: { marginTop: 40 },
  sectionHeaderArchived: { borderBottomWidth: 1, borderBottomColor: Theme.border, paddingBottom: 12, marginBottom: 16 },
  sectionTitleArchived: { fontSize: 10, color: Theme.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 2, fontWeight: '600' },
  archivedList: { gap: 8 },
  archivedRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: 'rgba(27,27,29,0.3)', borderRadius: 12 },
  archivedCheck: {},
  archivedTitle: { flex: 1, fontSize: 13, color: Theme.onSurfaceVariant, opacity: 0.6 },
  archivedXp: { fontSize: 10, color: Theme.onSurfaceVariant, opacity: 0.6 },

  emptyText: { color: Theme.onSurfaceVariant, fontSize: 14, fontStyle: 'italic', marginTop: 20, textAlign: 'center' },

  // FAB
  fab: { position: 'absolute', bottom: Platform.OS === 'ios' ? 100 : 90, right: 24, shadowColor: Theme.primaryVariant, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.6, shadowRadius: 16, elevation: 12 },
  fabGradient: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Theme.surfaceHigh, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 52, borderWidth: 1, borderColor: Theme.border, borderBottomWidth: 0 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Theme.onSurface, marginBottom: 24, letterSpacing: -0.3 },
  input: { backgroundColor: Theme.surface, borderRadius: 12, paddingHorizontal: 18, paddingVertical: 16, color: Theme.onSurface, fontSize: 15, borderWidth: 1, borderColor: Theme.border, marginBottom: 14 },
  inputNote: { height: 80, textAlignVertical: 'top' },
  modalLabel: { color: Theme.onSurfaceVariant, fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12, marginTop: 10 },
  prioritySelector: { flexDirection: 'row', gap: 10, marginBottom: 32 },
  priSelBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: Theme.border, backgroundColor: Theme.surface },
  priSelText: { color: Theme.onSurfaceVariant, fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 12, borderWidth: 1, borderColor: Theme.border, alignItems: 'center' },
  cancelBtnText: { color: Theme.onSurfaceVariant, fontWeight: '600', fontSize: 14 },
  saveBtn: { flex: 1, borderRadius: 12, overflow: 'hidden' },
  saveBtnGrad: { paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { color: Theme.surfaceHigh, fontWeight: '700', fontSize: 14 },
});
