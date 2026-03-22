import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  TextInput, Modal, ScrollView, Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import { getTasks, saveTasks } from '../utils/storage';
import { hapticLight, hapticMedium, hapticSuccess } from '../utils/helpers';

const PRIORITY_CONFIG = {
  HIGH: { label: 'High', color: Colors.danger, subtleColor: Colors.dangerSubtle },
  MEDIUM: { label: 'Med', color: Colors.warning, subtleColor: 'rgba(245,158,11,0.1)' },
  LOW: { label: 'Low', color: Colors.success, subtleColor: Colors.successSubtle },
};
const FILTERS = ['All', 'Active', 'Completed'];

export default function TasksScreen() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskNote, setNewTaskNote] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('MEDIUM');

  useFocusEffect(useCallback(() => { loadTasks(); }, []));

  const loadTasks = async () => setTasks(await getTasks());
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
    Alert.alert('Delete Task', 'Remove this task?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { hapticLight(); await persist(tasks.filter((t) => t.id !== id)); } },
    ]);
  };

  const updatePriority = async (id, priority) => {
    hapticLight();
    await persist(tasks.map((t) => t.id === id ? { ...t, priority } : t));
  };

  const getFiltered = () => {
    let f = [...tasks];
    if (filter === 'Active') f = f.filter((t) => !t.completed);
    if (filter === 'Completed') f = f.filter((t) => t.completed);
    f.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return { HIGH: 0, MEDIUM: 1, LOW: 2 }[a.priority] - { HIGH: 0, MEDIUM: 1, LOW: 2 }[b.priority];
    });
    return f;
  };

  const activeC = tasks.filter((t) => !t.completed).length;
  const doneC = tasks.filter((t) => t.completed).length;
  const filtered = getFiltered();

  const renderTask = ({ item, index }) => {
    const p = PRIORITY_CONFIG[item.priority];
    return (
      <View style={[styles.taskCard, index < filtered.length - 1 && styles.taskCardBorder]}>
        <View style={[styles.priorityStripe, { backgroundColor: p.color }]} />
        <View style={styles.taskBody}>
          <View style={styles.taskMain}>
            <TouchableOpacity
              style={[styles.checkbox, item.completed && { backgroundColor: Colors.primary, borderColor: Colors.primary }]}
              onPress={() => toggleComplete(item.id)}
            >
              {item.completed && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
            <View style={styles.taskInfo}>
              <Text style={[styles.taskTitle, item.completed && styles.taskTitleDone]}>{item.title}</Text>
              {item.note ? <Text style={styles.taskNote}>{item.note}</Text> : null}
            </View>
          </View>
          <View style={styles.taskActions}>
            <View style={styles.priorityChips}>
              {Object.keys(PRIORITY_CONFIG).map((key) => {
                const c = PRIORITY_CONFIG[key];
                const active = item.priority === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.chip, active && { backgroundColor: c.subtleColor, borderColor: c.color }]}
                    onPress={() => updatePriority(item.id, key)}
                  >
                    <Text style={[styles.chipText, active && { color: c.color }]}>{c.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity onPress={() => deleteTask(item.id)} style={styles.deleteBtn}>
              <Text style={styles.deleteBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <LinearGradient colors={Colors.gradientBg} style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Tasks</Text>
          <Text style={styles.headerSub}>{activeC} active · {doneC} done</Text>
        </View>
        <TouchableOpacity onPress={() => setShowAddModal(true)} activeOpacity={0.85}>
          <LinearGradient colors={Colors.gradientPrimary} style={styles.addBtn}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}><Text style={styles.statVal}>{tasks.length}</Text><Text style={styles.statLabel}>Total</Text></View>
        <View style={styles.statDiv} />
        <View style={styles.statItem}><Text style={[styles.statVal, { color: Colors.danger }]}>{tasks.filter((t) => t.priority === 'HIGH' && !t.completed).length}</Text><Text style={styles.statLabel}>High</Text></View>
        <View style={styles.statDiv} />
        <View style={styles.statItem}><Text style={[styles.statVal, { color: Colors.success }]}>{doneC}</Text><Text style={styles.statLabel}>Done</Text></View>
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
            onPress={() => { setFilter(f); hapticLight(); }}
          >
            <Text style={[styles.filterBtnText, filter === f && styles.filterBtnTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}><Text style={styles.emptyIconText}>✓</Text></View>
          <Text style={styles.emptyTitle}>{filter === 'Completed' ? 'None completed yet' : 'All clear'}</Text>
          <Text style={styles.emptySub}>Add a task to get started</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderTask}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Task</Text>
            <TextInput
              style={styles.input} placeholder="Task title..." placeholderTextColor={Colors.textMuted}
              value={newTaskTitle} onChangeText={setNewTaskTitle} autoFocus
            />
            <TextInput
              style={[styles.input, styles.inputNote]} placeholder="Notes (optional)..." placeholderTextColor={Colors.textMuted}
              value={newTaskNote} onChangeText={setNewTaskNote} multiline numberOfLines={2}
            />
            <Text style={styles.modalLabel}>Priority</Text>
            <View style={styles.prioritySelector}>
              {Object.keys(PRIORITY_CONFIG).map((key) => {
                const c = PRIORITY_CONFIG[key];
                const active = newTaskPriority === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.priSelBtn, active && { backgroundColor: c.subtleColor, borderColor: c.color }]}
                    onPress={() => { setNewTaskPriority(key); hapticLight(); }}
                  >
                    <Text style={[styles.priSelText, active && { color: c.color }]}>{c.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowAddModal(false); hapticLight(); }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={addTask} activeOpacity={0.85}>
                <LinearGradient colors={Colors.gradientPrimary} style={styles.saveBtnGrad}>
                  <Text style={styles.saveBtnText}>Add Task</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 64 : 48, marginBottom: 24 },
  headerTitle: { fontSize: 32, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -1 },
  headerSub: { fontSize: 13, color: Colors.textMuted, marginTop: 6, fontWeight: '500' },
  addBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 24 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  statsRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 24, marginBottom: 20, backgroundColor: Colors.bgCard, borderRadius: 24, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 16 },
  statDiv: { width: 1, height: 28, backgroundColor: Colors.border },
  statVal: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: '600' },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 24, marginBottom: 20 },
  filterBtn: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 24, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgCard },
  filterBtnActive: { backgroundColor: Colors.primarySubtle, borderColor: Colors.borderActive },
  filterBtnText: { color: Colors.textMuted, fontWeight: '600', fontSize: 13 },
  filterBtnTextActive: { color: Colors.primary, fontWeight: '700' },
  list: { paddingHorizontal: 24, paddingBottom: 120 },
  taskCard: { flexDirection: 'row', backgroundColor: Colors.bgCard, borderWidth: 1, borderColor: Colors.border, borderRadius: 24, marginBottom: 12, overflow: 'hidden' },
  taskCardBorder: {},
  priorityStripe: { width: 4 },
  taskBody: { flex: 1, padding: 16 },
  taskMain: { flexDirection: 'row', gap: 14, marginBottom: 14 },
  checkbox: { width: 26, height: 26, borderRadius: 8, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkmark: { color: '#fff', fontWeight: '800', fontSize: 13 },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, lineHeight: 22 },
  taskTitleDone: { textDecorationLine: 'line-through', color: Colors.textMuted },
  taskNote: { fontSize: 12, color: Colors.textMuted, marginTop: 4, lineHeight: 18 },
  taskActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priorityChips: { flexDirection: 'row', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgCard },
  chipText: { color: Colors.textMuted, fontWeight: '700', fontSize: 11, letterSpacing: 0.3 },
  deleteBtn: { padding: 8 },
  deleteBtnText: { fontSize: 14, color: Colors.textMuted },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyIcon: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyIconText: { fontSize: 24, color: Colors.textMuted },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.3, marginBottom: 8 },
  emptySub: { fontSize: 14, color: Colors.textMuted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.bgElevated, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 52, borderWidth: 1, borderColor: Colors.border },
  modalTitle: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, marginBottom: 24, letterSpacing: -0.5 },
  input: { backgroundColor: Colors.bgCard, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 16, color: Colors.textPrimary, fontSize: 15, borderWidth: 1, borderColor: Colors.border, marginBottom: 14 },
  inputNote: { height: 80, textAlignVertical: 'top' },
  modalLabel: { color: Colors.textMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 12 },
  prioritySelector: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  priSelBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.bgCard },
  priSelText: { color: Colors.textMuted, fontSize: 13, fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, paddingVertical: 16, borderRadius: 16, borderWidth: 1, borderColor: Colors.border, alignItems: 'center' },
  cancelBtnText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 15 },
  saveBtn: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  saveBtnGrad: { paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
