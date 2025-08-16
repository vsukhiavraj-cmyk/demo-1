/**
 * Performance Optimizer for Multi-Goal Architecture
 * 
 * This utility provides performance monitoring and optimization features
 * for goal switching, data refetch efficiency, and memory management.
 */

class PerformanceOptimizer {
  constructor() {
    this.metrics = new Map()
    this.observers = new Map()
    this.isMonitoring = false
    this.performanceBuffer = []
    this.maxBufferSize = 100
  }

  /**
   * Start performance monitoring
   */
  startMonitoring() {
    if (this.isMonitoring) return

    this.isMonitoring = true
    this.setupPerformanceObserver()
    this.startMemoryMonitoring()
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring() {
    this.isMonitoring = false
    this.observers.forEach(observer => observer.disconnect())
    this.observers.clear()
  }

  /**
   * Setup Performance Observer for critical user flows
   */
  setupPerformanceObserver() {
    if (!window.PerformanceObserver) return

    try {
      // Monitor navigation timing
      const navObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          this.recordMetric('navigation', {
            type: entry.type,
            duration: entry.duration,
            startTime: entry.startTime,
            timestamp: Date.now()
          })
        })
      })
      navObserver.observe({ entryTypes: ['navigation'] })
      this.observers.set('navigation', navObserver)

      // Monitor resource loading
      const resourceObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          if (entry.name.includes('/api/')) {
            this.recordMetric('api-call', {
              url: entry.name,
              duration: entry.duration,
              transferSize: entry.transferSize,
              timestamp: Date.now()
            })
          }
        })
      })
      resourceObserver.observe({ entryTypes: ['resource'] })
      this.observers.set('resource', resourceObserver)

      // Monitor user interactions
      const measureObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach(entry => {
          this.recordMetric('user-timing', {
            name: entry.name,
            duration: entry.duration,
            startTime: entry.startTime,
            timestamp: Date.now()
          })
        })
      })
      measureObserver.observe({ entryTypes: ['measure'] })
      this.observers.set('measure', measureObserver)

    } catch (error) {
      console.warn('Performance Observer setup failed:', error)
    }
  }

  /**
   * Start memory usage monitoring
   */
  startMemoryMonitoring() {
    if (!performance.memory) return

    const monitorMemory = () => {
      if (!this.isMonitoring) return

      const memoryInfo = {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        timestamp: Date.now()
      }

      this.recordMetric('memory', memoryInfo)

      // Check for memory leaks
      if (memoryInfo.usedJSHeapSize > memoryInfo.jsHeapSizeLimit * 0.8) {
        console.warn('⚠️ High memory usage detected:', memoryInfo)
        this.triggerMemoryCleanup()
      }

      setTimeout(monitorMemory, 5000) // Check every 5 seconds
    }

    monitorMemory()
  }

  /**
   * Record performance metric
   */
  recordMetric(type, data) {
    if (!this.metrics.has(type)) {
      this.metrics.set(type, [])
    }

    const metrics = this.metrics.get(type)
    metrics.push(data)

    // Keep buffer size manageable
    if (metrics.length > this.maxBufferSize) {
      metrics.shift()
    }

    // Add to performance buffer for analysis
    this.performanceBuffer.push({ type, data, timestamp: Date.now() })
    if (this.performanceBuffer.length > this.maxBufferSize) {
      this.performanceBuffer.shift()
    }
  }

  /**
   * Measure goal switching performance
   */
  measureGoalSwitch(goalId, callback) {
    const startTime = performance.now()
    const startMemory = performance.memory ? performance.memory.usedJSHeapSize : 0

    performance.mark('goal-switch-start')

    return Promise.resolve(callback()).then(result => {
      const endTime = performance.now()
      const endMemory = performance.memory ? performance.memory.usedJSHeapSize : 0
      const duration = endTime - startTime

      performance.mark('goal-switch-end')
      performance.measure('goal-switch', 'goal-switch-start', 'goal-switch-end')

      this.recordMetric('goal-switch', {
        goalId,
        duration,
        memoryDelta: endMemory - startMemory,
        timestamp: Date.now()
      })

      // Log slow goal switches
      if (duration > 1000) {
        console.warn(`⚠️ Slow goal switch detected: ${duration}ms for goal ${goalId}`)
      }

      return result
    })
  }

  /**
   * Measure data refetch performance
   */
  measureDataRefetch(endpoint, callback) {
    const startTime = performance.now()
    performance.mark(`refetch-${endpoint}-start`)

    return Promise.resolve(callback()).then(result => {
      const endTime = performance.now()
      const duration = endTime - startTime

      performance.mark(`refetch-${endpoint}-end`)
      performance.measure(`refetch-${endpoint}`, `refetch-${endpoint}-start`, `refetch-${endpoint}-end`)

      this.recordMetric('data-refetch', {
        endpoint,
        duration,
        dataSize: JSON.stringify(result).length,
        timestamp: Date.now()
      })

      return result
    })
  }

  /**
   * Optimize goal switching by implementing smart caching
   */
  optimizeGoalSwitching() {
    // Implement goal data caching
    const goalCache = new Map()
    const cacheTimeout = 5 * 60 * 1000 // 5 minutes

    return {
      getCachedGoalData: (goalId) => {
        const cached = goalCache.get(goalId)
        if (cached && Date.now() - cached.timestamp < cacheTimeout) {
          return cached.data
        }
        return null
      },

      setCachedGoalData: (goalId, data) => {
        goalCache.set(goalId, {
          data,
          timestamp: Date.now()
        })
      },

      clearGoalCache: (goalId) => {
        if (goalId) {
          goalCache.delete(goalId)
        } else {
          goalCache.clear()
        }
      },

      getCacheStats: () => ({
        size: goalCache.size,
        keys: Array.from(goalCache.keys())
      })
    }
  }

  /**
   * Implement efficient data refetch strategies
   */
  optimizeDataRefetch() {
    const pendingRequests = new Map()
    const requestQueue = []
    const maxConcurrentRequests = 3

    return {
      // Debounce rapid successive requests
      debouncedRefetch: (key, callback, delay = 300) => {
        if (pendingRequests.has(key)) {
          clearTimeout(pendingRequests.get(key))
        }

        const timeoutId = setTimeout(() => {
          pendingRequests.delete(key)
          callback()
        }, delay)

        pendingRequests.set(key, timeoutId)
      },

      // Batch multiple requests
      batchRequests: (requests) => {
        const batches = []
        for (let i = 0; i < requests.length; i += maxConcurrentRequests) {
          batches.push(requests.slice(i, i + maxConcurrentRequests))
        }

        return batches.reduce((promise, batch) => {
          return promise.then(results => {
            return Promise.all(batch).then(batchResults => {
              return [...results, ...batchResults]
            })
          })
        }, Promise.resolve([]))
      },

      // Cancel pending requests when switching goals
      cancelPendingRequests: () => {
        pendingRequests.forEach(timeoutId => clearTimeout(timeoutId))
        pendingRequests.clear()
      }
    }
  }

  /**
   * Monitor memory usage with multiple goals and large datasets
   */
  monitorMemoryUsage() {
    const memoryThresholds = {
      warning: 50 * 1024 * 1024,  // 50MB
      critical: 100 * 1024 * 1024  // 100MB
    }

    return {
      checkMemoryUsage: () => {
        if (!performance.memory) return null

        const usage = performance.memory.usedJSHeapSize
        const limit = performance.memory.jsHeapSizeLimit
        const percentage = (usage / limit) * 100

        return {
          used: usage,
          limit,
          percentage,
          status: usage > memoryThresholds.critical ? 'critical' :
                  usage > memoryThresholds.warning ? 'warning' : 'normal'
        }
      },

      getMemoryReport: () => {
        const metrics = this.metrics.get('memory') || []
        const recent = metrics.slice(-10) // Last 10 measurements

        return {
          current: recent[recent.length - 1],
          average: recent.reduce((sum, m) => sum + m.usedJSHeapSize, 0) / recent.length,
          peak: Math.max(...recent.map(m => m.usedJSHeapSize)),
          trend: recent.length > 1 ? 
            recent[recent.length - 1].usedJSHeapSize - recent[0].usedJSHeapSize : 0
        }
      }
    }
  }

  /**
   * Trigger memory cleanup
   */
  triggerMemoryCleanup() {
    // Clear old performance metrics
    this.metrics.forEach((metrics, type) => {
      if (metrics.length > 50) {
        this.metrics.set(type, metrics.slice(-25))
      }
    })

    // Clear performance buffer
    if (this.performanceBuffer.length > 50) {
      this.performanceBuffer = this.performanceBuffer.slice(-25)
    }

    // Trigger garbage collection if available
    if (window.gc) {
      window.gc()
    }

    // Dispatch cleanup event for other components
    window.dispatchEvent(new CustomEvent('performance-cleanup', {
      detail: { timestamp: Date.now() }
    }))
  }

  /**
   * Get performance report
   */
  getPerformanceReport() {
    const report = {
      timestamp: Date.now(),
      monitoring: this.isMonitoring,
      metrics: {},
      summary: {}
    }

    // Compile metrics summary
    this.metrics.forEach((data, type) => {
      if (data.length === 0) return

      const durations = data.map(d => d.duration).filter(d => d !== undefined)
      
      report.metrics[type] = {
        count: data.length,
        latest: data[data.length - 1],
        average: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
        min: durations.length > 0 ? Math.min(...durations) : 0,
        max: durations.length > 0 ? Math.max(...durations) : 0
      }
    })

    // Performance summary
    const goalSwitches = this.metrics.get('goal-switch') || []
    const apiCalls = this.metrics.get('api-call') || []
    const memoryMetrics = this.metrics.get('memory') || []

    report.summary = {
      goalSwitches: {
        count: goalSwitches.length,
        averageTime: goalSwitches.length > 0 ? 
          goalSwitches.reduce((sum, gs) => sum + gs.duration, 0) / goalSwitches.length : 0,
        slowSwitches: goalSwitches.filter(gs => gs.duration > 1000).length
      },
      apiPerformance: {
        count: apiCalls.length,
        averageTime: apiCalls.length > 0 ?
          apiCalls.reduce((sum, api) => sum + api.duration, 0) / apiCalls.length : 0,
        slowCalls: apiCalls.filter(api => api.duration > 2000).length
      },
      memoryUsage: memoryMetrics.length > 0 ? {
        current: memoryMetrics[memoryMetrics.length - 1].usedJSHeapSize,
        peak: Math.max(...memoryMetrics.map(m => m.usedJSHeapSize)),
        average: memoryMetrics.reduce((sum, m) => sum + m.usedJSHeapSize, 0) / memoryMetrics.length
      } : null
    }

    return report
  }

  /**
   * Export performance data for analysis
   */
  exportPerformanceData() {
    const data = {
      timestamp: Date.now(),
      metrics: Object.fromEntries(this.metrics),
      buffer: this.performanceBuffer,
      report: this.getPerformanceReport()
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `performance-data-${new Date().toISOString().slice(0, 19)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }
}

// Create singleton instance
const performanceOptimizer = new PerformanceOptimizer()

// Auto-start monitoring in development
if (process.env.NODE_ENV === 'development') {
  performanceOptimizer.startMonitoring()
}

export default performanceOptimizer