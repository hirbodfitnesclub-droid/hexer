import { supabase } from './supabaseClient';
import { Habit } from '../types';

type HabitInsert = Omit<Habit, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'completedDates'>;
type HabitUpdate = Partial<Omit<Habit, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'completedDates'>>;

interface HabitCompletion {
    habit_id: string;
    completion_date: string; // YYYY-MM-DD
}

interface HabitQueryOptions {
    limit?: number;
    offset?: number;
    userId?: string;
    startDate?: string;
    endDate?: string;
}

export const getHabits = async ({ limit = 20, offset = 0, userId, startDate, endDate }: HabitQueryOptions = {}) => {
    const habitQuery = supabase
        .from('habits')
        .select('*')
        .order('created_at', { ascending: false });

    if (userId) habitQuery.eq('user_id', userId);

    const { data: habitsData, error: habitsError } = await habitQuery.range(offset, offset + limit);

    if (habitsError) throw habitsError;

    const completionsQuery = supabase
        .from('habit_completions')
        .select('habit_id, completion_date');

    if (userId) completionsQuery.eq('user_id', userId);
    if (startDate) completionsQuery.gte('completion_date', startDate);
    if (endDate) completionsQuery.lte('completion_date', endDate);

    const { data: completionsData, error: completionsError } = await completionsQuery;

    if (completionsError) throw completionsError;

    const completionsMap = new Map<string, string[]>();
    (completionsData as HabitCompletion[]).forEach(comp => {
        const dates = completionsMap.get(comp.habit_id) || [];
        dates.push(comp.completion_date);
        completionsMap.set(comp.habit_id, dates);
    });

    const items = (habitsData as Habit[]) || [];
    const mapped = items.map(habit => ({
        ...habit,
        completedDates: completionsMap.get(habit.id) || []
    }));

    return {
        items: mapped.slice(0, limit),
        hasMore: mapped.length > limit
    };
};

export const createHabit = async (habit: HabitInsert) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    const habitForDb = {
      ...habit,
      user_id: user.id
    };

    const { data, error } = await supabase
        .from('habits')
        .insert([habitForDb])
        .select()
        .single();
        
    if (error) throw error;
    
    // The returned object now matches the Habit type directly, just need to add empty completions array
    return { 
        ...data, 
        completedDates: [] 
    } as Habit;
};

export const updateHabit = async (id: string, updates: HabitUpdate) => {
    const { data, error } = await supabase
        .from('habits')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    
    if (error) throw error;
    // Note: this doesn't return completions. Refetch is handled by subscriptions in App.tsx.
    return {
        ...data,
        completedDates: [], // Assume completions are handled by the main state
    } as Habit;
};

export const deleteHabit = async (id: string) => {
    const { error } = await supabase
        .from('habits')
        .delete()
        .eq('id', id);
        
    if (error) throw error;
};

export const toggleHabitCompletion = async (habitId: string, date: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");

    // Check if completion exists for this date
    const { data: existing, error: selectError } = await supabase
        .from('habit_completions')
        .select('id')
        .eq('habit_id', habitId)
        .eq('completion_date', date)
        .single();

    if (selectError && selectError.code !== 'PGRST116') { // PGRST116: no rows found
        throw selectError;
    }

    if (existing) {
        // Delete it
        const { error: deleteError } = await supabase
            .from('habit_completions')
            .delete()
            .eq('id', existing.id);
        if (deleteError) throw deleteError;
    } else {
        // Create it
        const { error: insertError } = await supabase
            .from('habit_completions')
            .insert({
                user_id: user.id,
                habit_id: habitId,
                completion_date: date,
            });
        if (insertError) throw insertError;
    }
};