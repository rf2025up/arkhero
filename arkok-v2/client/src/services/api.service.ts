import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import {
  ApiResponse,
  PaginatedResponse,
  ErrorResponse,
  StudentsResponse,
  HabitsResponse,
  DashboardStatsResponse,
  LessonPlanResponse,
  isSuccessResponse,
  extractData,
  extractErrorMessage
} from '../types/api';
import { Student } from '../types/student';

// API基础配置 - Unified Hosting架构：确保同源请求
// 强制使用相对路径，避免CORS问题
const API_BASE_URL = '/api';

// --- [AUTH FIX] 强制重写：使用Axios和拦截器的API服务 ---
export class ApiService {
  private api: AxiosInstance;
  private cache: Map<string, { data: any, timestamp: number }> = new Map();
  private readonly CACHE_TTL = 1000 * 60 * 5; // 5分钟有效期

  constructor(baseURL: string = API_BASE_URL) {
    // 创建Axios实例
    this.api = axios.create({
      baseURL: baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // --- 这是最关键的修复：请求拦截器 - 移动端兼容性增强 ---
    this.api.interceptors.request.use(
      (config) => {
        // 移动端存储兼容性检查 - 修复Token键名不匹配问题
        let token = null;

        // 🆕 判断是否为平台管理API请求
        const isPlatformRequest = config.url?.includes('/platform');

        try {
          if (isPlatformRequest) {
            // 🆕 平台请求优先使用 platform_auth_token
            token = localStorage.getItem('platform_auth_token');
            if (!token) {
              // 兼容：如果没有平台token，尝试普通token
              token = localStorage.getItem('auth_token');
            }
          } else {
            // 普通请求使用 auth_token
            token = localStorage.getItem('auth_token');
            if (!token) {
              // 兼容旧版本，查找 'token' 键名
              token = localStorage.getItem('token');
            }
          }
        } catch (e) {
          console.warn('[MOBILE FIX] localStorage访问失败，尝试sessionStorage:', e);
          try {
            token = sessionStorage.getItem('auth_token') || sessionStorage.getItem('token');
          } catch (se) {
            console.error('[MOBILE FIX] sessionStorage也访问失败:', se);
          }
        }

        // 🔥 新增：发送请求时的Token调试日志
        console.log(`🚀 Sending Request to ${config.url}. Token length: ${token ? token.length : 'MISSING'}`);

        console.log(`[AUTH FIX] Interceptor: Processing request to ${config.method?.toUpperCase()} ${config.url}`);
        console.log(`[AUTH FIX] Interceptor: Found token? ${!!token}. Token preview: ${token ? token.substring(0, 20) + '...' : 'none'}`);

        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
          console.log(`[AUTH FIX] Interceptor: ✅ Token attached to request headers`);
        } else {
          console.warn(`[AUTH FIX] Interceptor: ❌ No token found in storage`);
        }

        return config;
      },
      (error) => {
        console.error(`[AUTH FIX] Interceptor: Request error`, error);
        return Promise.reject(error);
      }
    );

    // --- 响应拦截器：处理401错误 ---
    this.api.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        // 🔥 新增：详细错误调试日志
        console.group("🔥 API Error Trap");
        console.log("URL:", error.config?.url);
        console.log("Method:", error.config?.method);
        console.log("Status Code:", error.response?.status);
        console.log("Error Message:", error.message);
        console.log("Full Response:", error.response);
        console.groupEnd();

        // 只在真正的认证失败时触发登出，避免误判
        if (error.response?.status === 401) {
          const errorMessage = error.response.data?.message?.toLowerCase() || '';

          // 检查是否是真正的认证失败，而不是其他404或服务错误
          if (errorMessage.includes('unauthorized') ||
            errorMessage.includes('token') ||
            errorMessage.includes('authentication') ||
            error.response.data?.error?.toLowerCase().includes('unauthorized')) {

            console.warn(`[AUTH FIX] 401 Authentication error, clearing tokens`);

            // 清除所有认证相关的存储（包括所有可能的键名）
            try {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              localStorage.removeItem('auth_token');
              localStorage.removeItem('auth_user');
            } catch (e) {
              console.warn('Failed to clear localStorage:', e);
            }

            // 🔥 暂时注释掉跳转代码，防止页面跳走！
            // 只有在非登录页面时才重定向
            // if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
            //   console.log(`[AUTH FIX] Redirecting to login page from ${window.location.pathname}`);
            //   window.location.href = '/login';
            // }
            console.log(`🔥 AUTO-LOGOUT DISABLED: Page will not redirect to login for debugging`);
          }
        }

        return Promise.reject(error);
      }
    );

    console.log(`[AUTH FIX] ApiService initialized with baseURL: ${baseURL}`);
  }

  // HTTP方法
  async get<T>(endpoint: string, params?: Record<string, any>, options?: { useCache?: boolean }): Promise<ApiResponse<T>> {
    const cacheKey = `${endpoint}${JSON.stringify(params || {})}`;

    // 🚀 SWR 策略：如果命中缓存，立即返回缓存数据
    if (options?.useCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      // 这里的逻辑是：即便返回了缓存，外层组件仍然可以根据需要再次触发 fetch 来刷新
      // 为了保持兼容性，我们这里返回一个带有特殊标记的 response
      console.log(`[CACHE] 🎯 Hit: ${cacheKey}`);
      return {
        ...cached.data,
        _fromCache: true
      };
    }

    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.api.get(endpoint, { params });

      // 存储缓存
      if (options?.useCache && response.data.success) {
        this.cache.set(cacheKey, { data: response.data, timestamp: Date.now() });
      }

      return response.data;
    } catch (error) {
      console.error(`[AUTH FIX] GET ${endpoint} failed:`, error);
      throw this.handleError(error);
    }
  }

  /**
   * 🆕 强制失效特定缓存 (用于突变后)
   */
  public invalidateCache(partialKey?: string) {
    console.log(`[CACHE] 🧩 Before invalidation, existing keys:`, Array.from(this.cache.keys()));
    if (!partialKey) {
      this.cache.clear();
      console.log('[CACHE] 🧹 All cleared');
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.includes(partialKey)) {
        this.cache.delete(key);
        console.log(`[CACHE] 🗑️ Invalidated: ${key}`);
      }
    }
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.api.post(endpoint, data);
      return response.data;
    } catch (error) {
      console.error(`[AUTH FIX] POST ${endpoint} failed:`, error);
      throw this.handleError(error);
    }
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.api.put(endpoint, data);
      return response.data;
    } catch (error) {
      console.error(`[AUTH FIX] PUT ${endpoint} failed:`, error);
      throw this.handleError(error);
    }
  }

  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.api.patch(endpoint, data);
      return response.data;
    } catch (error) {
      console.error(`[AUTH FIX] PATCH ${endpoint} failed:`, error);
      throw this.handleError(error);
    }
  }

  async delete<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    try {
      const config = data ? { data } : undefined;
      const response: AxiosResponse<ApiResponse<T>> = await this.api.delete(endpoint, config);
      return response.data;
    } catch (error) {
      console.error(`[AUTH FIX] DELETE ${endpoint} failed:`, error);
      throw this.handleError(error);
    }
  }

  private handleError(error: any): Error {
    if (error.response?.data?.message) {
      return new Error(error.response.data.message);
    }
    if (error.response?.data?.error) {
      return new Error(error.response.data.error);
    }
    if (error.response?.status) {
      return new Error(`HTTP ${error.response.status}: ${error.response.statusText}`);
    }
    if (error.message) {
      return new Error(error.message);
    }
    return new Error('Unknown error occurred');
  }

  // 类型安全的辅助方法
  public async getData<T>(endpoint: string, params?: Record<string, any>): Promise<T | null> {
    const response = await this.get<T>(endpoint, params);
    return extractData(response);
  }

  public async postForData<T>(endpoint: string, data?: any): Promise<T | null> {
    const response = await this.post<T>(endpoint, data);
    return extractData(response);
  }

  public async putForData<T>(endpoint: string, data?: any): Promise<T | null> {
    const response = await this.put<T>(endpoint, data);
    return extractData(response);
  }

  public async deleteForData<T>(endpoint: string): Promise<T | null> {
    const response = await this.delete<T>(endpoint);
    return extractData(response);
  }

  // 验证响应是否成功
  public isSuccess<T>(response: ApiResponse<T>): response is ApiResponse<T> & { success: true } {
    return isSuccessResponse(response);
  }

  // 提取错误消息
  public getErrorMessage(response: any): string {
    return extractErrorMessage(response);
  }

  // 专用API方法 - 类型安全
  public async getStudents(): Promise<ApiResponse<StudentsResponse>> {
    return this.get<StudentsResponse>('/students');
  }

  // 便捷方法：直接获取学生数据
  public async getStudentsData(): Promise<StudentsResponse | null> {
    const response = await this.get<StudentsResponse>('/students');
    return extractData(response);
  }

  // 🆕 学生相关API
  public get students() {
    return {
      create: (data: {
        name: string;
        className: string;
        teacherId: string;
        schoolId: string;
      }) => this.post<Student>('/students', data),

      transfer: (data: {
        studentIds: string[];
        targetTeacherId: string;
      }) => this.post<any>('/students/transfer', data)
    };
  }

  // 🆕 用户/老师相关API
  public get users() {
    return {
      create: (data: {
        username: string;
        name: string;
        primaryClassName?: string;
        email?: string;
      }) => this.post<any>('/users', data),

      list: (params?: { search?: string; page?: number; limit?: number }) =>
        this.get<any>('/users', params),

      update: (id: string, data: any) =>
        this.put<any>(`/users/${id}`, data),

      delete: (id: string) =>
        this.delete<any>(`/users/${id}`)
    };
  }

  // 🆕 平台管理API
  public get platform() {
    return {
      getOverview: () => this.get<any>('/platform/overview'),
      listCampuses: () => this.get<any[]>('/platform/campuses'),
      updateStatus: (schoolId: string, isActive: boolean) =>
        this.patch<any>(`/platform/campuses/${schoolId}/status`, { isActive }),
      updateExpiry: (schoolId: string, expiredAt: string) =>
        this.patch<any>(`/platform/campuses/${schoolId}/expiry`, { expiredAt }),
      updateCampus: (schoolId: string, data: { name?: string; planType?: string; expiredAt?: string }) =>
        this.patch<any>(`/platform/campuses/${schoolId}`, data),
      createCampus: (data: { name: string; adminUsername: string; adminName: string; planType?: string }) =>
        this.post<any>('/platform/campuses', data),
      globalSearch: (query: string, type: 'student' | 'teacher' = 'student', limit: number = 20) =>
        this.get<any>(`/platform/search?q=${encodeURIComponent(query)}&type=${type}&limit=${limit}`)
    };
  }

  // 🆕 记录相关API
  public get records() {
    return {
      create: (data: {
        studentId: string;
        title: string;
        category: string;
        subcategory?: string;  // 🆕 分类标题
        exp: number;
        type?: string;
      }) => this.post<any>('/records', data),

      passAll: (studentId: string, expBonus: number = 0, courseInfo?: any) =>
        this.patch<any>(`/records/student/${studentId}/pass-all`, { expBonus, courseInfo }),

      updateProgress: (data: {
        studentId: string;
        schoolId: string;
        teacherId: string;
        courseInfo: any;
      }) => this.post<any>('/records/progress-override', data),

      getSyllabus: (params: { subject: string; version?: string; grade?: string; semester?: string }) =>
        this.get<any>('/records/curriculum/syllabus', { params }),
    };
  }

  public async getHabits(): Promise<ApiResponse<HabitsResponse>> {
    return this.get<HabitsResponse>('/habits');
  }

  public async getDashboardStats(): Promise<ApiResponse<DashboardStatsResponse>> {
    return this.get<DashboardStatsResponse>('/dashboard');
  }

  public async getLessonPlan(id: string): Promise<ApiResponse<LessonPlanResponse>> {
    return this.get<LessonPlanResponse>(`/lesson-plans/${id}`);
  }

  public async postLessonPlan(data: any): Promise<ApiResponse<LessonPlanResponse>> {
    return this.post<LessonPlanResponse>('/lesson-plans', data);
  }
}

// 创建全局API实例
export const apiService = new ApiService();

// --- [AUTH FIX] 强制重写：具体API方法，全部使用新的拦截器 ---
export const API = {
  // 通用HTTP方法
  get: <T>(endpoint: string, params?: Record<string, any>) => apiService.get<T>(endpoint, params),
  post: <T>(endpoint: string, data?: any) => apiService.post<T>(endpoint, data),
  put: <T>(endpoint: string, data?: any) => apiService.put<T>(endpoint, data),
  delete: <T>(endpoint: string) => apiService.delete<T>(endpoint),
  patch: <T>(endpoint: string, data?: any) => apiService.patch<T>(endpoint, data),

  // 健康检查
  health: () => apiService.get<{ status: string }>('/health'),

  // 学校相关
  schools: {
    list: () => apiService.get<Array<{ id: string; name: string; planType: string }>>('/schools'),
    getStats: (schoolId: string) => apiService.get<any>(`/schools/${schoolId}/stats`),
  },

  // 学生相关
  students: {
    getLeaderboard: (schoolId: string, options?: {
      limit?: number;
      className?: string;
      sortBy?: 'points' | 'exp';
    }) => apiService.get('/students', { schoolId, ...options }),

    getDetail: (studentId: string) => apiService.get(`/score/student/${studentId}`),

    updateScore: (data: {
      studentId: string;
      points?: number;
      exp?: number;
      reason?: string;
      taskId?: string;
    }) => apiService.post('/score/add', data),

    batchUpdateScore: (data: {
      schoolId: string;
      updates: Array<{
        studentId: string;
        points?: number;
        exp?: number;
        reason?: string;
        taskId?: string;
      }>;
    }) => apiService.post('/score/batch', data),

    getClasses: (schoolId: string) => apiService.get<Array<{
      className: string;
      studentCount: number;
      avgPoints: number;
      avgExp: number;
    }>>(`/score/classes/${schoolId}`),

    // 新增学生
    create: (data: {
      name: string;
      className: string;
      teacherId: string;
      schoolId: string;
    }) => apiService.post<Student>('/students', data),

    // 🆕 师生关系转移 - "抢人"功能
    transfer: (data: {
      studentIds: string[];
      targetTeacherId: string;
    }) => apiService.post<any>('/students/transfer', data),

    // 🆕 获取学科连胜排行榜 (风云榜)
    getSubjectLeaderboard: (schoolId: string, subject: string, limit: number = 10) =>
      apiService.get<any>(`/streaks/leaderboard/subject/${subject}`, { schoolId, limit }),
  },

  // LMS教学计划相关
  lms: {
    publishPlan: (data: {
      schoolId: string;
      teacherId: string;
      title: string;
      content: any;
      date: string;
      tasks: Array<{
        type: string;
        title: string;
        content?: any;
        expAwarded: number;
      }>;
    }) => apiService.post('/lms/publish', data),

    getLessonPlans: (schoolId: string, options?: {
      page?: number;
      limit?: number;
      startDate?: string;
      endDate?: string;
    }) => apiService.get('/lms/plans', { schoolId, ...options }),

    getLessonPlanDetail: (lessonPlanId: string) => apiService.get(`/lms/plans/${lessonPlanId}`),

    deleteLessonPlan: (lessonPlanId: string) => apiService.delete(`/lms/plans/${lessonPlanId}`),

    getSchoolStats: (schoolId: string) => apiService.get(`/lms/stats/${schoolId}`),
  },

  // 任务记录 (Records) 相关
  records: {
    create: (data: {
      studentId: string;
      title: string;
      category: string;
      subcategory?: string;  // 🆕 分类标题
      exp: number;
      type?: string;
    }) => apiService.post('/records', data),

    passAll: (studentId: string, expBonus: number = 0) =>
      apiService.patch(`/records/student/${studentId}/pass-all`, { expBonus }),
  },

  // 1v1 个性化辅导相关
  tutoring: {
    list: (params?: {
      studentId?: string;
      status?: string;
      dateRange?: { start: string; end: string };
      limit?: number;
    }) => apiService.get<any[]>('/personalized-tutoring', params),

    updateStatus: (id: string, data: {
      status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
      completionNotes?: string;
    }) => apiService.patch<any>(`/personalized-tutoring/${id}/status`, data),
  },

  // --- [AUTH FIX] 强制重写：大屏数据，使用新的认证机制 ---
  dashboard: {
    getData: (schoolId: string) => apiService.get('/dashboard', { schoolId }),
    getRealtimeData: (schoolId: string) => apiService.get(`/dashboard/realtime/${schoolId}`),
  },

  // 认证相关
  auth: {
    login: (credentials: { username: string; password: string }) =>
      apiService.post<{ token: string; user: any }>('/auth/login', credentials),
  },

  // 用户/老师管理
  users: {
    create: (data: any) => apiService.users.create(data),
    list: (params?: any) => apiService.users.list(params),
    update: (id: string, data: any) => apiService.users.update(id, data),
    delete: (id: string) => apiService.users.delete(id),
  },

  // 平台管理专用
  platform: {
    getOverview: () => apiService.platform.getOverview(),
    listCampuses: () => apiService.platform.listCampuses(),
    updateStatus: (schoolId: string, isActive: boolean) =>
      apiService.platform.updateStatus(schoolId, isActive),
    updateExpiry: (schoolId: string, expiredAt: string) =>
      apiService.platform.updateExpiry(schoolId, expiredAt),
    createCampus: (data: { name: string; adminUsername: string; adminName: string; planType?: string }) =>
      apiService.post('/platform/campuses', data),
    globalSearch: (query: string, type: 'student' | 'teacher' = 'student', limit: number = 20) =>
      apiService.get(`/platform/search?q=${encodeURIComponent(query)}&type=${type}&limit=${limit}`),
  }
};

console.log('[AUTH FIX] API Service loaded with interceptors and authentication support');

export default apiService;