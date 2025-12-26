import { supabase } from '../lib/supabase';
import { FoodScan, StapleMeal, CriticalSample } from '../types';

/**
 * 将 base64 图片上传到 Supabase Storage
 */
export async function uploadImage(base64Data: string): Promise<string> {
  try {
    // 移除 base64 前缀并转换为 Blob
    const base64Str = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const byteCharacters = atob(base64Str);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/jpeg' });
    
    const fileName = `food_${Date.now()}.jpg`;
    const { data, error } = await supabase.storage
      .from('food-images')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: false
      });

    if (error) throw error;

    // 获取公共 URL
    const { data: { publicUrl } } = supabase.storage
      .from('food-images')
      .getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw new Error('图片上传云端失败');
  }
}

/**
 * 保存识餐记录到数据库
 */
export async function saveMealToDb(scan: FoodScan) {
  const { data: meal, error: mealError } = await supabase
    .from('meals')
    .insert({
      timestamp: scan.timestamp,
      description: scan.description,
      insight: scan.insight,
      image_url: scan.imageUrl,
      global_scale: scan.globalScale
    })
    .select()
    .single();

  if (mealError) throw mealError;

  const itemsToInsert = scan.items.map(item => ({
    meal_id: meal.id,
    name: item.name,
    estimated_weight_grams: item.estimatedWeightGrams,
    original_weight_grams: item.originalWeightGrams,
    consumed_percentage: item.consumedPercentage,
    nutrients: item.nutrients
  }));

  const { error: itemsError } = await supabase
    .from('meal_items')
    .insert(itemsToInsert);

  if (itemsError) throw itemsError;
  
  return meal.id;
}

/**
 * 获取历史记录
 */
export async function fetchMealsFromDb(): Promise<FoodScan[]> {
  const { data, error } = await supabase
    .from('meals')
    .select(`
      *,
      meal_items (*)
    `)
    .order('timestamp', { ascending: false })
    .limit(50);

  if (error) throw error;

  return data.map(meal => ({
    id: meal.id,
    timestamp: meal.timestamp,
    imageUrl: meal.image_url,
    description: meal.description,
    insight: meal.insight,
    globalScale: meal.global_scale,
    items: meal.meal_items.map((it: any) => ({
      id: it.id,
      name: it.name,
      estimatedWeightGrams: it.estimated_weight_grams,
      originalWeightGrams: it.original_weight_grams,
      consumedPercentage: it.consumed_percentage,
      nutrients: it.nutrients
    }))
  }));
}

/**
 * 保存常餐模版
 */
export async function saveStapleToDb(staple: Omit<StapleMeal, 'id'>) {
  const { data, error } = await supabase
    .from('staple_meals')
    .insert({
      name: staple.name,
      image_url: staple.imageUrl,
      total_calories: staple.totalCalories,
      items: staple.items
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * 获取常餐模版
 */
export async function fetchStaplesFromDb(): Promise<StapleMeal[]> {
  const { data, error } = await supabase
    .from('staple_meals')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  return data.map(it => ({
    id: it.id,
    name: it.name,
    imageUrl: it.image_url,
    totalCalories: it.total_calories,
    items: it.items
  }));
}

/**
 * 保存偏差样本
 */
export async function saveCriticalSampleToDb(sample: Omit<CriticalSample, 'id'>) {
  const { error } = await supabase
    .from('critical_samples')
    .insert({
      timestamp: sample.timestamp,
      food_name: sample.foodName,
      image_url: sample.imageUrl,
      ai_weight: sample.aiWeight,
      user_weight: sample.userWeight,
      deviation_percent: sample.deviationPercent
    });

  if (error) throw error;
}

/**
 * 获取偏差样本
 */
export async function fetchCriticalSamplesFromDb(): Promise<CriticalSample[]> {
  const { data, error } = await supabase
    .from('critical_samples')
    .select('*')
    .order('timestamp', { ascending: false });

  if (error) throw error;

  return data.map(it => ({
    id: it.id,
    timestamp: it.timestamp,
    foodName: it.food_name,
    imageUrl: it.image_url,
    aiWeight: it.ai_weight,
    userWeight: it.user_weight,
    deviationPercent: it.deviation_percent
  }));
}

