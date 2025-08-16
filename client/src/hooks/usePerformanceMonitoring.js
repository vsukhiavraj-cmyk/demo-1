import { useEffect, useCallback, useRef } from 'react'
import { useAppStore } from '../store/appStore'
import performanceOptimizer from '../utils/PerformanceOptimizer'
import LocalFileManager from '../utils/LocalFileManager'

/**
 * Custom hook for performance monitoring and optimization
 * Integrates with the multi-goal architecture to monitor:
 * - Goal switching performance
 * - Data refetch efficiency
 * - Memory usage
 * - File storage optimization
 */
export const usePerformanceMonitoring = () => {
  const { activeGoalId, goals } = useAppStore()
  const previousGoalId = useRef(activeGoalId)
  const goalSwitchStartTime = useRef(null)
  const performanceData = useRef({
    goalSwitches: [],
    dataRefetches: [],
    memorySnapshots: []
  })

  // Monitor goal switching performance
  useEffect(() => {
    if (previousGoalId.current !== activeGoalId && activeGoalId) {
      // Goal switch detected
      if (goalSwitchStartTime.current) {
        const switchDuration = performance.now() - goalSwitchStartTime.current
        
        performanceOptimizer.recordMetric('goal-switch-complete', {
          fromGoalId: previousGoalId.current,
          toGoalId: activeGoalId,
          duration: switchDuration,
          timestamp: Date.now()
        })

        performanceData.current.goalSwitches.push({
          fromGoalId: previousGoalId.current,
          toGoalId: activeGoalId,
          duration: switchDuration,
          timestamp: Date.now()
        })

        // Log slow switches
        if (switchDuration > 1000) {
          console.warn(`⚠️ Slow goal switch: ${switchDuration.toFixed(2)}ms from ${previousGoalId.current} to ${activeGoalId}`)
        }
      }

      previousGoalId.current = activeGoalId
      goalSwitchStartTime.current = null
    }
  }, [activeGoalId])

  // Optimized goal switching function
  const optimizedGoalSwitch = useCallback(async (goalId, dataRefetchCallback) => {
    goalSwitchStartTime.current = performance.now()
    
    return performanceOptimizer.measureGoalSwitch(goalId, async () => {
      // Use performance optimizer's caching mechanism
      const goalOptimizer = performanceOptimizer.optimizeGoalSwitching()
      const cachedData = goalOptimizer.getCachedGoalData(goalId)
      
      if (cachedData) {
        console.log(`📋 Using cached data for goal ${goalId}`)
        return cachedData
      }

      // Fetch fresh data
      const result = await dataRefetchCallback()
      
      // Cache the result
      goalOptimizer.setCachedGoalData(goalId, result)
      
      return result
    })
  }, [])

  // Optimized data refetch function
  const optimizedDataRefetch = useCallback(async (endpoint, fetchCallback) => {
    return performanceOptimizer.measureDataRefetch(endpoint, async () => {
      const dataOptimizer = performanceOptimizer.optimizeDataRefetch()
      
      // Use debounced refetch to prevent rapid successive calls
      return new Promise((resolve) => {
        dataOptimizer.debouncedRefetch(
          `${endpoint}-${activeGoalId}`,
          async () => {
            try {
              const result = await fetchCallback()
              resolve(result)
            } catch (error) {
              console.error(`Data refetch failed for ${endpoint}:`, error)
              resolve(null)
            }
          },
          300 // 300ms debounce
        )
      })
    })
  }, [activeGoalId])

  // Memory monitoring
  const monitorMemoryUsage = useCallback(() => {
    const memoryMonitor = performanceOptimizer.monitorMemoryUsage()
    const usage = memoryMonitor.checkMemoryUsage()
    
    if (usage) {
      performanceData.current.memorySnapshots.push({
        ...usage,
        goalCount: goals.length,
        activeGoalId,
        timestamp: Date.now()
      })

      // Trigger cleanup if memory usage is high
      if (usage.status === 'critical') {
        console.warn('🚨 Critical memory usage detected, triggering cleanup...')
        performanceOptimizer.triggerMemoryCleanup()
        
        // Also cleanup old files
        LocalFileManager.cleanupOldFiles({ maxAge: 7 }) // More aggressive cleanup
      } else if (usage.status === 'warning') {
        console.warn('⚠️ High memory usage detected')
        LocalFileManager.cleanupOldFiles() // Standard cleanup
      }
    }

    return usage
  }, [goals.length, activeGoalId])

  // File storage optimization
  const optimizeFileStorage = useCallback(async () => {
    try {
      // Get current user from store
      const user = useAppStore.getState().user
      if (!user) return null

      // Run storage analysis
      const analysis = LocalFileManager.getStorageAnalysis(user._id)
      
      // Run optimization if needed
      let optimizationResult = null
      if (analysis.totalSize > 2 * 1024 * 1024) { // > 2MB
        optimizationResult = LocalFileManager.optimizeStorage(user._id)
      }

      // Run cleanup if needed
      let cleanupResult = null
      if (analysis.filesByAge.older > 0) {
        cleanupResult = LocalFileManager.cleanupOldFiles({
          userId: user._id,
          maxAge: 30,
          maxFiles: 50
        })
      }

      return {
        analysis,
        optimization: optimizationResult,
        cleanup: cleanupResult
      }
    } catch (error) {
      console.error('File storage optimization failed:', error)
      return null
    }
  }, [])

  // Performance report generation
  const generatePerformanceReport = useCallback(() => {
    const baseReport = performanceOptimizer.getPerformanceReport()
    const memoryMonitor = performanceOptimizer.monitorMemoryUsage()
    const memoryReport = memoryMonitor.getMemoryReport()

    return {
      ...baseReport,
      goalSwitching: {
        totalSwitches: performanceData.current.goalSwitches.length,
        averageSwitchTime: performanceData.current.goalSwitches.length > 0 ?
          performanceData.current.goalSwitches.reduce((sum, s) => sum + s.duration, 0) / performanceData.current.goalSwitches.length : 0,
        slowSwitches: performanceData.current.goalSwitches.filter(s => s.duration > 1000).length,
        recentSwitches: performanceData.current.goalSwitches.slice(-10)
      },
      memory: memoryReport,
      recommendations: generatePerformanceRecommendations()
    }
  }, [])

  // Generate performance recommendations
  const generatePerformanceRecommendations = useCallback(() => {
    const recommendations = []
    
    // Goal switching recommendations
    const slowSwitches = performanceData.current.goalSwitches.filter(s => s.duration > 1000)
    if (slowSwitches.length > 0) {
      recommendations.push({
        type: 'performance',
        category: 'goal-switching',
        message: `${slowSwitches.length} slow goal switches detected. Consider reducing data complexity or implementing better caching.`,
        priority: 'medium',
        action: 'optimize-goal-switching'
      })
    }

    // Memory recommendations
    const memoryMonitor = performanceOptimizer.monitorMemoryUsage()
    const memoryUsage = memoryMonitor.checkMemoryUsage()
    if (memoryUsage && memoryUsage.status !== 'normal') {
      recommendations.push({
        type: 'memory',
        category: 'memory-usage',
        message: `Memory usage is ${memoryUsage.status}. Consider clearing browser cache or reducing concurrent operations.`,
        priority: memoryUsage.status === 'critical' ? 'high' : 'medium',
        action: 'cleanup-memory'
      })
    }

    // File storage recommendations
    const user = useAppStore.getState().user
    if (user) {
      const storageStats = LocalFileManager.getStorageStats()
      if (storageStats.totalSize > 3 * 1024 * 1024) { // > 3MB
        recommendations.push({
          type: 'storage',
          category: 'file-storage',
          message: `File storage usage is high (${storageStats.formattedSize}). Consider cleaning up old files.`,
          priority: 'medium',
          action: 'cleanup-files'
        })
      }
    }

    return recommendations
  }, [])

  // Cleanup function
  const cleanup = useCallback(() => {
    performanceOptimizer.triggerMemoryCleanup()
    
    const user = useAppStore.getState().user
    if (user) {
      LocalFileManager.cleanupOldFiles({ userId: user._id })
    }
  }, [])

  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear any pending operations
      const dataOptimizer = performanceOptimizer.optimizeDataRefetch()
      dataOptimizer.cancelPendingRequests()
    }
  }, [])

  // Periodic memory monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      monitorMemoryUsage()
    }, 30000) // Every 30 seconds

    return () => clearInterval(interval)
  }, [monitorMemoryUsage])

  return {
    // Optimized functions
    optimizedGoalSwitch,
    optimizedDataRefetch,
    
    // Monitoring functions
    monitorMemoryUsage,
    optimizeFileStorage,
    
    // Reporting functions
    generatePerformanceReport,
    generatePerformanceRecommendations,
    
    // Utility functions
    cleanup,
    
    // Performance data
    performanceData: performanceData.current,
    
    // Current metrics
    currentMemoryUsage: monitorMemoryUsage(),
    goalSwitchCount: performanceData.current.goalSwitches.length
  }
}

export default usePerformanceMonitoring