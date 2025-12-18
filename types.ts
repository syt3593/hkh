
export interface Nutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
}

export interface FoodItem {
  id: string;
  name: string;
  estimatedWeightGrams: number;
  nutrients: Nutrients;
  consumedPercentage: number; // 0-100
}

export interface FoodScan {
  id: string;
  timestamp: number;
  imageUrl: string;
  description: string;
  insight: string; 
  items: FoodItem[];
  globalScale: number; // 0-100
}

// 常餐模版：用户保存的固定搭配
export interface StapleMeal {
  id: string;
  name: string;
  imageUrl: string;
  items: Omit<FoodItem, 'id'>[]; // 存储模版时的组成
  totalCalories: number;
}

export enum AppState {
  IDLE = 'IDLE',
  CAMERA = 'CAMERA',
  ANALYZING = 'ANALYZING',
  RESULT = 'RESULT',
  HISTORY = 'HISTORY'
}
