// Re-export API services from shared libraries with mobile-specific configurations
import { bookAPI as sharedBookAPI, userAPI as sharedUserAPI } from '@my-many-books/shared-api';

// Configure API base URL for mobile
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';

// Configure the shared APIs for mobile environment
sharedBookAPI.setBaseURL?.(API_BASE_URL);
sharedUserAPI.setBaseURL?.(API_BASE_URL);

export const bookAPI = sharedBookAPI;
export const userAPI = sharedUserAPI;

// Mobile-specific API utilities
export const apiUtils = {
  isOnline: () => {
    // In a real app, you'd check network connectivity
    return true;
  },
  
  getAuthHeaders: () => {
    // Get auth headers for requests
    return {
      'Content-Type': 'application/json',
    };
  },
  
  handleOfflineError: (error: any) => {
    // Handle offline scenarios
    if (!apiUtils.isOnline()) {
      throw new Error('You are offline. Please check your internet connection.');
    }
    throw error;
  },
};