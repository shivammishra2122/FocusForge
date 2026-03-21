import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../constants/colors';
import { getTasks, saveTasks } from '../utils/storage';
import { hapticLight, hapticMedium, hapticSuccess } from '../utils/helpers';

const PRIORITIES = {
  HIGH: { label: 'High', color: Colors.danger, icon: '🔴' },
  MEDIUM: { label: 'Medium', color: Colors.accentWarm, icon: '🟡' },
  LOW: { label: 'Low', color: Colors.accent, icon: '🟢' },
};

const FILTERS = ['All', 'Active', 'Completed'];

export default function TasksScreen() {
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskNote, setNewTaskNote] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('MEDIUM');
  const [editTask, setEditTask] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadTasks();
    }, [])
  );

  const loadTasks = async () => {
    const t = await getTasks();
    setTasks(t);
  };

  const persist = async (updated) => {
    setTasks(updated);
    await saveTasks(updated);
  };

  const addTask = async () => {
    if (!newTaskTitle.trim()) return;
    hapticMedium();
    const task = {
      id: Date.now().toString(),
      title: newTaskTitle.trim(),
      note: newTaskNote.trim(),
      priority: newTaskPriority,
      completed: false,
      createdAt: Date.now(),
      completedAt: null,
    };
    const updated = [task, ...tasks];
    await persist(updated);
    setNewTaskTitle('');
    setNewTaskNote('');
    setNewTaskPriority('MEDIUM');
    setShowAddModal(false);
  };

  const toggleComplete = async (id) => {
    hapticSuccess();
    const updated = tasks.map((t) =>
      t.id === id ? { ...t, completed: !t.completed, completedAt: !t.completed ? Date.now() : null } : t
    );
    await persist(updated);
  };

  const deleteTask = (id) => {
    Alert.alert('Delete Task', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          hapticLight();
          const updated = tasks.filter((t) => t.id !== id);
          await persist(updated);
        }
      }
    ]);
  };

  const updatePriority = async (id, priority) => {
    hapticLight();
    const updated = tasks.map((t) => t.id === id ? { ...t, priority } : t);
    await persist(updated);
  };

  const getFiltered = () => {
    let filtered = [...tasks];
    if (filter === 'Active') filtered = filtered.filter((t) => !t.completed);
    if (filter === 'Completed') filtered = filtered.filter((t) => t.completed);

    // Sort: high priority active first
    filtered.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    return filtered;
  };

  const activeCount = tasks.filter((t) => !t.completed).length;
  const completedCount = tasks.filter((t) => t.completed).length;

  const renderTask = ({ item }) => {
    const p = PRIORITIES[item.priority];
    return (
      <View style={[styles.taskCard, item.completed && styles.taskCardCompleted]}>
        {/* Priority bar */}
        <View style={[styles.priorityBar, { backgroundColor: p.color }]} />

        <View style={styles.taskBody}>
          <View style={styles.taskTop}>
            <TouchableOpacity
              style={[styles.checkbox, item.completed && { backgroundColor: Colors.accent, borderColor: Colors.accent }]}
              onPress={() => toggleComplete(item.id)}
            >
              {item.completed && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>

            <View style={styles.taskInfo}>
              <Text style={[styles.taskTitle, item.completed && styles.taskTitleDone]}>{item.title}</Text>
              {item.note ? <Text style={styles.taskNote}>{item.note}</Text> : null}
            </View>
          </View>

          <View style={styles.taskFooter}>
            <View style={styles.priorityRow}>
              {Object.keys(PRIORITIES).map((key) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => updatePriority(item.id, key)}
                  style={[styles.priorityChip, item.priority === key && { backgroundColor: PRIORITIES[key].color + '30', borderColor: PRIORITIES[key].color }]}
                >
                  <Text style={styles.priorityChipText}>{PRIORITIES[key].icon}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={() => deleteTask(item.id)} style={styles.deleteBtn}>
              <Text style={styles.deleteBtnText}>🗑</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const filtered = getFiltered();

  return (
    <LinearGradient colors={[Colors.bg, Colors.bgCard]} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Tasks</Text>
          <Text style={styles.headerSub}>{activeCount} active • {completedCount} done</Text>
        </View>
        <TouchableOpacity onPress={() => setShowAddModal(true)} activeOpacity={0.85}>
          <LinearGradient colors={Colors.gradientPrimary} style={styles.addBtn}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNum}>{tasks.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statBox, styles.statBoxMid]}>
          <Text style={[styles.statNum, { color: Colors.danger }]}>{tasks.filter((t) => t.priority === 'HIGH' && !t.completed).length}</Text>
          <Text style={styles.statLabel}>High Priority</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: Colors.accent }]}>{completedCount}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && { backgroundColor: Colors.primary + '25', borderColor: Colors.primary }]}
            onPress={() => { setFilter(f); hapticLight(); }}
          >
            <Text style={[styles.filterBtnText, filter === f && { color: Colors.primary }]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>✅</Text>
          <Text style={styles.emptyTitle}>{filter === 'Completed' ? 'No tasks completed yet' : 'All clear!'}</Text>
          <Text style={styles.emptySubtitle}>Add a task to get started</Text>
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

      {/* Add Task Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Task</Text>

            <TextInput
              style={styles.input}
              placeholder="Task title..."
              placeholderTextColor={Colors.textMuted}
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
              autoFocus
            />
            <TextInput
              style={[styles.input, styles.inputNote]}
              placeholder="Notes (optional)..."
              placeholderTextColor={Colors.textMuted}
              value={newTaskNote}
              onChangeText={setNewTaskNote}
              multiline
              numberOfLines={2}
            />

            <Text style={styles.priorityLabel}>Priority</Text>
            <View style={styles.prioritySelector}>
              {Object.keys(PRIORITIES).map((key) => {
                const p = PRIORITIES[key];
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.prioritySelectorBtn, newTaskPriority === key && { backgroundColor: p.color + '25', borderColor: p.color }]}
                    onPress={() => { setNewTaskPriority(key); hapticLight(); }}
                  >
                    <Text style={styles.prioritySelectorEmoji}>{p.icon}</Text>
                    <Text style={[styles.prioritySelectorText, newTaskPriority === key && { color: p.color }]}>{p.label}</Text>
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
  container: { flex: 1, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 24 },
  headerTitle: { fontSize: 32, fontWeight: '900', color: Colors.textPrimary },
  headerSub: { fontSize: 13, color: Colors.textMuted, marginTop: 4, fontWeight: '600' },
  addBtn: { paddingHorizontal: 22, paddingVertical: 12, borderRadius: 24, elevation: 8, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  statsRow: { flexDirection: 'row', marginHorizontal: 24, marginBottom: 20, backgroundColor: Colors.glass, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: Colors.glassBorder },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 18 },
  statBoxMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: Colors.glassBorder },
  statNum: { fontSize: 24, fontWeight: '900', color: Colors.textPrimary },
  statLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 4, textTransform: 'uppercase', letterSpacing: 1, fontWeight: '700' },
  filterRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 24, marginBottom: 20 },
  filterBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 22, borderWidth: 1, borderColor: Colors.glassBorder, backgroundColor: Colors.glass },
  filterBtnText: { color: Colors.textSecondary, fontWeight: '800', fontSize: 13 },
  list: { paddingHorizontal: 24, paddingBottom: 120, gap: 14 },
  taskCard: { backgroundColor: Colors.glass, borderRadius: 24, borderWidth: 1, borderColor: Colors.glassBorder, flexDirection: 'row', overflow: 'hidden' },
  taskCardCompleted: { opacity: 0.5 },
  priorityBar: { width: 6 },
  taskBody: { flex: 1, padding: 20 },
  taskTop: { flexDirection: 'row', gap: 14, marginBottom: 16 },
  checkbox: { width: 28, height: 28, borderRadius: 10, borderWidth: 2, borderColor: Colors.glassBorder, alignItems: 'center', justifyContent: 'center', marginTop: 2, backgroundColor: 'rgba(255,255,255,0.03)' },
  checkmark: { color: '#fff', fontWeight: '900', fontSize: 14 },
  taskInfo: { flex: 1 },
  taskTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, lineHeight: 24 },
  taskTitleDone: { textDecorationLine: 'line-through', color: Colors.textMuted },
  taskNote: { fontSize: 13, color: Colors.textMuted, marginTop: 6, lineHeight: 20, fontWeight: '500' },
  taskFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityChip: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, borderColor: Colors.glassBorder, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.03)' },
  priorityChipText: { fontSize: 14 },
  deleteBtn: { padding: 6, backgroundColor: Colors.danger + '10', borderRadius: 10 },
  deleteBtnText: { fontSize: 16 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyEmoji: { fontSize: 64, marginBottom: 20 },
  emptyTitle: { fontSize: 22, fontWeight: '900', color: Colors.textPrimary, marginBottom: 10 },
  emptySubtitle: { fontSize: 15, color: Colors.textMuted, fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.bgElevated, borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 32, paddingBottom: 60, borderWidth: 1, borderColor: Colors.glassBorder },
  modalTitle: { fontSize: 26, fontWeight: '900', color: Colors.textPrimary, marginBottom: 24, textAlign: 'center' },
  input: { backgroundColor: Colors.glass, borderRadius: 18, paddingHorizontal: 20, paddingVertical: 18, color: Colors.textPrimary, fontSize: 16, borderWidth: 1, borderColor: Colors.glassBorder, marginBottom: 16 },
  inputNote: { height: 100, textAlignVertical: 'top' },
  priorityLabel: { color: Colors.textSecondary, fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 14 },
  prioritySelector: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  prioritySelectorBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 18, borderWidth: 1, borderColor: Colors.glassBorder, backgroundColor: Colors.glass },
  prioritySelectorEmoji: { fontSize: 22, marginBottom: 6 },
  prioritySelectorText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '800' },
  modalActions: { flexDirection: 'row', gap: 16 },
  cancelBtn: { flex: 1, paddingVertical: 18, borderRadius: 20, borderWidth: 1, borderColor: Colors.glassBorder, alignItems: 'center' },
  cancelBtnText: { color: Colors.textSecondary, fontWeight: '800', fontSize: 16 },
  saveBtn: { flex: 1, borderRadius: 20, overflow: 'hidden' },
  saveBtnGrad: { paddingVertical: 18, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
});
